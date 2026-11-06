namespace ContentUnderstanding.Api.Logging;

internal static partial class Log
{
    [LoggerMessage(EventId = 1000, Level = LogLevel.Information,
        Message = "Analysis requested for {FileName} ({SizeBytes} bytes) by {UserId}")]
    public static partial void AnalysisRequested(this ILogger logger, string fileName, long sizeBytes, string? userId);

    [LoggerMessage(EventId = 1001, Level = LogLevel.Warning,
        Message = "Upload rejected for {FileName}: {Reason}")]
    public static partial void UploadRejected(this ILogger logger, string fileName, string reason);

    [LoggerMessage(EventId = 1002, Level = LogLevel.Information,
        Message = "Analysis completed for {FileName} with analyzer {AnalyzerId} in {DurationMs} ms")]
    public static partial void AnalysisCompleted(this ILogger logger, string fileName, string analyzerId, long durationMs);

    [LoggerMessage(EventId = 1003, Level = LogLevel.Error,
        Message = "Content Understanding call failed for {FileName} with status {StatusCode} and error code {ErrorCode}")]
    public static partial void AnalysisFailed(this ILogger logger, Exception exception, string fileName, int statusCode, string? errorCode);

    [LoggerMessage(EventId = 1004, Level = LogLevel.Warning,
        Message = "Analyzer {AnalyzerId} returned no document content for {FileName}")]
    public static partial void NoContentReturned(this ILogger logger, string analyzerId, string fileName);

    [LoggerMessage(EventId = 1005, Level = LogLevel.Information,
        Message = "Azure Monitor telemetry {State}")]
    public static partial void TelemetryState(this ILogger logger, string state);

    [LoggerMessage(EventId = 1006, Level = LogLevel.Information,
        Message = "Configured {DeploymentCount} Content Understanding model deployment defaults")]
    public static partial void ModelDefaultsConfigured(this ILogger logger, int deploymentCount);

    [LoggerMessage(EventId = 1007, Level = LogLevel.Warning,
        Message = "Could not configure model deployment defaults (attempt {Attempt} of {MaxAttempts}, status {StatusCode})")]
    public static partial void ModelDefaultsFailed(this ILogger logger, Exception exception, int attempt, int maxAttempts, int statusCode);
}
