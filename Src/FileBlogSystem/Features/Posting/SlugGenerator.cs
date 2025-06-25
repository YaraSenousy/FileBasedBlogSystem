using System.Text.RegularExpressions;

namespace FileBlogSystem.Features.Posting;

public static class SlugGenerator
{
    // Convert title to kebab-case
    public static string ToSlug(string title)
    {
        var slug = Regex.Replace(title.ToLowerInvariant(), @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"[\s-]+", "-").Trim('-');
        return slug;
    }

    // Ensure the slug is unique among /content/posts by adding - + number of posts with same title
    public static string EnsureUniqueSlug(string baseSlug)
    {
        var root = Path.Combine("content", "posts");
        var slug = baseSlug;
        var counter = 1;

        var existing = Directory.GetDirectories(root)
            .Select(d => Path.GetFileName(d)?.Split('-', 4).Last()?.ToLowerInvariant())
            .ToHashSet();

        while (existing.Contains(slug))
        {
            slug = $"{baseSlug}-{counter++}";
        }

        return slug;
    }
    public static string GenerateSlug(string title)
    {
        var baseSlug = ToSlug(title);
        return EnsureUniqueSlug(baseSlug);
    }
}
