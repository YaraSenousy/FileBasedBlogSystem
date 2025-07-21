using System.Text.Json;
using FileBlogSystem.Features.Posting;
using FileBlogSystem.Features.Security;

namespace FileBlogSystem.Features.Render.UserFunctions;

public static class UserPosts
{
    public static void MapUserPostsEndpoint(this WebApplication app)
    {
        app.MapGet("/user-posts", GetUserPosts);
        app.MapGet("/users/{username}/posts", GetPublishedUserPosts);
        app.MapGet("/users/profile/{username}", GetUserProfile);
    }

    /*
    Handles reading user profile given the user folder
    */
    public static User? ReadUserFromFolder(string userDir)
    {
        var profilePath = Path.Combine(userDir, "profile.json");
        if (!File.Exists(profilePath))
            return null;

        try
        {
            var profileJson = File.ReadAllText(profilePath);
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

            var user = JsonSerializer.Deserialize<User>(profileJson, options);
            user!.PasswordHash = string.Empty;
            return user;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ReadUserFromFolder] Error reading {profilePath}: {ex.Message}");
            return null;
        }
    }

    /*
    Handles getting the current user's profile
    Returns: username, name, email, role, profile picture
    */
    public static IResult GetUserProfile(HttpContext context, string username)
    {
        var userDir = Path.Combine(Directory.GetCurrentDirectory(), "content", "users", username);
        var user = ReadUserFromFolder(userDir);
        if (user == null)
            return Results.NotFound("User not found");

        return Results.Ok(user);
    }

    /*
  Handles getting published posts created or modified by a specific user
  Returns: list of posts with pagination
  */
    public static IResult GetPublishedUserPosts(HttpContext context, string username)
    {
        var postsDir = Path.Combine(Directory.GetCurrentDirectory(), "content", "posts");
        if (!Directory.Exists(postsDir))
            return Results.Problem("Posts folder missing", statusCode: 500);

        var page = int.TryParse(context.Request.Query["page"], out var p) ? p : 1;
        var limit = int.TryParse(context.Request.Query["limit"], out var l) ? l : 3;
        var searchQuery = context.Request.Query["q"].ToString().ToLower();

        var allPosts = Directory
            .GetDirectories(postsDir)
            .Select(folder => PostReader.ReadPostFromFolder(folder))
            .Where(p => p != null && (p!.CreatedBy == username|| p!.ModifiedBy == username) && p!.Status == "published")
            .OrderByDescending(p => p!.Published)
            .ToList();
        var posts = allPosts
            .Where(p => p!.Title.Contains(searchQuery, StringComparison.OrdinalIgnoreCase)
                || p.Description.Contains(searchQuery, StringComparison.OrdinalIgnoreCase)
                || p.HtmlContent.Contains(searchQuery, StringComparison.OrdinalIgnoreCase)
                || p.CreatedBy.Contains(searchQuery, StringComparison.OrdinalIgnoreCase))
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();
        var totalItems = posts.Count;

        return Results.Ok(new { data = posts, totalItems });
    }

    /*
    Handles getting the posts by username
    paginates them, and returns posts ordered by publish time as JSON.
    */
    public static IResult GetUserPosts(HttpRequest request, HttpContext context)
    {
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

        return Results.Ok(allPosts);
    }
}
