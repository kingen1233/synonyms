using SynonymsTool.Api.Domain;
using SynonymsTool.Api.Utils;

namespace SynonymsTool.Tests.Utils;

/// <summary>
/// Unit tests for the graph lookup.
/// </summary>
public class SynonymGraphUtilsTests
{
    private static WordKey Key(string value) => WordKey.From(value);

    /// <summary>Builds a neighbour-lookup delegate over a simple adjacency dictionary.</summary>
    private static Func<WordKey, IReadOnlyCollection<WordKey>?> GraphOf(
        Dictionary<WordKey, HashSet<WordKey>> adjacency
    ) => key => adjacency.TryGetValue(key, out var neighbours) ? neighbours : null;

    [Fact]
    public void FindCluster_UnknownWord_ReturnsEmpty()
    {
        var graph = GraphOf([]);

        var cluster = SynonymGraphUtils.FindCluster(graph, Key("ghost"), []);

        Assert.Empty(cluster);
    }

    [Fact]
    public void FindCluster_TransitiveChain_ReturnsWholeCluster()
    {
        // a—b—c: c is reachable from a only transitively.
        var a = Key("a");
        var b = Key("b");
        var c = Key("c");
        var adjacency = new Dictionary<WordKey, HashSet<WordKey>>
        {
            [a] = [b],
            [b] = [a, c],
            [c] = [b],
        };

        var cluster = SynonymGraphUtils.FindCluster(GraphOf(adjacency), a, []);

        Assert.Equal(new HashSet<WordKey> { a, b, c }, cluster);
    }

    [Fact]
    public void FindCluster_MarksVisited_SoSharedSetSkipsAlreadySeen()
    {
        var a = Key("a");
        var b = Key("b");
        var adjacency = new Dictionary<WordKey, HashSet<WordKey>>
        {
            [a] = [b],
            [b] = [a],
        };
        var visited = new HashSet<WordKey>();

        SynonymGraphUtils.FindCluster(GraphOf(adjacency), a, visited);

        Assert.Contains(a, visited);
        Assert.Contains(b, visited);
    }

    [Fact]
    public void FindClusters_TwoSeparateClusters_ReturnsBoth()
    {
        var a = Key("a");
        var b = Key("b");
        var x = Key("x");
        var y = Key("y");
        var adjacency = new Dictionary<WordKey, HashSet<WordKey>>
        {
            [a] = [b],
            [b] = [a],
            [x] = [y],
            [y] = [x],
        };

        var clusters = SynonymGraphUtils.FindClusters(GraphOf(adjacency), [a, x]);

        Assert.Equal(2, clusters.Count);
        Assert.Contains(clusters, c => c.SetEquals([a, b]));
        Assert.Contains(clusters, c => c.SetEquals([x, y]));
    }

    [Fact]
    public void FindClusters_StartWordsInSameCluster_ReturnedOnce()
    {
        var a = Key("a");
        var b = Key("b");
        var adjacency = new Dictionary<WordKey, HashSet<WordKey>>
        {
            [a] = [b],
            [b] = [a],
        };

        var clusters = SynonymGraphUtils.FindClusters(GraphOf(adjacency), [a, b]);

        Assert.Single(clusters);
    }

    [Fact]
    public void FindClusters_SkipsUnknownStartWords()
    {
        var a = Key("a");
        var b = Key("b");
        var adjacency = new Dictionary<WordKey, HashSet<WordKey>>
        {
            [a] = [b],
            [b] = [a],
        };

        var clusters = SynonymGraphUtils.FindClusters(GraphOf(adjacency), [Key("ghost"), a]);

        Assert.Single(clusters);
        Assert.True(clusters[0].SetEquals([a, b]));
    }
}
