namespace SynonymsTool.Api.Models.Responses;

/// <summary>Response containing a list of words (used for prefix search results).</summary>
public sealed class WordListResponse
{
	public IReadOnlyList<string> Words { get; set; } = [];
}
