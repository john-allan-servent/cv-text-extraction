using Azure;
using Azure.AI.ContentUnderstanding;
using ContentUnderstanding.Api.Logging;
using ContentUnderstanding.Api.Options;
using Microsoft.Extensions.Options;

namespace ContentUnderstanding.Api.Services;

/// <summary>Maps model names to Foundry deployments so prebuilt analyzers can run. Idempotent; retries while RBAC propagates.</summary>
public sealed class ModelDefaultsInitializer(
    ContentUnderstandingClient client,
    IOptions<ContentUnderstandingOptions> options,
    ILogger<ModelDefaultsInitializer> logger) : BackgroundService
{
    private const int MaxAttempts = 6;
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var deployments = options.Value.ModelDeployments;

        for (var attempt = 1; attempt <= MaxAttempts && !stoppingToken.IsCancellationRequested; attempt++)
        {
            try
            {
                await client.UpdateDefaultsAsync(deployments, stoppingToken);
                logger.ModelDefaultsConfigured(deployments.Count);
                return;
            }
            catch (RequestFailedException ex)
            {
                logger.ModelDefaultsFailed(ex, attempt, MaxAttempts, ex.Status);
            }

            try
            {
                await Task.Delay(RetryDelay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }
}
