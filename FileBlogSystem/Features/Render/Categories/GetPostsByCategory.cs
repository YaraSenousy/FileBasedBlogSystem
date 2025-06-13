namespace FileBlogSystem.Features.Render.HomePage;

public static class GetPostsByCategory
{
    public static void MapCategoryPostsEndpoint(this WebApplication app)
    {
        app.MapGet("/categories/{slug}", GetByCategory);
    }

    /*
    Handles getting the posts by category
    Reads posts that contain the categories slug
    filter by the tags
    paginates them, and returns posts ordered by publish time as JSON.
    */
    public static IResult GetByCategory(HttpContext context, string slug)
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
            .Where(p => p != null && p!.Categories?.Contains(slug, StringComparer.OrdinalIgnoreCase) == true)
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
