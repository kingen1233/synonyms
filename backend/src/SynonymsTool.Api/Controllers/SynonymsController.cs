using Microsoft.AspNetCore.Mvc;
using SynonymsTool.Api.Models.Requests;
using SynonymsTool.Api.Models.Responses;
using SynonymsTool.Api.Services;

namespace SynonymsTool.Api.Controllers;

/// <summary>
/// REST endpoints for managing and querying the in-memory synonym graph.
/// Pure HTTP layer: it binds requests, delegates to <see cref="ISynonymService"/>, and shapes
/// the success response. Rule failures surface as exceptions and are turned into the right
/// status code by the global exception handler.
/// </summary>
[ApiController]
[Route("api/synonyms")]
[Produces("application/json")]
public sealed class SynonymsController(ISynonymService service) : ControllerBase
{
    /// <summary>Creates a bidirectional synonym link between two words.</summary>
    /// <response code="204">Link created (or already existed).</response>
    /// <response code="400">Validation failed (empty words, same word, exceeds 100 chars).</response>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult AddSynonym([FromBody] AddSynonymRequest request)
    {
        service.AddSynonym(request.WordA, request.WordB);
        return NoContent();
    }

    /// <summary>
    /// Returns all known words containing the given term as a case-insensitive substring.
    /// An empty term returns every word.
    /// </summary>
    /// <response code="200">Matching words (may be empty).</response>
    [HttpGet("search")]
    [ProducesResponseType(typeof(WordListResponse), StatusCodes.Status200OK)]
    public ActionResult<WordListResponse> SearchWords([FromQuery] string term = "")
    {
        var words = service.SearchWords(term);
        return new WordListResponse { Words = words.Select(w => w.Display).ToArray() };
    }

    /// <summary>Returns every word in the store, sorted alphabetically.</summary>
    /// <response code="200">All known words (may be empty).</response>
    [HttpGet("words/all")]
    [ProducesResponseType(typeof(WordListResponse), StatusCodes.Status200OK)]
    public ActionResult<WordListResponse> GetAllWords()
    {
        var words = service.GetAllWords();
        return new WordListResponse { Words = words.Select(w => w.Display).ToArray() };
    }

    /// <summary>
    /// Returns all synonyms for the given word, including transitive ones.
    /// The queried word itself is excluded from the result.
    /// </summary>
    /// <response code="200">Synonym list (may be empty if the word has no links).</response>
    /// <response code="404">Word does not exist in the store.</response>
    [HttpGet("{word}")]
    [ProducesResponseType(typeof(SynonymListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<SynonymListResponse> GetSynonyms(string word)
    {
        var result = service.GetSynonyms(word);
        return new SynonymListResponse
        {
            Word = result.Word.Display,
            DirectSynonyms = result.DirectSynonyms.Select(x => x.Display).ToArray(),
            TransitiveSynonyms = result.TransitiveSynonyms
                .Select(x => new TransitiveSynonymResponse { Word = x.Word.Display, ClosestNeighbour = x.ClosestNeighbour.Display })
                .ToArray(),
        };
    }

    /// <summary>Removes the direct synonym link between two words. Both words remain in the store.</summary>
    /// <response code="204">Link removed.</response>
    /// <response code="400">WordA and WordB are the same.</response>
    /// <response code="404">Link did not exist.</response>
    [HttpDelete("link")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult DeleteLink([FromBody] DeleteLinkRequest request)
    {
        service.DeleteLink(request.WordA, request.WordB);
        return NoContent();
    }

    /// <summary>Completely removes a word and all its synonym relationships from the store.</summary>
    /// <response code="204">Word removed.</response>
    /// <response code="404">Word not found.</response>
    [HttpDelete("word/{word}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult DeleteWord(string word)
    {
        service.DeleteWord(word);
        return NoContent();
    }

    /// <summary>Renames a word globally across all synonym relationships.</summary>
    /// <response code="204">Word renamed.</response>
    /// <response code="400">Validation failed.</response>
    /// <response code="404">Word not found.</response>
    /// <response code="409">The new name is already taken by another word.</response>
    [HttpPut("{word}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public IActionResult RenameWord(string word, [FromBody] RenameWordRequest request)
    {
        service.RenameWord(word, request.NewWord);
        return NoContent();
    }
}
