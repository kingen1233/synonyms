using System.ComponentModel.DataAnnotations;

namespace SynonymsTool.Api.Models.Requests;

/// <summary>
/// Request payload to create a bidirectional synonym link between two words.
/// </summary>
public sealed class AddSynonymRequest
{
	[Required]
	[StringLength(100, MinimumLength = 1)]
	public string WordA { get; set; } = string.Empty;

	[Required]
	[StringLength(100, MinimumLength = 1)]
	public string WordB { get; set; } = string.Empty;
}
