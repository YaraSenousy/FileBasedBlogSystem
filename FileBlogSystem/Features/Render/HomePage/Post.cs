namespace FileBlogSystem.Features.Render.HomePage;

public class Post
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public DateTime Published { get; set; }
    public List<string>? Tags { get; set; } = [];
    public List<string>? Categories { get; set; } = [];
    public string HtmlContent { get; set; } = string.Empty;
}
