using ContentUnderstanding.Api.Models;

namespace ContentUnderstanding.Api.Services;

public interface IDocumentAnalysisService
{
    Task<AnalysisResponse> AnalyzeAsync(string fileName, BinaryData content, CancellationToken cancellationToken);
}
