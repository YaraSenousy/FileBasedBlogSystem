using Microsoft.AspNetCore.Http;
using FileBlogSystem.Features.Posting;

namespace FileBlogSystem.Features.Render.Posts;

public static class GetPosts
{
    public static void MapHomePageEndpoints(this WebApplication app)
    {
        app.MapGet("/", GetHomePage);
        app.MapGet("/drafts", GetDrafts);
        app.MapGet("/scheduled", GetScheduled);
    }
    /*
    Handles getting the home page
    Reads all published posts and filter by tags
    paginates them, and returns posts ordered by publish time as JSON.
    */
    public static IResult GetHomePage(HttpContext context)
    {
        return GetAllPosts(context, "published");
    }

    /*
    Handles getting draft posts
    Reads all draft posts and filter by tags
    paginates them, and returns posts ordered by publish time as JSON.
    */

    public static IResult GetDrafts(HttpContext context)
    {
        return GetAllPosts(context, "draft");
    }

    /*
    Handles getting the scheduled posts
    Reads all scheduled posts and filter by tags
    paginates them, and returns posts ordered by publish time as JSON.
    */
    public static IResult GetScheduled(HttpContext context)
    {
        return GetAllPosts(context, "scheduled");
    }

    public static IResult GetAllPosts(HttpContext context, string postType)
    {
        var page = int.TryParse(context.Request.Query["page"], out var p) ? p : 1;
        var limit = int.TryParse(context.Request.Query["limit"], out var l) ? l : 5;

        var selectedTags = context.Request.Query["tags"].ToString()
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var postsDir = Path.Combine(Directory.GetCurrentDirectory(), "content", "posts");
        if (!Directory.Exists(postsDir))
            return Results.Problem("Posts folder missing", statusCode: 500);

        var allPosts = Directory
            .GetDirectories(postsDir)
            .Select(folder => PostReader.ReadPostFromFolder(folder))
            .Where(p => p != null && p.Status == postType)
            .OrderByDescending(p => p!.Published)
            .ToList();

        if (selectedTags.Count > 0)
        {
            allPosts = allPosts
                .Where(p => p!.Tags != null && selectedTags.All(tag => p.Tags.Contains(tag)))
                .ToList();
        }

        var paged = allPosts
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();

        return Results.Ok(paged);
    }

}
