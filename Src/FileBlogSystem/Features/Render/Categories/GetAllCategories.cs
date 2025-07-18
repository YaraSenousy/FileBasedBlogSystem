using System.Text.Json;
namespace FileBlogSystem.Features.Render.Categories;

public static class GetAllCategories
{
    public static void MapCategoryListEndpoint(this WebApplication app)
    {
        app.MapGet("/categories", GetCategories);
    }

    // Returns a list of all available categories from /content/categories
    public static IResult GetCategories()
    {
        var path = Path.Combine(Directory.GetCurrentDirectory(), "content", "categories");
        if (!Directory.Exists(path))
            return Results.Problem("Categories directory missing", statusCode: 500);

        var categories = Directory.GetFiles(path, "*.json")
            .Select(categoryFile =>
            {
                var categoryJson = File.ReadAllText(categoryFile);
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                return JsonSerializer.Deserialize<Category>(categoryJson, options);
            })
            .Where(c => c != null)
            .OrderBy(c => c!.Name)
            .ToList();

        return Results.Ok(categories);
    }
}
