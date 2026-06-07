namespace SynonymsTool.Api.Domain;

/// <summary>
/// Base type for expected, business-rule failures (bad input, missing word, conflicts).
/// Subclasses carry semantic meaning only — HTTP status mapping lives in the web layer.
/// </summary>
public abstract class AppException(string message) : Exception(message);

/// <summary>A referenced word or link does not exist.</summary>
public sealed class NotFoundException(string message) : AppException(message);

/// <summary>The requested change conflicts with existing state (e.g. rename target taken).</summary>
public sealed class ConflictException(string message) : AppException(message);

/// <summary>Input violated a business rule (e.g. same word, prefix too short).</summary>
public sealed class ValidationException(string message) : AppException(message);
