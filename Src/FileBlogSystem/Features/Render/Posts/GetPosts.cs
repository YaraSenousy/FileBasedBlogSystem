using Microsoft.AspNetCore.Http;
using FileBlogSystem.Features.Posting;
using System.Security.Claims;


namespace FileBlogSystem.Features.Render.Posts;

public static class GetPosts
{
    public static void MapGetPostsEndpoints(this WebApplication app)
    {
        app.MapGet("/published", GetPublished);
        app.MapGet("/drafts", GetDrafts).RequireAuthorization("EditorLevel");
        app.MapGet("/scheduled", GetScheduled).RequireAuthorization("EditorLevel");
    }
    /*
    Handles getting the home page
    Reads all published posts and filter by tags
    paginates them, and returns posts ordered by publish time as JSON.
    */
    public static IResult GetPublished(HttpContext context)
    {
        return GetAllPosts(context, "published",false);
    }

    /*
    Handles getting draft posts
    Reads all draft posts and filter by tags
    paginates them, and returns posts ordered by publish time as JSON.
    only allow the blogs' owner or editors
    */

    public static IResult GetDrafts(HttpContext context)
    {
        var username = context.User.Identity?.Name;
        var role = context.User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(role))
        {
            return Results.Unauthorized();
        }

        if (role != "editor")
            return GetAllPosts(context, "draft", true, username);
        else
            return GetAllPosts(context, "draft", false);
    }

    /*
    Handles getting the scheduled posts
    Reads all scheduled posts and filter by tags
    paginates them, and returns posts ordered by publish time as JSON.
    only allow the blogs' owner or editors or admins
    */
    public static IResult GetScheduled(HttpContext context)
    {
        var username = context.User.Identity?.Name;
        var role = context.User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(role))
        {
            return Results.Unauthorized();
        }

        if (role != "editor" && role != "admin")
            return GetAllPosts(context, "scheduled", true, username);
        else
            return GetAllPosts(context, "scheduled", false);
    }

    public static IResult GetAllPosts(HttpContext context, string postType, bool restrictToOwners, string username = "")
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

        if (restrictToOwners)
        {
            allPosts = allPosts
                .Where(p => p!.CreatedBy == username)
                .ToList();
        }

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
