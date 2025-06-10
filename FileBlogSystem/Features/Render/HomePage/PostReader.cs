using Markdig;
using System.Text.Json;

namespace FileBlogSystem.Features.Posting;

public static class PostReader
{
    public static Post? ReadPostFromFolder(string folderPath)
    {
        var metaPath = Path.Combine(folderPath, "meta.json");
        var contentPath = Path.Combine(folderPath, "content.md");

        if (!File.Exists(metaPath) || !File.Exists(contentPath)) return null;

        var metaJson = File.ReadAllText(metaPath);
        var post = JsonSerializer.Deserialize<Post>(metaJson);

        var markdown = File.ReadAllText(contentPath);
        post!.HtmlContent = Markdown.ToHtml(markdown);

        return post;
    }
}
