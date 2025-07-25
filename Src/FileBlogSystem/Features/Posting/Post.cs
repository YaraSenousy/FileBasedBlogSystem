namespace FileBlogSystem.Features.Posting;

public class Post
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public DateTime Published { get; set; }
    public DateTime Modified { get; set; }
    public string Status { get; set; } = "draft"; // published | draft | scheduled
    public List<string>? Tags { get; set; } = [];
    public List<string>? Categories { get; set; } = [];
    public string HtmlContent { get; set; } = string.Empty;
    public string RawMarkdown { get; set; } = string.Empty;
    public List<string>? MediaUrls { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string? ModifiedBy { get; set; } = string.Empty;
}
