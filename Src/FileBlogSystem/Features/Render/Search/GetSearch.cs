using FileBlogSystem.Features.Posting;

namespace FileBlogSystem.Features.Render.Search;

public static class GetSearch
{
    public static void MapSearchEndpoint(this WebApplication app)
    {
        app.MapGet("/search", HandleSearch);
    }

    /*
    GET /search?q=term&page=1&limit=5
    Handles searching publshed posts by title, description, or content
    paginates them, and returns posts ordered by publish time as JSON.
    */
    public static IResult HandleSearch(HttpContext context)
    {
        var q = context.Request.Query["q"].ToString();
        if (string.IsNullOrWhiteSpace(q))
            return Results.BadRequest("Missing search term");

        var page = int.TryParse(context.Request.Query["page"], out var p) ? p : 1;
        var limit = int.TryParse(context.Request.Query["limit"], out var l) ? l : 5;

        var postDirs = Directory.GetDirectories("content/posts");

        var posts = postDirs
            .Select(PostReader.ReadPostFromFolder)
            .Where(p => p != null && p.Status == "published")
            .Where(p =>
                p!.Title.Contains(q, StringComparison.OrdinalIgnoreCase)
                || p.Description.Contains(q, StringComparison.OrdinalIgnoreCase)
                || p.HtmlContent.Contains(q, StringComparison.OrdinalIgnoreCase)
                || p.CreatedBy.Contains(q, StringComparison.OrdinalIgnoreCase)
            )
            .OrderByDescending(p => p!.Published)
            .ToList();

        var totalItems = posts.Count;
        var paged = posts.Skip((page - 1) * limit).Take(limit).ToList();
        return Results.Ok(new { data = paged, totalItems });
    }
}
