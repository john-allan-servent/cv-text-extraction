using System.Security.Claims;
using System.Text.Encodings.Web;
using ContentUnderstanding.Api.Models;
using ContentUnderstanding.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ContentUnderstanding.Api.Tests.Infrastructure;

public sealed class FakeAnalysisService : IDocumentAnalysisService
{
    public int Calls { get; private set; }

    public Exception? ExceptionToThrow { get; set; }

    public Task<AnalysisResponse> AnalyzeAsync(string fileName, BinaryData content, CancellationToken cancellationToken)
    {
        Calls++;
        if (ExceptionToThrow is not null)
        {
            throw ExceptionToThrow;
        }

        return Task.FromResult(new AnalysisResponse(fileName, "prebuilt-documentSearch", "# Hello", "A summary", 1, 5));
    }
}

public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";
    public const string ScopeHeader = "X-Test-Scope";
    public const string AnonymousHeader = "X-Test-Anonymous";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (Request.Headers.ContainsKey(AnonymousHeader))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var scope = Request.Headers.TryGetValue(ScopeHeader, out var value) ? value.ToString() : "access_as_user";
        var identity = new ClaimsIdentity(
            [new Claim("oid", "test-user"), new Claim("scp", scope)], SchemeName);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public FakeAnalysisService Analysis { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("AzureAd:TenantId", "00000000-0000-0000-0000-000000000000");
        builder.UseSetting("AzureAd:ClientId", "11111111-1111-1111-1111-111111111111");
        builder.UseSetting("AzureAd:SpaClientId", "22222222-2222-2222-2222-222222222222");
        builder.UseSetting("ContentUnderstanding:ConfigureDefaultsOnStartup", "false");
        builder.UseSetting("ContentUnderstanding:Endpoint", "https://example.services.ai.azure.com/");

        builder.ConfigureTestServices(services =>
        {
            services.AddAuthentication(o =>
            {
                o.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                o.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });

            services.AddSingleton<IDocumentAnalysisService>(Analysis);
        });
    }
}
