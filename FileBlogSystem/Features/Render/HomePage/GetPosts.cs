using Microsoft.AspNetCore.Http;

namespace FileBlogSystem.Features.Render.HomePage;

public static class GetPosts
{
    public static void MapHomePageEndpoints(this WebApplication app)
    {
        app.MapGet("/", GetHomePage);
    }
    /*
    Handles getting the home page
    Reads all posts, paginates them, and returns posts ordered by publish time as JSON.
    */
    public static IResult GetHomePage(HttpContext context)
    {
        var page = int.TryParse(context.Request.Query["page"], out var p) ? p : 1;
        var limit = int.TryParse(context.Request.Query["limit"], out var l) ? l : 5;

        var postDirs = Directory.GetDirectories("content/posts");

        var allPosts = postDirs
            .Select(folder => PostReader.ReadPostFromFolder(folder))
            .Where(p => p != null)
            .OrderByDescending(p => p!.Published)
            .ToList();

        var paged = allPosts
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();

        return Results.Ok(paged);
    }
}
