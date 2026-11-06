using ContentUnderstanding.Api.Logging;
using ContentUnderstanding.Api.Options;
using ContentUnderstanding.Api.Services;
using Azure;
using Microsoft.Extensions.Options;

namespace ContentUnderstanding.Api.Endpoints;

public sealed record SpaConfig(string TenantId, string ClientId, string ApiScope);

public static class AnalysisEndpoints
{
    public const string PolicyName = "AnalyzeAccess";

    public static IEndpointRouteBuilder MapAnalysisEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" })).AllowAnonymous();

        // Public (non-secret) values the SPA needs to configure MSAL at start-up.
        app.MapGet("/api/config", (IConfiguration configuration) =>
        {
            var apiClientId = configuration["AzureAd:ClientId"];
            var scope = configuration["AzureAd:RequiredScope"] ?? "access_as_user";
            return Results.Ok(new SpaConfig(
                configuration["AzureAd:TenantId"] ?? string.Empty,
                configuration["AzureAd:SpaClientId"] ?? string.Empty,
                $"api://{apiClientId}/{scope}"));
        }).AllowAnonymous();

        app.MapGroup("/api/analysis")
            .RequireAuthorization(PolicyName)
            .MapPost("/", AnalyzeAsync)
            .DisableAntiforgery() // Bearer-token API; no cookie auth, so CSRF does not apply
            .Accepts<IFormFile>("multipart/form-data")
            .Produces<Models.AnalysisResponse>()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status502BadGateway);

        app.MapFallback("/api/{**path}", () => Results.NotFound());

        return app;
    }

    private static async Task<IResult> AnalyzeAsync(
        IFormFile file,
        HttpContext context,
        IDocumentAnalysisService service,
        IOptions<ContentUnderstandingOptions> options,
        ILogger<IDocumentAnalysisService> logger,
        CancellationToken cancellationToken)
    {
        var fileName = Path.GetFileName(file.FileName);
        logger.AnalysisRequested(fileName, file.Length, context.User.FindFirst("oid")?.Value);

        if (file.Length > options.Value.MaxFileSizeBytes)
        {
            return Reject(logger, fileName, "The file exceeds the maximum allowed size.");
        }

        await using var stream = file.OpenReadStream();
        var content = await BinaryData.FromStreamAsync(stream, cancellationToken);

        var error = FileValidator.Validate(fileName, content.ToMemory().Span, options.Value.MaxFileSizeBytes);
        if (error is not null)
        {
            return Reject(logger, fileName, error);
        }

        try
        {
            return Results.Ok(await service.AnalyzeAsync(fileName, content, cancellationToken));
        }
        catch (RequestFailedException)
        {
            return Results.Problem(
                title: "Content Understanding request failed",
                detail: "The analysis service could not process the document. Try again later.",
                statusCode: StatusCodes.Status502BadGateway);
        }
    }

    private static IResult Reject(ILogger logger, string fileName, string reason)
    {
        logger.UploadRejected(fileName, reason);
        return Results.Problem(title: "Invalid file", detail: reason, statusCode: StatusCodes.Status400BadRequest);
    }
}
