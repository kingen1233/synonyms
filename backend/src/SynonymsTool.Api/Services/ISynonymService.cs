using SynonymsTool.Api.Domain;

namespace SynonymsTool.Api.Services;

/// <summary>
/// Application layer between the HTTP controller and the synonym store.
/// Owns string → <see cref="Word"/> conversion and the business validation rules, throwing
/// <see cref="AppException"/>-derived exceptions for rule failures so the controller stays
/// free of status-code logic (the global handler maps exceptions to responses).
/// </summary>
public interface ISynonymService
{
    /// <summary>Links two words as bidirectional, transitive synonyms.</summary>
    /// <exception cref="ValidationException">The two words are the same.</exception>
    void AddSynonym(string wordA, string wordB);

    /// <summary>Resolves all synonyms for <paramref name="word"/> (direct and transitive).</summary>
    /// <exception cref="NotFoundException">The word is not present in the store.</exception>
    SynonymResult GetSynonyms(string word);

    /// <summary>
    /// Returns all stored words containing <paramref name="term"/> as a case-insensitive
    /// substring. An empty term returns every word.
    /// </summary>
    IReadOnlyList<Word> SearchWords(string term);

    /// <summary>Returns every word in the store, sorted alphabetically.</summary>
    IReadOnlyList<Word> GetAllWords();

    /// <summary>Removes the direct synonym link between two words; both words remain in the store.</summary>
    /// <exception cref="ValidationException">The two words are the same.</exception>
    /// <exception cref="NotFoundException">No link exists between the two words.</exception>
    void DeleteLink(string wordA, string wordB);

    /// <summary>Removes a word and all of its synonym relationships.</summary>
    /// <exception cref="NotFoundException">The word does not exist.</exception>
    void DeleteWord(string word);

    /// <summary>Renames a word globally across all synonym relationships.</summary>
    /// <exception cref="NotFoundException">The word does not exist.</exception>
    /// <exception cref="ConflictException">The new name is already taken by another word.</exception>
    void RenameWord(string word, string newWord);
}
