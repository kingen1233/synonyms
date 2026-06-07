namespace SynonymsTool.Api.Models.Responses;

/// <summary>Response containing a list of words (used for prefix search results).</summary>
public sealed record WordListResponse
{
	public IReadOnlyList<string> Words { get; init; } = [];
}
