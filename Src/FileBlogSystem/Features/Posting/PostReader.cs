using Markdig;
using System.Text.Json;
using FileBlogSystem.config;

namespace FileBlogSystem.Features.Posting;

public static class PostReader
{
    /*
    Reads a single post from a folder by loading and parsing `meta.json` and `content.md`.
    Converts markdown to HTML. by taking absolute path to the post folder
    returns Post object if valid, otherwise null
    */
    public static Post? ReadPostFromFolder(string folderPath)
    {
        var metaPath = Path.Combine(folderPath, "meta.json");
        var contentPath = Path.Combine(folderPath, "content.md");

        if (!File.Exists(metaPath) || !File.Exists(contentPath)) return null;

        try
        {
            var metaJson = File.ReadAllText(metaPath);
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var post = JsonSerializer.Deserialize<Post>(metaJson, options);

            var markdown = File.ReadAllText(contentPath);
            post!.RawMarkdown = markdown;
            post!.HtmlContent = Markdown.ToHtml(markdown);

            var assetsPath = Path.Combine(folderPath, "assets");
            if (Directory.Exists(assetsPath))
            {
                var contentRoot = Path.GetFullPath("content").Replace('\\', '/');
                var mediaFiles = Directory.GetFiles(assetsPath)
                .Select(fullPath => Path.GetRelativePath("content", fullPath).Replace('\\', '/'))
                .Select(rel => $"/content/{rel}")
                .ToList();

                post.MediaUrls = mediaFiles;
            }

            return post;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ReadPostFromFolder] Error reading {folderPath}: {ex.Message}");
            return null;
        }
    }

    /*
    returns the folder path of a post using route mapper
    */
    public static string? FindPostFolder(string slug)
    {
        var resolved = RouteMapper.ResolveSlug(slug);
        if (resolved == null) return null;

        var folder = Path.Combine("content", "posts", resolved);
        return Directory.Exists(folder) ? folder : null;
    }
}
