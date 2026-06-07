namespace SynonymsTool.Api.Domain;

/// <summary>
/// A synonym reached indirectly (transitively) from a queried word, and
/// the direct neighbour of the queried word.
/// </summary>
public sealed record TransitiveSynonym(Word Word, Word ClosestNeighbour);
