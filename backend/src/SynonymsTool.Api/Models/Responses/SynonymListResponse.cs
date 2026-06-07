namespace SynonymsTool.Api.Models.Responses;

/// <summary>Synonym lookup result, split into direct and transitive matches.</summary>
public sealed record SynonymListResponse
{
	public string Word { get; init; } = string.Empty;

	/// <summary>Words the user explicitly linked to this word.</summary>
	public IReadOnlyList<string> DirectSynonyms { get; init; } = [];

	/// <summary>Words reachable transitively, each with the nearest connecting word.</summary>
	public IReadOnlyList<TransitiveSynonymResponse> TransitiveSynonyms { get; init; } = [];
}

/// <summary>A transitively-linked synonym and the nearest synonym that connects it.</summary>
public sealed record TransitiveSynonymResponse
{
	/// <summary>The transitively-linked word.</summary>
	public string Word { get; init; } = string.Empty;

	/// <summary>The closest neighbour of the queried word.</summary>
	public string ClosestNeighbour { get; init; } = string.Empty;
}
