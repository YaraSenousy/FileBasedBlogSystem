using System.Text.Json;
using Microsoft.Extensions.Primitives;

namespace FileBlogSystem.Features.Posting;

public static class EditPost
{
    public static void MapPostEditEndpoint(this WebApplication app)
    {
        app.MapPost("/posts/{slug}/edit", HandleEditPost).RequireAuthorization("EditorLevel");
    }

    /*
    Handles editing a post
    searching for a post using its slug
    rewrting its content and meta data 
    edits the modification date
    */
    public static async Task<IResult> HandleEditPost(HttpRequest request, string slug)
    {
        var form = await request.ReadFormAsync();
        if (form == null) return Results.BadRequest();

        var folder = PostReader.FindPostFolder(slug);
        if (folder == null) return Results.NotFound();

        var metaPath = Path.Combine(folder, "meta.json");
        var contentPath = Path.Combine(folder, "content.md");

        var meta = JsonSerializer.Deserialize<PostMeta>(File.ReadAllText(metaPath));
        if (meta == null) return Results.BadRequest();

        var title = form["title"];
        var description = form["description"];
        var categories = form["categories"].ToString().Split(',', StringSplitOptions.RemoveEmptyEntries);
        var tags = form["tags"].ToString().Split(',', StringSplitOptions.RemoveEmptyEntries);
        var content = form["content"];
        if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(description) || string.IsNullOrEmpty(content))
        {
            return Results.BadRequest("Post data incomplete");
        }

        meta.Title = title!;
        meta.Description = description!;
        meta.Tags = tags.ToList();
        meta.Categories = categories.ToList();
        meta.Modified = DateTime.Now;

        var markdown = form["content"];
        File.WriteAllText(metaPath, JsonSerializer.Serialize(meta, new JsonSerializerOptions { WriteIndented = true }));
        File.WriteAllText(contentPath, markdown);

        return Results.Created($"/posts/{slug}", new { slug });
    }
}