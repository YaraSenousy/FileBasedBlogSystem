using System.Security.Claims;
using System.Text.Json;
using FileBlogSystem.Features.Posting;
using Microsoft.AspNetCore.Http;

namespace FileBlogSystem.Features.Render.Posts;

public static class GetPosts
{
    public static void MapGetPostsEndpoints(this WebApplication app)
    {
        app.MapGet("/published", GetPublished);
        app.MapGet("/drafts", (Delegate)GetDrafts).RequireAuthorization("EditorLevel");
        app.MapGet("/scheduled", (Delegate)GetScheduled).RequireAuthorization("EditorLevel");
    }

    /*
    Handles getting the home page
    Reads all published posts and filter by tags
    paginates them, and returns posts ordered by publish time as JSON.
    */
    public static IResult GetPublished(HttpContext context)
    {
        return GetAllPosts(context, "published", false);
    }

    /*
    Handles getting draft posts
    Reads all draft posts and filter by tags
    paginates them, and returns posts ordered by publish time as JSON.
    only allow the owner's blogs or assigned author's blogs
    */

    public static async Task<IResult> GetDrafts(HttpContext context)
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
        {
            var editorDir = Path.Combine("content", "users", username);
            var editorPath = Path.Combine(editorDir, "profile.json");
            if (!File.Exists(editorPath))
                return Results.NotFound("Editor not found.");

            var editorJson = await File.ReadAllTextAsync(editorPath);
            var editor = JsonSerializer.Deserialize<User>(editorJson);
            if (editor != null && editor.AssignedAuthor != null)
                return GetAllPosts(context, "draft", true, editor.AssignedAuthor);
            else
                return Results.Ok();
        }
    }

    /*
    Handles getting the scheduled posts
    Reads all scheduled posts and filter by tags
    paginates them, and returns posts ordered by publish time as JSON.
    only allow the blogs' owner or assigned author's to editors or admins
    */
    public static async Task<IResult> GetScheduled(HttpContext context)
    {
        var username = context.User.Identity?.Name;
        var role = context.User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(role))
        {
            return Results.Unauthorized();
        }

        if (role != "author")
            return GetAllPosts(context, "scheduled", true, username);
        else if (role == "editor")
        {
            var editorDir = Path.Combine("content", "users", username);
            var editorPath = Path.Combine(editorDir, "profile.json");
            if (!File.Exists(editorPath))
                return Results.NotFound("Editor not found.");

            var editorJson = await File.ReadAllTextAsync(editorPath);
            var editor = JsonSerializer.Deserialize<User>(editorJson);
            if (editor != null && editor.AssignedAuthor != null)
                return GetAllPosts(context, "scheduled", true, editor.AssignedAuthor);
            else
                return Results.Ok();
        }
        else
            return GetAllPosts(context, "scheduled", false);
    }

    public static IResult GetAllPosts(
        HttpContext context,
        string postType,
        bool restrictToOwners,
        string username = ""
    )
    {
        var page = int.TryParse(context.Request.Query["page"], out var p) ? p : 1;
        var limit = int.TryParse(context.Request.Query["limit"], out var l) ? l : 5;

        var selectedTags = context
            .Request.Query["tags"]
            .ToString()
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
            allPosts = allPosts.Where(p => p!.CreatedBy == username).ToList();
        }

        var totalItems = allPosts.Count;
        var paged = allPosts.Skip((page - 1) * limit).Take(limit).ToList();

        return Results.Ok(new { data = paged, totalItems });
    }
}
