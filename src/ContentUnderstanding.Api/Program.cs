using Azure.AI.ContentUnderstanding;
using Azure.Identity;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using ContentUnderstanding.Api.Endpoints;
using ContentUnderstanding.Api.Logging;
using ContentUnderstanding.Api.Options;
using ContentUnderstanding.Api.Services;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Options;
using Microsoft.Identity.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddOptions<ContentUnderstandingOptions>()
    .Bind(builder.Configuration.GetSection(ContentUnderstandingOptions.SectionName))
    .ValidateDataAnnotations();

var telemetryEnabled = !string.IsNullOrWhiteSpace(builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]);
if (telemetryEnabled)
{
    builder.Services.AddOpenTelemetry().UseAzureMonitor();
}

builder.Services.AddMicrosoftIdentityWebApiAuthentication(builder.Configuration, "AzureAd");

var requiredScope = builder.Configuration["AzureAd:RequiredScope"] ?? "access_as_user";
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(AnalysisEndpoints.PolicyName, policy => policy
        .RequireAuthenticatedUser()
        .RequireAssertion(ctx =>
            ctx.User.FindAll(c => c.Type is "scp" or "http://schemas.microsoft.com/identity/claims/scope")
                .SelectMany(c => c.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                .Contains(requiredScope)));

builder.Services.AddSingleton(sp =>
{
    var settings = sp.GetRequiredService<IOptions<ContentUnderstandingOptions>>().Value;
    // DefaultAzureCredential: managed identity (AZURE_CLIENT_ID) in Azure, az login / VS credentials locally.
    return new ContentUnderstandingClient(new Uri(settings.Endpoint), new DefaultAzureCredential());
});
builder.Services.AddSingleton<IDocumentAnalysisService, ContentUnderstandingAnalysisService>();

if (builder.Configuration.GetValue("ContentUnderstanding:ConfigureDefaultsOnStartup", true))
{
    builder.Services.AddHostedService<ModelDefaultsInitializer>();
}

var maxBytes = builder.Configuration
    .GetSection(ContentUnderstandingOptions.SectionName)
    .Get<ContentUnderstandingOptions>()?.MaxFileSizeBytes ?? new ContentUnderstandingOptions().MaxFileSizeBytes;
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = maxBytes + 1024 * 1024);
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = maxBytes + 1024 * 1024);

builder.Services.AddProblemDetails();

var app = builder.Build();

app.Logger.TelemetryState(telemetryEnabled ? "enabled" : "disabled");

app.UseExceptionHandler();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapAnalysisEndpoints();
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program;
