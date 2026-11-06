using Azure.AI.ContentUnderstanding;

namespace ContentUnderstanding.Api.Models;

public sealed record AnalysisResponse(
    string FileName,
    string AnalyzerId,
    IDictionary<string, ContentField> Fields,
    string? Summary,
    int? PageCount,
    long DurationMs);
