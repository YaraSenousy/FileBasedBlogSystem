using System.Text.Json;
using System.Text.RegularExpressions;
using FileBlogSystem.Features.Security;
using FileBlogSystem.Features.Render.Tags;
using FileBlogSystem.Features.Posting;
using FileBlogSystem.Features.Render.Categories;

namespace FileBlogSystem.Features.Admin;

public static class AdminFunctions
{
    public static void MapAdminEndPoint(this WebApplication app)
    {
        app.MapGet("/admin/users", GetUsers).RequireAuthorization("AdminLevel");
        app.MapPost("/admin/users", AddUser).RequireAuthorization("AdminLevel");
        app.MapPatch("/admin/users/{user}", EditUser).RequireAuthorization("AdminLevel");
        app.MapDelete("/admin/users/{user}", DeleteUser).RequireAuthorization("AdminLevel");
        app.MapPost("/admin/tags", AddTag).RequireAuthorization("AdminLevel");
        app.MapPost("/admin/categories", AddCategory).RequireAuthorization("AdminLevel");
    }

    /*
    handles getting users info
    returns for each user: username, name, role
    */
    public static IResult GetUsers(HttpRequest request)
    {
        var usersDir = Path.Combine(Directory.GetCurrentDirectory(), "content", "users");
        if (!Directory.Exists(usersDir))
            return Results.Problem("Users folder missing", statusCode: 500);

        var users = Directory
        .GetDirectories(usersDir)
        .Select(folder => ReadUserFromFolder(folder))
        .Where(u => u != null)
        .ToList();

        return Results.Ok(users);
    }

    /*
    handles reading user profile given the user folder
    */
    public static User? ReadUserFromFolder(string userDir)
    {
        var profilePath = Path.Combine(userDir, "profile.json");
        if (!File.Exists(profilePath)) return null;

        try
        {
            var profileJson = File.ReadAllText(profilePath);
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var user = JsonSerializer.Deserialize<User>(profileJson, options);
            user!.PasswordHash = string.Empty!;
            return user;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ReadUserFromFolder] Error reading {profilePath}: {ex.Message}");
            return null;
        }
    }

    /*
    Define the password policy:
    At least 8 characters, one uppercase, one lowercase, one digit.
    */
    public static bool IsValidPassword(string password)
    {

        string pattern = @"(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$";
        return Regex.IsMatch(password, pattern);
    }
    /*
    handles adding a new user by taking username and name and password
    create slug from the username and make sure it is unique 
    and stores the password hashed
    */
    public static async Task<IResult> AddUser(HttpRequest request)
    {
        var form = await request.ReadFormAsync();
        var username = form["username"];
        var password = form["password"];
        var name = form["name"];
        var role = form["role"];

        if (string.IsNullOrEmpty(username))
            return Results.BadRequest("Missing username");
        if (string.IsNullOrEmpty(password))
            return Results.BadRequest("Missing password");
        if (string.IsNullOrEmpty(name))
            return Results.BadRequest("Missing name");
        if (string.IsNullOrEmpty(role))
            return Results.BadRequest("Missing role");
        if (Regex.IsMatch(username!, @"[^a-z0-9\s-]"))
            return Results.BadRequest("Invalid Username: Small letters, digits and - only");
        if (!IsValidPassword(password!))
            return Results.BadRequest("Invalid Password: Must be at least 8 characters, one uppercase, one lowercase, one digit");
        if (role != "admin" && role != "author" && role != "editor")
            return Results.BadRequest("Invalid role");

        var userFolder = Path.Combine("content", "users", username!);
        var userPath = Path.Combine(userFolder, "profile.json");

        if (File.Exists(userPath)) return Results.BadRequest("Username already used");
        Directory.CreateDirectory(userFolder);

        var hash = BCrypt.Net.BCrypt.HashPassword(password);

        var user = new User
        {
            Username = username!,
            Name = name!,
            PasswordHash = hash!,
            Role = role!,
        };

        var userJson = JsonSerializer.Serialize(user, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        await File.WriteAllTextAsync(userPath, userJson);
        return Results.Ok();
    }

    /*
    handles editing a user by taking name, password or role
    make sure the user exists, validate the input and rewrite their file
    */
    public static async Task<IResult> EditUser(HttpRequest request, string user)
    {
        var form = await request.ReadFormAsync();
        if (form == null) return Results.BadRequest();
        var password = form["password"];
        var name = form["name"];
        var role = form["role"];

        var userPath = Path.Combine(Directory.GetCurrentDirectory(), "content", "users", user, "profile.json");
        if (!File.Exists(userPath)) return Results.BadRequest("User missing");

        if (!string.IsNullOrEmpty(password) && !IsValidPassword(password!))
            return Results.BadRequest("Invalid Password: Must be at least 8 characters, one uppercase, one lowercase, one digit");
        if (!string.IsNullOrEmpty(role) && role != "admin" && role != "author" && role != "editor")
            return Results.BadRequest("Invalid role");

        var oldUserJson = File.ReadAllText(userPath);
        var oldUserInfo = JsonSerializer.Deserialize<User>(oldUserJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        var newUserInfo = new User
        {
            Username = oldUserInfo!.Username!,
            Name = string.IsNullOrEmpty(name) ? oldUserInfo!.Name! : name!,
            PasswordHash = string.IsNullOrEmpty(password) ? oldUserInfo!.PasswordHash! : BCrypt.Net.BCrypt.HashPassword(password)!,
            Role = string.IsNullOrEmpty(role) ? oldUserInfo!.Role! : role!
        };

        var userJson = JsonSerializer.Serialize(newUserInfo, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        await File.WriteAllTextAsync(userPath, userJson);
        return Results.Ok(newUserInfo);
    }

    /*
    handes deleting a user folder by taking its username
    */
    public static IResult DeleteUser(HttpRequest request, string user)
    {
        var userDir = Path.Combine(Directory.GetCurrentDirectory(), "content", "users", user);
        if (!Directory.Exists(userDir)) return Results.BadRequest("Missing user");

        Directory.Delete(userDir, true);
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

        var tagPath = Path.Combine("content", "tags", $"{slug}.json");
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

        await File.WriteAllTextAsync(tagPath, tagJson);
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

        var categoryPath = Path.Combine("content", "categories", $"{slug}.json");
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

        await File.WriteAllTextAsync(categoryPath, categoryJson);
        return Results.Ok();
    }
}