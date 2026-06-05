using SynonymsTool.Api.Domain;

namespace SynonymsTool.Api.Repositories;

/// <summary>
/// Defines the synonym store. Implementations are expected to be thread-safe.
/// </summary>
public interface ISynonymRepository
{
    /// <summary>
    /// Links two words as synonyms. The relationship is bidirectional and transitive.
    /// Does nothing if the link already exists.
    /// </summary>
    void AddSynonym(Word wordA, Word wordB);

    /// <summary>
    /// Returns synonyms for <paramref name="word"/> split into direct (explicitly linked)
    /// and transitive (reachable via the cluster but not directly linked, each with a
    /// <see cref="TransitiveSynonym.ClosestNeighbour"/> connector).
    /// Returns empty lists if the word is unknown.
    /// </summary>
    (IReadOnlyList<Word> DirectSynonyms, IReadOnlyList<TransitiveSynonym> TransitiveSynonyms) GetSynonyms(
        Word word
    );

    /// <summary>
    /// Returns all words containing <paramref name="term"/> as a case-insensitive substring,
    /// sorted alphabetically. An empty term matches every word.
    /// </summary>
    IReadOnlyList<Word> SearchWords(string term);

    /// <summary>Returns every word in the store, sorted alphabetically.</summary>
    IReadOnlyList<Word> GetAllWords();

    /// <summary>Returns <c>true</c> if <paramref name="word"/> is present in the store.</summary>
    bool WordExists(Word word);

    /// <summary>
    /// Breaks the synonym link between two words. Both words stay in the store.
    /// </summary>
    /// <returns><c>true</c> if the link existed and was removed; <c>false</c> if not found.</returns>
    bool DeleteLink(Word wordA, Word wordB);

    /// <summary>
    /// Removes a word and all its synonym relationships.
    /// </summary>
    /// <returns><c>true</c> if the word was found and removed; <c>false</c> if it didn't exist.</returns>
    bool DeleteWord(Word word);

    /// <summary>
    /// Renames a word everywhere it appears. All existing synonym links are preserved under the new name.
    /// </summary>
    /// <exception cref="ConflictException">Thrown if <paramref name="newWord"/> is already taken by another word.</exception>
    /// <returns><c>true</c> if renamed; <c>false</c> if <paramref name="oldWord"/> wasn't found.</returns>
    bool RenameWord(Word oldWord, Word newWord);
}
