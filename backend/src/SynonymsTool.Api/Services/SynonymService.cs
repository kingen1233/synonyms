using SynonymsTool.Api.Domain;
using SynonymsTool.Api.Repositories;

namespace SynonymsTool.Api.Services;

/// <summary>
/// Default <see cref="ISynonymService"/>. Converts raw user strings into normalized
/// <see cref="Word"/> values, applies the synonym business rules, and delegates storage to
/// the <see cref="ISynonymRepository"/>. Stateless — all state lives in the singleton repository.
/// </summary>
public sealed class SynonymService(ISynonymRepository repository) : ISynonymService
{
    /// <inheritdoc/>
    public void AddSynonym(string wordA, string wordB)
    {
        var a = Word.From(wordA);
        var b = Word.From(wordB);

        // Business rule: a word cannot be a synonym of itself.
        if (a.Key == b.Key)
            throw new ValidationException("WordA and WordB must be different words.");

        repository.AddSynonym(a, b);
    }

    /// <inheritdoc/>
    public SynonymResult GetSynonyms(string word)
    {
        var target = Word.From(word);
        if (!repository.WordExists(target))
            throw new NotFoundException($"Word '{word}' not found.");

        var (direct, transitive) = repository.GetSynonyms(target);
        return new SynonymResult(target, direct, transitive);
    }

    /// <inheritdoc/>
    public IReadOnlyList<Word> SearchWords(string term) => repository.SearchWords(term);

    /// <inheritdoc/>
    public IReadOnlyList<Word> GetAllWords() => repository.GetAllWords();

    /// <inheritdoc/>
    public void DeleteLink(string wordA, string wordB)
    {
        var a = Word.From(wordA);
        var b = Word.From(wordB);

        if (a.Key == b.Key)
            throw new ValidationException("WordA and WordB must be different words.");

        if (!repository.DeleteLink(a, b))
            throw new NotFoundException($"No link found between '{wordA}' and '{wordB}'.");
    }

    /// <inheritdoc/>
    public void DeleteWord(string word)
    {
        if (!repository.DeleteWord(Word.From(word)))
            throw new NotFoundException($"Word '{word}' not found.");
    }

    /// <inheritdoc/>
    public void RenameWord(string word, string newWord)
    {
        if (!repository.RenameWord(Word.From(word), Word.From(newWord)))
            throw new NotFoundException($"Word '{word}' not found.");
    }
}
