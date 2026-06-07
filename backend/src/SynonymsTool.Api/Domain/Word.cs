namespace SynonymsTool.Api.Domain;

/// <summary>
/// A word as it enters the store. Pairs the normalized <see cref="Key"/> with the original
/// <see cref="Display"/> casing the user typed.
/// </summary>
public readonly record struct Word(WordKey Key, string Display)
{
    /// <summary>Builds a <see cref="Word"/> from raw user input.</summary>
    public static Word From(string raw)
    {
        var display = raw.Trim();
        return new Word(WordKey.From(raw), display);
    }
}

/// <summary>
/// The normalized lookup form of a word — trimmed and lower-cased. Used as the key for every
/// internal collection.
/// </summary>
public readonly record struct WordKey(string Value)
{
    public static WordKey From(string raw) => new(raw.Trim().ToLowerInvariant());

    public override string ToString() => Value;
}
