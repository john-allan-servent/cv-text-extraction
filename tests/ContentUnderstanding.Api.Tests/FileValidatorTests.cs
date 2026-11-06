using System.Text;
using ContentUnderstanding.Api.Services;

namespace ContentUnderstanding.Api.Tests;

public class FileValidatorTests
{
    private const long Max = 1024 * 1024;

    [Fact]
    public void Pdf_with_magic_bytes_is_valid() =>
        Assert.Null(FileValidator.Validate("a.pdf", "%PDF-1.7 body"u8, Max));

    [Fact]
    public void Docx_with_zip_magic_is_valid() =>
        Assert.Null(FileValidator.Validate("a.DOCX", new byte[] { 0x50, 0x4B, 0x03, 0x04, 1 }, Max));

    [Fact]
    public void Utf8_text_is_valid() =>
        Assert.Null(FileValidator.Validate("a.txt", "héllo"u8, Max));

    [Theory]
    [InlineData("a.exe")]
    [InlineData("a.doc")]
    [InlineData("noextension")]
    public void Unsupported_extension_is_rejected(string name) =>
        Assert.NotNull(FileValidator.Validate(name, "%PDF-"u8, Max));

    [Fact]
    public void Pdf_extension_with_wrong_content_is_rejected() =>
        Assert.NotNull(FileValidator.Validate("a.pdf", "not a pdf"u8, Max));

    [Fact]
    public void Invalid_utf8_text_is_rejected() =>
        Assert.NotNull(FileValidator.Validate("a.txt", new byte[] { 0xFF, 0xFE, 0xFD }, Max));

    [Fact]
    public void Empty_file_is_rejected() =>
        Assert.NotNull(FileValidator.Validate("a.txt", ReadOnlySpan<byte>.Empty, Max));

    [Fact]
    public void Oversized_file_is_rejected() =>
        Assert.NotNull(FileValidator.Validate("a.txt", Encoding.UTF8.GetBytes(new string('a', 20)), 10));
}
