using SynonymsTool.Api.Domain;

namespace SynonymsTool.Api.Services;

/// <summary>
/// A resolved synonym lookup in domain terms: the queried word plus its direct and
/// transitive synonyms. The controller maps this to the response DTO.
/// </summary>
public sealed record SynonymResult(
    Word Word,
    IReadOnlyList<Word> DirectSynonyms,
    IReadOnlyList<TransitiveSynonym> TransitiveSynonyms
);
