using System.ComponentModel.DataAnnotations;

namespace ContentUnderstanding.Api.Options;

public sealed class ContentUnderstandingOptions
{
    public const string SectionName = "ContentUnderstanding";

    /// <summary>Foundry resource endpoint, e.g. https://my-foundry.services.ai.azure.com/</summary>
    [Required]
    public string Endpoint { get; set; } = string.Empty;

    public string AnalyzerId { get; set; } = "prebuilt-documentSearch";

    [Range(1, 200)]
    public int MaxFileSizeMb { get; set; } = 20;

    public long MaxFileSizeBytes => MaxFileSizeMb * 1024L * 1024L;

    /// <summary>Applies <see cref="ModelDeployments"/> as the service defaults at start-up (needs Cognitive Services User).</summary>
    public bool ConfigureDefaultsOnStartup { get; set; } = true;

    /// <summary>Model name to Foundry deployment name; prebuilt-documentSearch needs gpt-4.1-mini and text-embedding-3-large; mapped here to the deployed gpt-5.4-mini and gpt-5.1.</summary>
    public Dictionary<string, string> ModelDeployments { get; set; } = new()
    {
        ["gpt-4.1"] = "gpt-5.1",
        ["gpt-4.1-mini"] = "gpt-5.4-mini",
        ["text-embedding-3-large"] = "text-embedding-3-large",
    };
}
