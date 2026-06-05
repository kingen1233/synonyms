using SynonymsTool.Api.Domain;
using SynonymsTool.Api.Utils;

namespace SynonymsTool.Api.Repositories;

/// <summary>
/// In-memory synonym store. Uses a copy-on-write design so reads never block:
/// a fully-resolved read snapshot is replaced atomically on every write, so readers
/// only ever touch the immutable snapshot — never the mutable graph.
///
/// <c>_graph</c> is the source of truth: each word maps to a node holding its original
/// display casing and the keys of its directly-linked synonyms.
/// <c>_snapshot</c> is the read projection: each word maps to a precomputed entry whose
/// direct and transitive synonyms are already resolved to display casing and sorted.
///
/// All graph keys are <see cref="WordKey"/> — the normalized (trimmed, lower-case) form of a word.
/// </summary>
public class SynonymRepository : ISynonymRepository
{
    // A word in the graph: its original display casing plus the keys of its direct synonyms.
    private class Node
    {
        public required Word Word { get; set; }
        public HashSet<WordKey> DirectSynonyms { get; } = [];
    }

    // A precomputed read result for one word — direct and transitive synonyms, already
    // resolved to display casing and sorted. Reads return these straight from the snapshot.
    private record SnapshotEntry(
        Word Word,
        Word[] DirectSynonymsDisplayWords,
        Word[] TransitiveSynonymsDisplayWords
    );

    // Source of truth — the synonym graph. Mutated only under _writeLock.
    // No comparer needed: WordKey is normalized at construction, so its value equality is
    // already case-insensitive.
    private readonly Dictionary<WordKey, Node> _graph = [];

    // Copy-on-write read snapshot: word key → fully-resolved SnapshotEntry.
    // Swapped out atomically on every write. Not marked volatile — we use
    // Volatile.Read/Write directly to avoid CS0420.
    private Dictionary<WordKey, SnapshotEntry> _snapshot = [];

    private readonly Lock _writeLock = new();

    /// <inheritdoc/>
    public (IReadOnlyList<Word> DirectSynonyms, IReadOnlyList<Word> TransitiveSynonyms) GetSynonyms(
        Word word
    )
    {
        var key = word.Key;
        var snapshot = Volatile.Read(ref _snapshot);

        return snapshot.TryGetValue(key, out var entry)
            ? (entry.DirectSynonymsDisplayWords, entry.TransitiveSynonymsDisplayWords)
            : ([], []);
    }

    /// <inheritdoc/>
    public IReadOnlyList<Word> SearchWords(string prefix)
    {
        var normalizedPrefix = WordKey.From(prefix).Value;
        var snapshot = Volatile.Read(ref _snapshot);

        return snapshot
            .Where(kv => kv.Key.Value.StartsWith(normalizedPrefix, StringComparison.OrdinalIgnoreCase))
            .Select(kv => kv.Value.Word)
            .OrderBy(w => w.Display, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    /// <inheritdoc/>
    public bool WordExists(Word word) => Volatile.Read(ref _snapshot).ContainsKey(word.Key);

    /// <inheritdoc/>
    public void AddSynonym(Word wordA, Word wordB)
    {
        if (wordA.Key == wordB.Key)
            return;

        lock (_writeLock)
        {
            GetOrCreateNode(wordA).DirectSynonyms.Add(wordB.Key);
            GetOrCreateNode(wordB).DirectSynonyms.Add(wordA.Key);
            RebuildSnapshot([wordA.Key]);
        }
    }

    /// <inheritdoc/>
    public bool DeleteLink(Word wordA, Word wordB)
    {
        var keyA = wordA.Key;
        var keyB = wordB.Key;

        lock (_writeLock)
        {
            var removedA =
                _graph.TryGetValue(keyA, out var nodeA) && nodeA.DirectSynonyms.Remove(keyB);
            var removedB =
                _graph.TryGetValue(keyB, out var nodeB) && nodeB.DirectSynonyms.Remove(keyA);

            if (!removedA && !removedB)
                return false;

            // If either side is now completely disconnected, drop it from the graph.
            var removedWords = new List<WordKey>();
            if (nodeA is { DirectSynonyms.Count: 0 })
            {
                _graph.Remove(keyA);
                removedWords.Add(keyA);
            }

            if (nodeB is { DirectSynonyms.Count: 0 })
            {
                _graph.Remove(keyB);
                removedWords.Add(keyB);
            }

            // Re-traverse from both ends — if they're still reachable from each other
            // the cluster stays intact; if not, it splits into two separate clusters.
            RebuildSnapshot([keyA, keyB], removedWords);
            return true;
        }
    }

    /// <inheritdoc/>
    public bool DeleteWord(Word word)
    {
        var key = word.Key;

        lock (_writeLock)
        {
            if (!_graph.TryGetValue(key, out var node))
                return false;

            // Hold onto the direct synonyms now - once we remove the word they're our starting
            // points to figure out whether the cluster split.
            var startWords = node.DirectSynonyms.ToList();

            foreach (var synonym in startWords)
            {
                if (_graph.TryGetValue(synonym, out var synonymNode))
                {
                    synonymNode.DirectSynonyms.Remove(key);
                    if (synonymNode.DirectSynonyms.Count == 0)
                        _graph.Remove(synonym);
                }
            }

            _graph.Remove(key);

            var removedWords = new List<WordKey> { key };
            removedWords.AddRange(startWords.Where(s => !_graph.ContainsKey(s)));

            RebuildSnapshot(startWords, removedWords);
            return true;
        }
    }

    /// <inheritdoc/>
    public bool RenameWord(Word oldWord, Word newWord)
    {
        var oldKey = oldWord.Key;

        // Word already exists, but the display casing changed (e.g. "paper" → "Paper").
        if (oldKey == newWord.Key)
        {
            lock (_writeLock)
            {
                if (!_graph.TryGetValue(oldKey, out var node))
                    return false;
                node.Word = newWord;
                RebuildSnapshot([oldKey]);
            }

            return true;
        }

        lock (_writeLock)
        {
            if (!_graph.TryGetValue(oldKey, out var node))
                return false;

            if (_graph.ContainsKey(newWord.Key))
                throw new ConflictException(
                    $"Cannot rename '{oldWord}' to '{newWord}': the target word already exists."
                );

            // Update graph with new word
            node.Word = newWord;
            _graph[newWord.Key] = node;
            _graph.Remove(oldKey);

            // Go through all direct synonyms and update them to point at the new key
            foreach (var synonymKey in node.DirectSynonyms)
            {
                var synonymNode = _graph[synonymKey];
                synonymNode.DirectSynonyms.Remove(oldKey);
                synonymNode.DirectSynonyms.Add(newWord.Key);
            }

            RebuildSnapshot([newWord.Key], [oldKey]);
            return true;
        }
    }

    /// <summary>Returns the node for <paramref name="word"/>, creating it (with its display casing) if new.</summary>
    private Node GetOrCreateNode(Word word)
    {
        if (_graph.TryGetValue(word.Key, out var node))
            return node;

        node = new Node { Word = word };
        _graph[word.Key] = node;
        return node;
    }

    /// <summary>
    /// Rebuilds the snapshot entries for every word in the synonym clusters touched by this
    /// write, then swaps in the new snapshot atomically. Words in untouched clusters keep
    /// their existing entries.
    /// </summary>
    private void RebuildSnapshot(
        IEnumerable<WordKey> startWords,
        IReadOnlyCollection<WordKey>? removedWords = null
    )
    {
        var newSnapshot = new Dictionary<WordKey, SnapshotEntry>(Volatile.Read(ref _snapshot));

        if (removedWords is not null)
            foreach (var removed in removedWords)
                newSnapshot.Remove(removed);

        var clusters = SynonymGraphUtils.FindClusters(DirectSynonymsOf, startWords);
        foreach (var cluster in clusters)
        {
            foreach (var wordKey in cluster)
            {
                newSnapshot[wordKey] = BuildSnapshotEntry(wordKey, cluster);
            }
        }

        Volatile.Write(ref _snapshot, newSnapshot);
    }

    /// <summary>
    /// Builds the read entry for one word: its direct synonyms, and the rest of its
    /// cluster as transitive synonyms.
    /// </summary>
    private SnapshotEntry BuildSnapshotEntry(WordKey wordKey, HashSet<WordKey> cluster)
    {
        var node = _graph[wordKey];

        var directDisplayWords = node
            .DirectSynonyms.Select(WordOf)
            .OrderBy(w => w.Display, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var transitiveDisplayWords = cluster
            .Where(w => w != wordKey && !node.DirectSynonyms.Contains(w))
            .Select(WordOf)
            .OrderBy(w => w.Display, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return new SnapshotEntry(node.Word, directDisplayWords, transitiveDisplayWords);
    }

    private Word WordOf(WordKey wordKey) => _graph[wordKey].Word;

    private IReadOnlyCollection<WordKey>? DirectSynonymsOf(WordKey wordKey) =>
        _graph.TryGetValue(wordKey, out var node) ? node.DirectSynonyms : null;
}
