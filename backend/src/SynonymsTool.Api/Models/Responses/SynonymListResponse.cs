namespace SynonymsTool.Api.Models.Responses;

/// <summary>Synonym lookup result, split into direct and transitive matches.</summary>
public sealed class SynonymListResponse
{
	public string Word { get; set; } = string.Empty;

	/// <summary>Words the user explicitly linked to this word.</summary>
	public IReadOnlyList<string> DirectSynonyms { get; set; } = [];

	/// <summary>Words reachable transitively but not directly linked.</summary>
	public IReadOnlyList<string> TransitiveSynonyms { get; set; } = [];
}
