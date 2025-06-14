using FileBlogSystem.Features.Posting;

namespace FileBlogSystem.Features.Render.PostDetails;

public static class GetPostBySlug
{
    public static void MapPostDetailsEndpoint(this WebApplication app)
    {
        app.MapGet("/posts/{slug}", HandleGetPostBySlug);
    }

    public static IResult HandleGetPostBySlug(string slug, HttpRequest req)
    {
        var previewMode = req.Query.ContainsKey("preview") && req.Query["preview"] == "true";

        var folder = Directory.GetDirectories("content/posts")
            .FirstOrDefault(d => d.EndsWith(slug, StringComparison.OrdinalIgnoreCase));

        if (folder == null) return Results.NotFound();

        var post = PostReader.ReadPostFromFolder(folder);
        if (post == null) return Results.NotFound();

        if (!previewMode && (!string.Equals(post.Status, "published", StringComparison.OrdinalIgnoreCase) || post.Published > DateTime.UtcNow))
            return Results.NotFound(); 

        return Results.Ok(post);
    }

}
