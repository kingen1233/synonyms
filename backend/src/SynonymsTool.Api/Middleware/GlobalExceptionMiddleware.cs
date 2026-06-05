using System.Net;
using System.Text.Json;
using SynonymsTool.Api.Domain;

namespace SynonymsTool.Api.Middleware;

/// <summary>
/// Translates exceptions escaping the controller pipeline into JSON error responses.
/// Expected business failures (<see cref="AppException"/>) map to their declared status code;
/// anything else is an unexpected fault and becomes a 500 with no stack-trace leak.
/// </summary>
public sealed class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
	public async Task InvokeAsync(HttpContext context)
	{
		try
		{
			await next(context);
		}
		catch (AppException ex)
		{
			// Expected, rule-based failure — not logged as an error.
			await WriteErrorResponse(context, ex.StatusCode, ex.Message);
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
