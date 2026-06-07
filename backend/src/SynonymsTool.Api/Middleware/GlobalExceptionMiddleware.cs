using System.Net;
using System.Text.Json;
using SynonymsTool.Api.Domain;

namespace SynonymsTool.Api.Middleware;

/// <summary>
/// Translates exceptions escaping the controller pipeline into JSON error responses.
/// HTTP status mapping for domain exceptions is owned here, keeping the domain layer
/// free of any web concerns. Unexpected faults become 500 with no stack-trace leak.
/// </summary>
public sealed class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
	// Maps domain exception types to HTTP status codes. The domain layer stays unaware of HTTP.
	private static readonly Dictionary<Type, int> StatusCodeMap = new()
	{
		[typeof(NotFoundException)]  = StatusCodes.Status404NotFound,
		[typeof(ConflictException)]  = StatusCodes.Status409Conflict,
		[typeof(ValidationException)] = StatusCodes.Status400BadRequest,
	};

	public async Task InvokeAsync(HttpContext context)
	{
		try
		{
			await next(context);
		}
		catch (AppException ex) when (StatusCodeMap.TryGetValue(ex.GetType(), out var statusCode))
		{
			// Expected, rule-based failure — not logged as an error.
			await WriteErrorResponse(context, statusCode, ex.Message);
		}
		catch (Exception ex)
		{
			logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
			await WriteErrorResponse(context, (int)HttpStatusCode.InternalServerError, "An unexpected error occurred.");
		}
	}

	private static async Task WriteErrorResponse(HttpContext context, int statusCode, string detail)
	{
		context.Response.ContentType = "application/json";
		context.Response.StatusCode = statusCode;

		var payload = JsonSerializer.Serialize(new { error = detail });
		await context.Response.WriteAsync(payload);
	}
}
