namespace SynonymsTool.Api.Models.Responses;

/// <summary>Synonym lookup result, split into direct and transitive matches.</summary>
public sealed class SynonymListResponse
{
	public string Word { get; set; } = string.Empty;

	/// <summary>Words the user explicitly linked to this word.</summary>
	public IReadOnlyList<string> DirectSynonyms { get; set; } = [];

	/// <summary>Words reachable transitively, each with the nearest connecting word.</summary>
	public IReadOnlyList<TransitiveSynonymResponse> TransitiveSynonyms { get; set; } = [];
}

/// <summary>A transitively-linked synonym and the nearest synonym that connects it.</summary>
public sealed class TransitiveSynonymResponse
{
	/// <summary>The transitively-linked word.</summary>
	public string Word { get; set; } = string.Empty;

	/// <summary>The closest neighbour of the queried word.</summary>
	public string ClosestNeighbour { get; set; } = string.Empty;
}
