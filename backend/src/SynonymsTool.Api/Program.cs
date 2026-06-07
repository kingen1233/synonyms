using SynonymsTool.Api.Middleware;
using SynonymsTool.Api.Repositories;
using SynonymsTool.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// -----------------------------------------------------------------------
// Services
// -----------------------------------------------------------------------

builder.Services.AddControllers();

// Register the synonym store as a singleton so the in-memory state lives
// for the entire application lifetime.
builder.Services.AddSingleton<ISynonymRepository, SynonymRepository>();

// The application/service layer is stateless; all state lives in the singleton
// repository, so a lightweight scoped registration is sufficient.
builder.Services.AddScoped<ISynonymService, SynonymService>();

// CORS: allow the Vite dev server (and configurable production origin).
var allowedOrigins = builder.Configuration
	.GetSection("AllowedOrigins")
	.Get<string[]>() ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
	options.AddDefaultPolicy(policy =>
		policy.WithOrigins(allowedOrigins)
			  .AllowAnyHeader()
			  .AllowAnyMethod()));

// Swagger / OpenAPI — the generated swagger.json is the source Orval reads
// to produce the typed TypeScript client for the frontend.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
	options.SwaggerDoc("v1", new()
	{
		Title = "Synonyms Tool API",
		Version = "v1",
		Description = "In-memory bidirectional synonym graph with transitive lookup."
	});

	// Use the controller action name as the OpenAPI operationId so Orval generates
	// clean, predictable client function names (addSynonym, getSynonyms, ...).
	options.CustomOperationIds(apiDescription =>
		apiDescription.ActionDescriptor is Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor descriptor
			? descriptor.ActionName
			: null);

	// Include XML doc comments so Orval gets rich operation descriptions.
	var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
	var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
	if (File.Exists(xmlPath))
		options.IncludeXmlComments(xmlPath);
});

// -----------------------------------------------------------------------
// Pipeline
// -----------------------------------------------------------------------

var app = builder.Build();

// Unhandled exceptions → structured JSON error (no stack-trace leaks).
app.UseMiddleware<GlobalExceptionMiddleware>();

// Swagger UI enabled in all environments for easy testing.
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Synonyms Tool v1"));

app.UseCors();

app.UseAuthorization();

app.MapControllers();

app.Run();

// Expose the implicit Program class so integration tests can reference it.
public partial class Program { }
