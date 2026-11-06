using System.Text;

namespace ContentUnderstanding.Api.Services;

public static class FileValidator
{
    private static readonly byte[] PdfMagic = "%PDF-"u8.ToArray();
    private static readonly byte[] ZipMagic = [0x50, 0x4B, 0x03, 0x04];
    private static readonly UTF8Encoding StrictUtf8 = new(false, throwOnInvalidBytes: true);

    public static readonly IReadOnlySet<string> AllowedExtensions =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ".pdf", ".docx", ".txt" };

    /// <summary>Returns an error message, or null when the file is acceptable.</summary>
    public static string? Validate(string fileName, ReadOnlySpan<byte> content, long maxBytes)
    {
        if (content.IsEmpty)
        {
            return "The file is empty.";
        }

        if (content.Length > maxBytes)
        {
            return $"The file exceeds the maximum size of {maxBytes / (1024 * 1024)} MB.";
        }

        var extension = Path.GetExtension(fileName);
        if (!AllowedExtensions.Contains(extension))
        {
            return "Only .pdf, .docx and .txt files are supported.";
        }

        return extension.ToLowerInvariant() switch
        {
            ".pdf" when !content.StartsWith(PdfMagic) => "The file is not a valid PDF.",
            ".docx" when !content.StartsWith(ZipMagic) => "The file is not a valid DOCX.",
            ".txt" when !IsValidUtf8(content) => "The text file must be UTF-8 encoded.",
            _ => null,
        };
    }

    private static bool IsValidUtf8(ReadOnlySpan<byte> content)
    {
        try
        {
            StrictUtf8.GetCharCount(content);
            return true;
        }
        catch (DecoderFallbackException)
        {
            return false;
        }
    }
}
