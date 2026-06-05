using SynonymsTool.Api.Domain;
using SynonymsTool.Api.Repositories;

namespace SynonymsTool.Tests.Repositories;

/// <summary>
/// Unit tests for all repository operations.
/// </summary>
public class SynonymRepositoryTests
{
    private readonly SynonymRepository _repo = new();

    private static Word Word(string raw) => Api.Domain.Word.From(raw);

    /// <summary>Convenience: the display strings of a word's direct synonyms.</summary>
    private string[] GetDirectSynonyms(string word) =>
        _repo.GetSynonyms(Word(word)).DirectSynonyms.Select(x => x.Display).ToArray();

    /// <summary>Convenience: the display strings of a word's transitive synonyms.</summary>
    private string[] GetTransitiveSynonyms(string word) =>
        _repo.GetSynonyms(Word(word)).TransitiveSynonyms.Select(x => x.Display).ToArray();

    [Fact]
    public void AddSynonym_LookupWorksInBothDirections()
    {
        _repo.AddSynonym(Word("clean"), Word("wash"));

        Assert.Equal(["wash"], GetDirectSynonyms("clean"));
        Assert.Equal(["clean"], GetDirectSynonyms("wash"));
    }

    [Fact]
    public void AddSynonym_IsCaseInsensitive_ButKeepsDisplayCasing()
    {
        _repo.AddSynonym(Word("Clean"), Word("Wash"));

        // Lookup by any casing resolves; the stored display casing is returned.
        Assert.Equal(["Wash"], GetDirectSynonyms("clean"));
        Assert.True(_repo.WordExists(Word("CLEAN")));
    }

    [Fact]
    public void AddSynonym_MultipleSynonyms_AllReturned()
    {
        _repo.AddSynonym(Word("big"), Word("large"));
        _repo.AddSynonym(Word("big"), Word("huge"));

        Assert.Equal(["huge", "large"], GetDirectSynonyms("big")); // sorted
    }

    [Fact]
    public void AddSynonym_SameWord_IsNoOp()
    {
        _repo.AddSynonym(Word("word"), Word("word"));

        Assert.False(_repo.WordExists(Word("word")));
    }

    [Fact]
    public void TransitiveRule_AEqualsB_BEqualsC_ThenAGetsC()
    {
        _repo.AddSynonym(Word("a"), Word("b"));
        _repo.AddSynonym(Word("b"), Word("c"));

        // a's direct synonym is b; c is reachable only transitively.
        Assert.Equal(["b"], GetDirectSynonyms("a"));
        Assert.Equal(["c"], GetTransitiveSynonyms("a"));
        // and symmetrically for c
        Assert.Equal(["b"], GetDirectSynonyms("c"));
        Assert.Equal(["a"], GetTransitiveSynonyms("c"));
    }

    [Fact]
    public void GetSynonyms_UnknownWord_ReturnsEmpty()
    {
        var (direct, transitive) = _repo.GetSynonyms(Word("ghost"));

        Assert.Empty(direct);
        Assert.Empty(transitive);
    }

    [Fact]
    public void SearchWords_ReturnsOnlyPrefixMatches_CaseInsensitive()
    {
        _repo.AddSynonym(Word("apple"), Word("apricot"));
        _repo.AddSynonym(Word("banana"), Word("berry"));

        var matches = _repo.SearchWords("AP").Select(w => w.Display).ToArray();

        Assert.Equal(["apple", "apricot"], matches);
    }

    [Fact]
    public void DeleteLink_DisconnectsCluster_IntoTwo()
    {
        // a—b—c, removing b—c splits into {a,b} and {c} (c remains as a solo node).
        _repo.AddSynonym(Word("a"), Word("b"));
        _repo.AddSynonym(Word("b"), Word("c"));

        var removed = _repo.DeleteLink(Word("b"), Word("c"));

        Assert.True(removed);
        Assert.Equal(["b"], GetDirectSynonyms("a"));
        Assert.Empty(GetTransitiveSynonyms("a")); // c no longer reachable
        Assert.True(_repo.WordExists(Word("c"))); // disconnected word stays as a solo node
        Assert.Empty(GetDirectSynonyms("c"));
    }

    [Fact]
    public void DeleteLink_KeepsClusterIntact_WhenStillReachable()
    {
        // Triangle a-b-c: removing a-c leaves c reachable via b.
        _repo.AddSynonym(Word("a"), Word("b"));
        _repo.AddSynonym(Word("b"), Word("c"));
        _repo.AddSynonym(Word("a"), Word("c"));

        _repo.DeleteLink(Word("a"), Word("c"));

        Assert.Equal(["b"], GetDirectSynonyms("a"));
        Assert.Equal(["c"], GetTransitiveSynonyms("a")); // still reachable through b
    }

    [Fact]
    public void DeleteLink_NonExistent_ReturnsFalse()
    {
        Assert.False(_repo.DeleteLink(Word("x"), Word("y")));
    }

    [Fact]
    public void DeleteWord_RemovesWordAndItsLinks()
    {
        _repo.AddSynonym(Word("a"), Word("b"));
        _repo.AddSynonym(Word("a"), Word("c"));

        var removed = _repo.DeleteWord(Word("a"));

        Assert.True(removed);
        Assert.False(_repo.WordExists(Word("a")));

        // b and c were only connected through a → they remain as solo nodes.
        Assert.True(_repo.WordExists(Word("b")));
        Assert.True(_repo.WordExists(Word("c")));
        Assert.Empty(GetDirectSynonyms("b"));
        Assert.Empty(GetDirectSynonyms("c"));
    }

    [Fact]
    public void DeleteWord_NonExistent_ReturnsFalse()
    {
        Assert.False(_repo.DeleteWord(Word("ghost")));
    }

    [Fact]
    public void RenameWord_PropagatesToSynonyms()
    {
        _repo.AddSynonym(Word("car"), Word("auto"));

        var renamed = _repo.RenameWord(Word("car"), Word("vehicle"));

        Assert.True(renamed);
        Assert.False(_repo.WordExists(Word("car")));
        Assert.True(_repo.WordExists(Word("vehicle")));
        Assert.Equal(["vehicle"], GetDirectSynonyms("auto"));
        Assert.Equal(["auto"], GetDirectSynonyms("vehicle"));
    }

    [Fact]
    public void RenameWord_OnlyCasingChange_UpdatesDisplay()
    {
        _repo.AddSynonym(Word("paper"), Word("sheet"));

        var renamed = _repo.RenameWord(Word("paper"), Word("Paper"));

        Assert.True(renamed);
        Assert.Equal(["Paper"], GetDirectSynonyms("sheet"));
    }

    [Fact]
    public void RenameWord_Missing_ReturnsFalse()
    {
        Assert.False(_repo.RenameWord(Word("ghost"), Word("phantom")));
    }

    [Fact]
    public void RenameWord_OntoExistingWord_ThrowsConflict()
    {
        _repo.AddSynonym(Word("a"), Word("b"));
        _repo.AddSynonym(Word("c"), Word("d"));

        Assert.Throws<ConflictException>(() => _repo.RenameWord(Word("a"), Word("c")));
    }

    [Fact]
    public async Task ConcurrentWritesAndReads_RemainConsistent()
    {
        // Smoke test: many concurrent writers + readers must not corrupt state or throw.
        const int pairs = 500;

        var writers = Enumerable.Range(0, pairs).Select(i => Task.Run(() =>
            _repo.AddSynonym(Word($"left{i}"), Word($"right{i}"))));

        var readers = Enumerable.Range(0, pairs).Select(i => Task.Run(() =>
        {
            _ = _repo.GetSynonyms(Word($"left{i}"));
            _ = _repo.SearchWords("lef");
        }));

        await Task.WhenAll(writers.Concat(readers));

        // Every pair must be linked once all writes have completed.
        for (var i = 0; i < pairs; i++)
        {
            Assert.Equal([$"right{i}"], GetDirectSynonyms($"left{i}"));
        }
    }
}
