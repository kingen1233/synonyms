using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using SynonymsTool.Api.Models.Requests;
using SynonymsTool.Api.Models.Responses;

namespace SynonymsTool.Tests.Integration;

/// <summary>
/// End-to-end tests that go through the real HTTP pipeline (routing, model validation,
/// the service + repository, and the global exception middleware).
///
/// A fresh <see cref="WebApplicationFactory{Program}"/> is created per test (xUnit news up
/// the class for every test method), so the singleton in-memory store starts empty each time.
/// </summary>
public sealed class SynonymsApiTests : IDisposable
{
    private const string BaseUrl = "/api/synonyms";

    private readonly WebApplicationFactory<Program> _factory = new();
    private readonly HttpClient _client;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public SynonymsApiTests() => _client = _factory.CreateClient();

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private Task<HttpResponseMessage> AddSynonym(string a, string b) =>
        _client.PostAsJsonAsync(BaseUrl, new AddSynonymRequest { WordA = a, WordB = b });

    private async Task<SynonymListResponse> GetSynonyms(string word)
    {
        var response = await _client.GetAsync($"{BaseUrl}/{word}");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<SynonymListResponse>(JsonOptions))!;
    }

    [Fact]
    public async Task AddSynonym_ThenLookup_WorksBothDirections()
    {
        Assert.Equal(HttpStatusCode.NoContent, (await AddSynonym("clean", "wash")).StatusCode);

        var clean = await GetSynonyms("clean");
        var wash = await GetSynonyms("wash");

        Assert.Equal(["wash"], clean.DirectSynonyms);
        Assert.Equal(["clean"], wash.DirectSynonyms);
    }

    [Fact]
    public async Task AddSynonym_TransitiveChain_ExposesTransitiveSynonyms()
    {
        await AddSynonym("a", "b");
        await AddSynonym("b", "c");

        var a = await GetSynonyms("a");

        Assert.Equal(["b"], a.DirectSynonyms);
        Assert.Equal(["c"], a.TransitiveSynonyms);
    }

    [Fact]
    public async Task AddSynonym_SameWord_Returns400()
    {
        var response = await AddSynonym("word", "word");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddSynonym_EmptyWord_Returns400_FromModelValidation()
    {
        var response = await AddSynonym("", "wash");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetSynonyms_UnknownWord_Returns404WithErrorBody()
    {
        var response = await _client.GetAsync($"{BaseUrl}/ghost");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErrorResponse>(JsonOptions);
        Assert.False(string.IsNullOrWhiteSpace(body!.Error));
    }

    [Fact]
    public async Task SearchWords_ReturnsPrefixMatches()
    {
        await AddSynonym("apple", "apricot");
        await AddSynonym("banana", "berry");

        var response = await _client.GetAsync($"{BaseUrl}/search?prefix=app");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<WordListResponse>(JsonOptions);

        Assert.Equal(["apple"], body!.Words);
    }

    [Fact]
    public async Task SearchWords_PrefixTooShort_Returns400()
    {
        var response = await _client.GetAsync($"{BaseUrl}/search?prefix=ap");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DeleteLink_RemovesRelationship()
    {
        await AddSynonym("a", "b");

        var delete = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"{BaseUrl}/link")
        {
            Content = JsonContent.Create(new DeleteLinkRequest { WordA = "a", WordB = "b" }),
        });

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Empty((await GetSynonyms("a")).DirectSynonyms);
    }

    [Fact]
    public async Task DeleteLink_NonExistent_Returns404()
    {
        var delete = await _client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"{BaseUrl}/link")
        {
            Content = JsonContent.Create(new DeleteLinkRequest { WordA = "x", WordB = "y" }),
        });

        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }

    [Fact]
    public async Task DeleteWord_RemovesWord()
    {
        await AddSynonym("a", "b");

        var delete = await _client.DeleteAsync($"{BaseUrl}/word/a");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        var lookup = await _client.GetAsync($"{BaseUrl}/a");
        Assert.Equal(HttpStatusCode.NotFound, lookup.StatusCode);
    }

    [Fact]
    public async Task DeleteWord_Unknown_Returns404()
    {
        var delete = await _client.DeleteAsync($"{BaseUrl}/word/ghost");

        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }

    [Fact]
    public async Task RenameWord_PropagatesToSynonyms()
    {
        await AddSynonym("car", "auto");

        var rename = await _client.PutAsJsonAsync($"{BaseUrl}/car", new RenameWordRequest { NewWord = "vehicle" });

        Assert.Equal(HttpStatusCode.NoContent, rename.StatusCode);
        Assert.Equal(["vehicle"], (await GetSynonyms("auto")).DirectSynonyms);
    }

    [Fact]
    public async Task RenameWord_Unknown_Returns404()
    {
        var rename = await _client.PutAsJsonAsync($"{BaseUrl}/ghost", new RenameWordRequest { NewWord = "phantom" });

        Assert.Equal(HttpStatusCode.NotFound, rename.StatusCode);
    }

    [Fact]
    public async Task RenameWord_OntoExistingWord_Returns409()
    {
        await AddSynonym("a", "b");
        await AddSynonym("c", "d");

        var rename = await _client.PutAsJsonAsync($"{BaseUrl}/a", new RenameWordRequest { NewWord = "c" });

        Assert.Equal(HttpStatusCode.Conflict, rename.StatusCode);
    }

    /// <summary>Mirrors the JSON error envelope produced by the global exception middleware.</summary>
    private sealed record ErrorResponse(string Error);
}
