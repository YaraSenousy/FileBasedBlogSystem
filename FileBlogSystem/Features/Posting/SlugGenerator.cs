using System.Text;
using System.Text.RegularExpressions;

namespace FileBlogSystem.Features.Posting;

public static class SlugGenerator
{
    /// Converts a string into a kebab-case slug
    public static string GenerateSlug(string title, DateTime published)
    {
        title = title.ToLowerInvariant();
        title = Regex.Replace(title, @"[^a-z0-9\s-]", "");
        title = Regex.Replace(title, @"[\s-]+", " ").Trim();
        var slug = title.Replace(" ", "-");
        return $"{published:yyyy-MM-dd}-{slug}";
    }
}
