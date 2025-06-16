using System.Text.Json;

namespace FileBlogSystem.Features.Posting;

public static class CreatePost
{
    public static void MapPostCreationEndpoint(this WebApplication app)
    {
        app.MapPost("/posts", HandleCreatePost).RequireAuthorization("AdminAuthor");
    }

    /*
    Handles creating a new post
    generated a new slug using the post's title and creates a new folder for the post
    ensures no duplicate titles and takes content as markdown
    sets status to draft and publish date to now
    return the generated slug
    */
    public static async Task<IResult> HandleCreatePost(HttpRequest request)
    {
        var form = await request.ReadFormAsync();
        var title = form["title"];
        var description = form["description"];
        var categories = form["categories"].ToString().Split(',', StringSplitOptions.RemoveEmptyEntries);
        var tags = form["tags"].ToString().Split(',', StringSplitOptions.RemoveEmptyEntries);
        var content = form["content"];
        var status = "draft";
        var publishDate = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Utc);

        if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(description) || string.IsNullOrEmpty(content))
        {
            return Results.BadRequest("Post data incomplete");
        }
        var slug = SlugGenerator.GenerateSlug(title!, publishDate);

        var folderName = $"{slug}";
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
            Categories = categories.ToList()
        };

        var metaJson = JsonSerializer.Serialize(meta, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        await File.WriteAllTextAsync(Path.Combine(postPath, "meta.json"), metaJson);
        await File.WriteAllTextAsync(Path.Combine(postPath, "content.md"), content!);

        return Results.Created($"/posts/{slug}", new { slug });
    }
}
