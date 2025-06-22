using System.Text.Json;
using FileBlogSystem.Features.Security;
using FileBlogSystem.Features.Render.Tags;
using FileBlogSystem.Features.Posting;
using FileBlogSystem.Features.Render.Categories;

namespace FileBlogSystem.Features.Admin;

public static class AdminFunctions
{
    public static void MapAdminEndPoint(this WebApplication app)
    {
        app.MapPost("/admin/users", AddUser).RequireAuthorization("AdminLevel");
        app.MapPost("/admin/tags", AddTag).RequireAuthorization("AdminLevel");
        app.MapPost("/admin/cateories", AddCategory).RequireAuthorization("AdminLevel");
    }

    /*
    handles adding a new user by taking username and password
    create slug from the username and make sure it is unique 
    and stores the password hashed
    */
    public static async Task<IResult> AddUser(HttpRequest request)
    {
        var form = await request.ReadFormAsync();
        var username = form["username"];
        var password = form["password"];
        var roles = form["roles"].ToString().Split(',', StringSplitOptions.RemoveEmptyEntries);

        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password) || roles.Length == 0)
            return Results.BadRequest("User data incomplete");

        var userPath = Path.Combine("content", "users", username!, "profile.json");
        if (File.Exists(userPath)) return Results.BadRequest("Username already used");

        var hash = BCrypt.Net.BCrypt.HashPassword(password);

        var user = new User
        {
            Username = username!,
            PasswordHash = hash!,
            Roles = roles.ToList(),
        };

        var userJson = JsonSerializer.Serialize(user, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        await File.WriteAllTextAsync(Path.Combine(userPath, "profile.json"), userJson);
        return Results.Ok();
    }

    /*
    handles adding a new tag by taking tag name
    create slug from the name and make sure it is unique 
    */
    public static async Task<IResult> AddTag(HttpRequest request)
    {
        var form = await request.ReadFormAsync();
        var tagName = form["name"];

        if (string.IsNullOrEmpty(tagName))
            return Results.BadRequest("Tag data incomplete");

        var slug = SlugGenerator.ToSlug(tagName!);

        var tagPath = Path.Combine("content", "tags", slug!, $"{slug}.json");
        if (File.Exists(tagPath)) return Results.BadRequest("Tag already exists");

        var tag = new Tag
        {
            Name = tagName!,
            Slug = slug!,
        };

        var tagJson = JsonSerializer.Serialize(tag, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        await File.WriteAllTextAsync(Path.Combine(tagPath, $"{slug}.json"), tagJson);
        return Results.Ok();
    }

    /*
    handles adding a new category by taking category name and description (optional)
    create slug from the name and make sure it is unique 
    */
    public static async Task<IResult> AddCategory(HttpRequest request)
    {
        var form = await request.ReadFormAsync();
        var categoryName = form["name"];
        var description = form["description"];

        if (string.IsNullOrEmpty(categoryName))
            return Results.BadRequest("Category data incomplete");

        var slug = SlugGenerator.ToSlug(categoryName!);

        var categoryPath = Path.Combine("content", "categories", slug!, $"{slug}.json");
        if (File.Exists(categoryPath)) return Results.BadRequest("Category already exists");

        var category = new Category
        {
            Name = categoryName!,
            Slug = slug!,
            Description = description,
        };

        var categoryJson = JsonSerializer.Serialize(category, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        await File.WriteAllTextAsync(Path.Combine(categoryPath, $"{slug}.json"), categoryJson);
        return Results.Ok();
    }
}