public class PostMeta
{
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Slug { get; set; } = "";
    public DateTime Published { get; set; }
    public string Status { get; set; } = "draft";
    public List<string>? Tags { get; set; } = [];
    public List<string>? Categories { get; set; } = [];
}
