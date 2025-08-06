using System.Text.Json;
using FileBlogSystem.config;
using Ganss.Xss;

namespace FileBlogSystem.Features.Posting;

public static class CreatePost
{
    public static void MapPostCreationEndpoint(this WebApplication app)
    {
        app.MapPost("/posts", HandleCreatePost)
            .RequireAuthorization("AdminAuthor")
            .RequireRateLimiting("login");
    }

    /*
    Handles creating a new post
    generated a new slug using the post's title
    creates a new folder for the post and adds its route in routes.json
    ensures no duplicate titles and takes content as markdown
    sets status to draft and publish date to now
    return the generated slug
    */
    public static async Task<IResult> HandleCreatePost(HttpRequest request, HttpContext context)
    {
        var username = context.User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Results.Unauthorized();

        var form = await request.ReadFormAsync();
        var title = new HtmlSanitizer().Sanitize(form["title"].ToString());
        var description = new HtmlSanitizer().Sanitize(form["description"].ToString());
        var categories = form["categories"]
            .ToString()
            .Split(',', StringSplitOptions.RemoveEmptyEntries);
        var tags = form["tags"].ToString().Split(',', StringSplitOptions.RemoveEmptyEntries);
        var content = form["content"];
        var status = "draft";
        var publishDate = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);

        if (
            string.IsNullOrEmpty(title)
            || string.IsNullOrEmpty(description)
            || string.IsNullOrEmpty(content)
        )
            return Results.BadRequest("Post data incomplete");

        foreach (var category in categories)
        {
            var categoryPath = Path.Combine("content", "categories", $"{category}.json");
            if (!File.Exists(categoryPath))
                return Results.BadRequest($"Invalid category: {category}");
        }

        foreach (var tag in tags)
        {
            var tagPath = Path.Combine("content", "tags", $"{tag}.json");
            if (!File.Exists(tagPath))
                return Results.BadRequest($"Invalid tag: {tag}");
        }

        var slug = SlugGenerator.GenerateSlug(title!);
        var folderName = $"{publishDate:yyyy-MM-dd}-{slug}";
        var postPath = Path.Combine("content", "posts", folderName);
        Directory.CreateDirectory(postPath);

        var meta = new PostMeta
        {
            Title = title!,
            Description = description!,
            Slug = slug,
            Status = status!,
            Published = publishDate,
            Tags = tags.ToList(),
            Categories = categories.ToList(),
            CreatedBy = username,
        };

        var metaJson = JsonSerializer.Serialize(
            meta,
            new JsonSerializerOptions { WriteIndented = true }
        );

        await File.WriteAllTextAsync(Path.Combine(postPath, "meta.json"), metaJson);
        await File.WriteAllTextAsync(Path.Combine(postPath, "content.md"), content!);
        RouteMapper.AddRoute(slug, folderName);

        return Results.Created($"/posts/{slug}", new { slug });
    }
}
