namespace SynonymsTool.Api.Domain;

/// <summary>
/// A synonym reached indirectly (transitively) from a queried word, paired with the nearest
/// connecting word: the direct neighbour of the queried word on the shortest BFS path to
/// <see cref="Word"/>. Stored pre-computed in the snapshot so reads stay O(1).
/// </summary>
public sealed record TransitiveSynonym(Word Word, Word ClosestNeighbour);
