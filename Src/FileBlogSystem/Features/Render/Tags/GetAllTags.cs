using System.Text.Json;
namespace FileBlogSystem.Features.Render.Tags;

public static class GetAllTags
{
    // Returns a list of all available tags from /content/tags
    public static void MapTagListEndpoint(this WebApplication app)
    {
        app.MapGet("tags", GetTags);
    }

    public static IResult GetTags()
    {
        var path = Path.Combine(Directory.GetCurrentDirectory(), "content", "tags");

        if (!Directory.Exists(path))
            return Results.Problem("Tags directory missing", statusCode: 500);

        var tags = Directory.GetFiles(path, "*.json")
            .Select(file =>
            {
                var json = File.ReadAllText(file);
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                return JsonSerializer.Deserialize<Tag>(json, options);
            })
            .Where(t => t != null)
            .OrderBy(t => t!.Name)
            .ToList();

        return Results.Ok(tags);
    }
}
