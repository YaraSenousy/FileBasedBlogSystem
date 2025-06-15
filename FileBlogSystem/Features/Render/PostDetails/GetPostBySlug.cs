using FileBlogSystem.Features.Posting;

namespace FileBlogSystem.Features.Render.PostDetails;


public static class GetPostBySlug
{
    public static void MapPostDetailsEndpoint(this WebApplication app)
    {
        // Public view — only published
        app.MapGet("/posts/{slug}", PublicView);

        // Preview — secured
        app.MapGet("/posts/{slug}/preview", SecurePreviewView)
           .RequireAuthorization("EditorLevel");
    }

    private static IResult PublicView(string slug)
    {
        var folder = Directory.GetDirectories("content/posts")
            .FirstOrDefault(d => d.EndsWith(slug, StringComparison.OrdinalIgnoreCase));
        if (folder == null) return Results.NotFound();

        var post = PostReader.ReadPostFromFolder(folder);
        if (post == null || post.Status != "published") return Results.NotFound();

        return Results.Ok(post);
    }

    private static IResult SecurePreviewView(string slug)
    {
        var folder = Directory.GetDirectories("content/posts")
            .FirstOrDefault(d => d.EndsWith(slug, StringComparison.OrdinalIgnoreCase));
        if (folder == null) return Results.NotFound();

        var post = PostReader.ReadPostFromFolder(folder);
        if (post == null) return Results.NotFound();

        return Results.Ok(post);
    }
}