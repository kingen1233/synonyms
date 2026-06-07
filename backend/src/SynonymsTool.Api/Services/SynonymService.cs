using SynonymsTool.Api.Domain;
using SynonymsTool.Api.Repositories;

namespace SynonymsTool.Api.Services;

/// <summary>
/// Default <see cref="ISynonymService"/>. Converts raw user strings into normalized
/// <see cref="Word"/> values, applies the synonym business rules, and delegates storage to
/// the <see cref="ISynonymRepository"/>.
/// </summary>
public sealed class SynonymService(ISynonymRepository repository) : ISynonymService
{
    /// <inheritdoc/>
    public void AddSynonym(string wordA, string wordB)
    {
        var firstWord = Word.From(wordA);
        var secondWord = Word.From(wordB);

        if (firstWord.Key == secondWord.Key)
            throw new ValidationException("WordA and WordB must be different words.");

        repository.AddSynonym(firstWord, secondWord);
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
        var firstWord = Word.From(wordA);
        var secondWord = Word.From(wordB);

        if (firstWord.Key == secondWord.Key)
            throw new ValidationException("WordA and WordB must be different words.");

        if (!repository.DeleteLink(firstWord, secondWord))
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
