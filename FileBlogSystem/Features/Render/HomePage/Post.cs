namespace FileBlogSystem.Features.Render.HomePage;

public class Post
{
    public string title { get; set; } = string.Empty;
    public string description { get; set; } = string.Empty;
    public string slug { get; set; } = string.Empty;
    public DateTime published { get; set; }
    public List<string>? tags { get; set; } = [];
    public List<string>? categories { get; set; } = [];
    public string htmlContent { get; set; } = string.Empty;
}
