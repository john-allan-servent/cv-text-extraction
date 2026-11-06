using System.Net;
using System.Net.Http.Json;
using Azure;
using ContentUnderstanding.Api.Models;
using ContentUnderstanding.Api.Endpoints;
using ContentUnderstanding.Api.Tests.Infrastructure;

namespace ContentUnderstanding.Api.Tests;

public class AnalysisEndpointsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static MultipartFormDataContent Upload(string fileName, byte[] bytes)
    {
        var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(bytes), "file", fileName);
        return form;
    }

    [Fact]
    public async Task Health_is_anonymous()
    {
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.AnonymousHeader, "1");

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Config_is_anonymous_and_exposes_spa_settings()
    {
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.AnonymousHeader, "1");

        var response = await client.GetAsync("/api/config");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<SpaConfig>();
        Assert.Equal("api://11111111-1111-1111-1111-111111111111/access_as_user", body?.ApiScope);
        Assert.Equal("22222222-2222-2222-2222-222222222222", body?.ClientId);
    }

    [Fact]
    public async Task Anonymous_upload_is_unauthorized()
    {
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.AnonymousHeader, "1");

        var response = await client.PostAsync("/api/analysis", Upload("a.txt", "hi"u8.ToArray()));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Token_without_required_scope_is_forbidden()
    {
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.ScopeHeader, "other.scope");

        var response = await client.PostAsync("/api/analysis", Upload("a.txt", "hi"u8.ToArray()));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Valid_text_file_returns_analysis()
    {
        using var client = factory.CreateClient();

        var response = await client.PostAsync("/api/analysis", Upload("a.txt", "hello"u8.ToArray()));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AnalysisResponse>();
        Assert.Equal("a.txt", body?.FileName);
        Assert.Equal("A summary", body?.Summary);
    }

    [Fact]
    public async Task Unsupported_file_type_returns_bad_request_without_calling_service()
    {
        using var client = factory.CreateClient();
        var before = factory.Analysis.Calls;

        var response = await client.PostAsync("/api/analysis", Upload("a.exe", "MZ"u8.ToArray()));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, factory.Analysis.Calls);
    }

    [Fact]
    public async Task Service_failure_returns_bad_gateway()
    {
        using var client = factory.CreateClient();
        factory.Analysis.ExceptionToThrow = new RequestFailedException(500, "boom");
        try
        {
            var response = await client.PostAsync("/api/analysis", Upload("a.txt", "hello"u8.ToArray()));

            Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        }
        finally
        {
            factory.Analysis.ExceptionToThrow = null;
        }
    }
}
