using FileBlogSystem.Features.Posting;

namespace FileBlogSystem.Features.Render.User;

public static class UserPosts
{
    public static void MapUserPostsEndpoint(this WebApplication app)
    {
        app.MapGet("/my-posts", GetUserPosts);
    }

    /*
    Handles getting the posts by username
    paginates them, and returns posts ordered by publish time as JSON.
    */
    public static IResult GetUserPosts(HttpRequest request, HttpContext context)
    {
        var page = int.TryParse(context.Request.Query["page"], out var p) ? p : 1;
        var limit = int.TryParse(context.Request.Query["limit"], out var l) ? l : 5;

        var username = context.User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Results.Unauthorized();

        var postsDir = Path.Combine(Directory.GetCurrentDirectory(), "content", "posts");
        if (!Directory.Exists(postsDir))
            return Results.Problem("Posts folder missing", statusCode: 500);

        var allPosts = Directory
            .GetDirectories(postsDir)
            .Select(folder => PostReader.ReadPostFromFolder(folder))
            .Where(p => p != null && p!.CreatedBy == username)
            .OrderByDescending(p => p!.Published)
            .ToList();

        var totalItems = allPosts.Count;
        var paged = allPosts
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();
        return Results.Ok(new
        {
            data = paged,
            totalItems
        });
    }
}
