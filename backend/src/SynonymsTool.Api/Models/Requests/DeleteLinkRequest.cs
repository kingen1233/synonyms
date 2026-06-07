using System.ComponentModel.DataAnnotations;

namespace SynonymsTool.Api.Models.Requests;

/// <summary>Request to remove the link between two synonyms without deleting either word.</summary>
public sealed record DeleteLinkRequest
{
	[Required]
	[StringLength(100, MinimumLength = 1)]
	public string WordA { get; init; } = string.Empty;

	[Required]
	[StringLength(100, MinimumLength = 1)]
	public string WordB { get; init; } = string.Empty;
}
