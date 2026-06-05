namespace SynonymsTool.Api.Domain;

/// <summary>
/// Base type for expected, business-rule failures (bad input, missing word, conflicts).
/// Each carries the HTTP status the global handler should translate it into, so the
/// controllers and service never deal with status codes for these cases.
/// </summary>
public abstract class AppException(string message) : Exception(message)
{
    /// <summary>HTTP status code this failure maps to.</summary>
    public abstract int StatusCode { get; }
}

/// <summary>A referenced word or link does not exist. Maps to 404.</summary>
public sealed class NotFoundException(string message) : AppException(message)
{
    public override int StatusCode => StatusCodes.Status404NotFound;
}

/// <summary>The requested change conflicts with existing state (e.g. rename target taken). Maps to 409.</summary>
public sealed class ConflictException(string message) : AppException(message)
{
    public override int StatusCode => StatusCodes.Status409Conflict;
}

/// <summary>Input violated a business rule (e.g. same word, prefix too short). Maps to 400.</summary>
public sealed class ValidationException(string message) : AppException(message)
{
    public override int StatusCode => StatusCodes.Status400BadRequest;
}
