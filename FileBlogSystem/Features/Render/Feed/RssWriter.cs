using System.Text;
using FileBlogSystem.Features.Posting;

namespace FileBlogSystem.Features.Render.Feed;

public static class RssWriter
{
    public static string GenerateRssXml(string baseUrl)
    {
        var postDir = Path.Combine(Directory.GetCurrentDirectory(), "content", "posts");

        var posts = Directory.GetDirectories(postDir)
            .Select(PostReader.ReadPostFromFolder)
            .Where(p => p != null && p.Status == "published" && p.Published <= DateTime.Now)
            .OrderByDescending(p => p.Published)
            .ToList();

        var rss = new StringBuilder();
        rss.AppendLine(@"<?xml version=""1.0"" encoding=""utf-8"" ?>");
        rss.AppendLine(@"<rss version=""2.0"">");
        rss.AppendLine(@"<channel>");
        rss.AppendLine($"<title>File Blog</title>");
        rss.AppendLine($"<link>{baseUrl}</link>");
        rss.AppendLine($"<description>Latest blog posts</description>");

        foreach (var post in posts)
        {
            rss.AppendLine("<item>");
            rss.AppendLine($"  <title>{System.Security.SecurityElement.Escape(post.Title)}</title>");
            rss.AppendLine($"  <link>{baseUrl}/post.html?slug={post.Slug}</link>");
            rss.AppendLine($"  <pubDate>{post.Published:R}</pubDate>");
            rss.AppendLine($"  <description>{System.Security.SecurityElement.Escape(post.Description)}</description>");
            rss.AppendLine("</item>");
        }

        rss.AppendLine("</channel>");
        rss.AppendLine("</rss>");

        return rss.ToString();
    }

    public static void WriteRssFile(string baseUrl)
    {
        var xml = GenerateRssXml(baseUrl);
        File.WriteAllText(Path.Combine("content", "rss.xml"), xml, Encoding.UTF8);
    }
}
