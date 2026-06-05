using SynonymsTool.Api.Domain;

namespace SynonymsTool.Api.Utils;

/// <summary>
/// Stateless breadth-first traversal over a synonym graph. The graph is supplied as a
/// neighbour-lookup delegate so callers keep their own node representation; the delegate
/// returns <c>null</c> for a word that isn't in the graph.
/// </summary>
public static class SynonymGraphUtils
{
    /// <summary>
    /// Walks outward from <paramref name="startWord"/> following synonym links, returning the
    /// whole synonym cluster — every word key reachable directly or transitively.
    /// Pass a shared <paramref name="visitedWords"/> set when calling this in a loop so words
    /// already placed in an earlier cluster aren't visited again.
    /// </summary>
    public static HashSet<WordKey> FindCluster(
        Func<WordKey, IReadOnlyCollection<WordKey>?> directSynonymsOf,
        WordKey startWord,
        HashSet<WordKey> visitedWords
    )
    {
        var cluster = new HashSet<WordKey>();

        // No synonyms added for the word
        if (directSynonymsOf(startWord) is null)
            return cluster;

        var toVisit = new Queue<WordKey>();
        toVisit.Enqueue(startWord);
        visitedWords.Add(startWord);

        while (toVisit.Count > 0)
        {
            var currentWord = toVisit.Dequeue();
            cluster.Add(currentWord);

            var synonyms = directSynonymsOf(currentWord);
            if (synonyms is null)
                continue;

            foreach (var synonymKey in synonyms)
            {
                if (visitedWords.Add(synonymKey)) // returns false when already seen
                    toVisit.Enqueue(synonymKey);
            }
        }

        return cluster;
    }

    /// <summary>
    /// Finds every distinct synonym cluster reachable from <paramref name="startWords"/> in one pass.
    /// If two start words already belong to the same cluster, it's only returned once.
    /// </summary>
    public static List<HashSet<WordKey>> FindClusters(
        Func<WordKey, IReadOnlyCollection<WordKey>?> directSynonymsOf,
        IEnumerable<WordKey> startWords
    )
    {
        var visitedWords = new HashSet<WordKey>();
        var clusters = new List<HashSet<WordKey>>();

        foreach (var startWord in startWords)
        {
            // Cluster already found, or not part of one
            if (visitedWords.Contains(startWord) || directSynonymsOf(startWord) is null)
                continue;

            clusters.Add(FindCluster(directSynonymsOf, startWord, visitedWords));
        }

        return clusters;
    }

    /// <summary>
    /// BFS from <paramref name="start"/>, returning a child→parent map for every reachable node.
    /// </summary>
    public static Dictionary<WordKey, WordKey> GenerateTransitiveMap(
        Func<WordKey, IReadOnlyCollection<WordKey>?> directSynonymsOf,
        WordKey start
    )
    {
        var transitiveMap = new Dictionary<WordKey, WordKey> { [start] = start };
        var toVisit = new Queue<WordKey>();
        toVisit.Enqueue(start);

        while (toVisit.Count > 0)
        {
            var currentWord = toVisit.Dequeue();
            var synonyms = directSynonymsOf(currentWord);
            if (synonyms is null)
                continue;

            foreach (var synonym in synonyms)
            {
                if (transitiveMap.TryAdd(synonym, currentWord))
                    toVisit.Enqueue(synonym);
            }
        }

        return transitiveMap;
    }
}
