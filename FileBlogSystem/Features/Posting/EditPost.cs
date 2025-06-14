using System.Text.Json;

namespace FileBlogSystem.Features.Posting;

public static class EditPost
{
    public static void MapPostEditEndpoint(this WebApplication app)
    {
        app.MapPost("/posts/{slug}/edit", HandleEditPost);
    }

    //Handles editing the posts
    public static async Task<IResult> HandleEditPost(HttpRequest request, string slug)
    {
        var form = await request.ReadFormAsync();
        var folder = Directory.GetDirectories("content/posts")
            .FirstOrDefault(d => d.EndsWith(slug, StringComparison.OrdinalIgnoreCase));
        if (folder == null) return Results.NotFound();

        var metaPath = Path.Combine(folder, "meta.json");
        var contentPath = Path.Combine(folder, "content.md");

        var meta = JsonSerializer.Deserialize<PostMeta>(File.ReadAllText(metaPath));
        if (meta == null) return Results.BadRequest();

        meta.Title = form["title"];
        meta.Description = form["description"];
        meta.Tags = form["tags"].ToString().Split(',').Select(x => x.Trim()).ToList();
        meta.Categories = form["categories"].ToString().Split(',').Select(x => x.Trim()).ToList();
        meta.ModificationDate = DateTime.Now;

        var markdown = form["content"];
        File.WriteAllText(metaPath, JsonSerializer.Serialize(meta, new JsonSerializerOptions { WriteIndented = true }));
        File.WriteAllText(contentPath, markdown);

        return Results.Ok();
    }
}