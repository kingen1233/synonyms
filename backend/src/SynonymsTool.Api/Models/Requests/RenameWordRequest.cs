using System.ComponentModel.DataAnnotations;

namespace SynonymsTool.Api.Models.Requests;

/// <summary>Request to rename a word globally across all synonym relationships.</summary>
public sealed record RenameWordRequest
{
	[Required]
	[StringLength(100, MinimumLength = 1)]
	public string NewWord { get; init; } = string.Empty;
}
