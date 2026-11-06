using System.Diagnostics;
using Azure;
using Azure.AI.ContentUnderstanding;
using ContentUnderstanding.Api.Logging;
using ContentUnderstanding.Api.Models;
using ContentUnderstanding.Api.Options;
using Microsoft.Extensions.Options;

namespace ContentUnderstanding.Api.Services;

public sealed class ContentUnderstandingAnalysisService(
    ContentUnderstandingClient client,
    IOptions<ContentUnderstandingOptions> options,
    ILogger<ContentUnderstandingAnalysisService> logger) : IDocumentAnalysisService
{
    private const string SummaryFieldName = "Summary";

    public async Task<AnalysisResponse> AnalyzeAsync(string fileName, BinaryData content, CancellationToken cancellationToken)
    {
        var analyzerId = options.Value.AnalyzerId;
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var operation = await client.AnalyzeBinaryAsync(
                WaitUntil.Completed, analyzerId, content, cancellationToken: cancellationToken);

            var document = operation.Value.Contents?.OfType<DocumentContent>().FirstOrDefault();
            if (document is null)
            {
                logger.NoContentReturned(analyzerId, fileName);
            }

            string? summary = null;
            if (document?.Fields is not null && document.Fields.TryGetValue(SummaryFieldName, out var field))
            {
                summary = (field as ContentStringField)?.Value;
            }

            int? pageCount = document is null ? null : document.EndPageNumber - document.StartPageNumber + 1;

            stopwatch.Stop();
            logger.AnalysisCompleted(fileName, analyzerId, stopwatch.ElapsedMilliseconds);

            return new AnalysisResponse(
                fileName, analyzerId, document?.Fields ?? new Dictionary<string, ContentField>(), summary, pageCount, stopwatch.ElapsedMilliseconds);
        }
        catch (RequestFailedException ex)
        {
            logger.AnalysisFailed(ex, fileName, ex.Status, ex.ErrorCode);
            throw;
        }
    }
}
