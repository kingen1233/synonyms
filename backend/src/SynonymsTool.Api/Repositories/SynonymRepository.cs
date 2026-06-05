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
        TransitiveSynonym[] TransitiveSynonymsList
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
    public (IReadOnlyList<Word> DirectSynonyms, IReadOnlyList<TransitiveSynonym> TransitiveSynonyms) GetSynonyms(
        Word word
    )
    {
        var key = word.Key;
        var snapshot = Volatile.Read(ref _snapshot);

        return snapshot.TryGetValue(key, out var entry)
            ? (entry.DirectSynonymsDisplayWords, entry.TransitiveSynonymsList)
            : ([], []);
    }

    /// <inheritdoc/>
    public IReadOnlyList<Word> SearchWords(string term)
    {
        var normalizedTerm = WordKey.From(term).Value;
        var snapshot = Volatile.Read(ref _snapshot);

        return snapshot
            .Where(kv => kv.Key.Value.Contains(normalizedTerm, StringComparison.OrdinalIgnoreCase))
            .Select(kv => kv.Value.Word)
            .OrderBy(w => w.Display, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    /// <inheritdoc/>
    public IReadOnlyList<Word> GetAllWords() => SearchWords(string.Empty);

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

            RebuildSnapshot([keyA, keyB]);
            return true;
        }
    }

    /// <inheritdoc/>
    public bool DeleteWord(Word word)
    {
        var deletedKey = word.Key;

        lock (_writeLock)
        {
            if (!_graph.TryGetValue(deletedKey, out var deletedNode))
                return false;

            var synonymsToDeletedWord = deletedNode.DirectSynonyms.ToList();

            // Remove the word from its direct synonyms' lists, then remove it from the graph.
            foreach (var synonym in synonymsToDeletedWord)
            {
                if (_graph.TryGetValue(synonym, out var synonymNode))
                    synonymNode.DirectSynonyms.Remove(deletedKey);
            }

            _graph.Remove(deletedKey);

            // Rebuild the snapshot entries for all the deleted word's direct synonyms
            RebuildSnapshot(synonymsToDeletedWord, [deletedKey]);
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
        IReadOnlyCollection<WordKey>? removedKeys = null
    )
    {
        var nextSnapshot = new Dictionary<WordKey, SnapshotEntry>(Volatile.Read(ref _snapshot));

        if (removedKeys is not null)
            foreach (var removedKey in removedKeys)
                nextSnapshot.Remove(removedKey);

        var clusters = SynonymGraphUtils.FindClusters(DirectSynonymsOf, startWords);
        foreach (var cluster in clusters)
        {
            foreach (var wordKey in cluster)
            {
                nextSnapshot[wordKey] = BuildSnapshotEntry(wordKey, cluster);
            }
        }

        Volatile.Write(ref _snapshot, nextSnapshot);
    }

    /// <summary>
    /// Builds the read entry for one word: its direct synonyms, and each transitive synonym
    /// paired with the closest neighbour.
    /// </summary>
    private SnapshotEntry BuildSnapshotEntry(WordKey wordKey, HashSet<WordKey> cluster)
    {
        var node = _graph[wordKey];

        var directDisplayWords = node
            .DirectSynonyms.Select(WordOf)
            .OrderBy(w => w.Display, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        // BFS parent map: lets us walk back from any transitive target to find the first
        // hop out of wordKey (the closest neighbour), without storing full paths.
        var transitiveMap = SynonymGraphUtils.GenerateTransitiveMap(DirectSynonymsOf, wordKey);

        var transitiveList = cluster
            .Where(w => w != wordKey && !node.DirectSynonyms.Contains(w))
            .Select(targetKey =>
            {
                // Traverse the map until the parent is wordKey, which means we've found the closest neighbour.
                var closestNeighbour = targetKey;
                while (transitiveMap[closestNeighbour] != wordKey)
                {
                    closestNeighbour = transitiveMap[closestNeighbour];
                }

                return new TransitiveSynonym(WordOf(targetKey), WordOf(closestNeighbour));
            })
            .OrderBy(ts => ts.Word.Display, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return new SnapshotEntry(node.Word, directDisplayWords, transitiveList);
    }

    private Word WordOf(WordKey wordKey) => _graph[wordKey].Word;

    private IReadOnlyCollection<WordKey>? DirectSynonymsOf(WordKey wordKey) =>
        _graph.TryGetValue(wordKey, out var node) ? node.DirectSynonyms : null;
}
