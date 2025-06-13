using FileBlogSystem.Features.Posting;

namespace FileBlogSystem.Features.Render.PostDetails;

public static class GetPostBySlug
{
    public static void MapPostDetailsEndpoint(this WebApplication app)
    {
        app.MapGet("/posts/{slug}", HandleGetPostBySlug);
    }

    public static IResult HandleGetPostBySlug(string slug)
    {
        var path = Path.Combine("content", "posts");
        var folder = Directory.GetDirectories(path)
            .FirstOrDefault(d => Path.GetFileName(d).EndsWith(slug, StringComparison.OrdinalIgnoreCase));

        if (folder == null)
            return Results.NotFound("Post not found");

        var post = PostReader.ReadPostFromFolder(folder);
        return post != null ? Results.Ok(post) : Results.NotFound("Invalid post data");
    }
}
