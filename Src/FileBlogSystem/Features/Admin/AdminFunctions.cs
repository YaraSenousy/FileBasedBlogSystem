using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using FileBlogSystem.Features.Posting;
using FileBlogSystem.Features.Render.Categories;
using FileBlogSystem.Features.Render.Tags;
using FileBlogSystem.Features.Security;
using Microsoft.AspNetCore.Http;

namespace FileBlogSystem.Features.Admin;

public static class AdminFunctions
{
    public static void MapAdminEndPoint(this WebApplication app)
    {
        app.MapGet("/admin/users", GetUsers);
        app.MapPost("/admin/users", AddUser).RequireAuthorization("AdminLevel");
        app.MapPatch("/admin/users/{user}", EditUser).RequireAuthorization("AdminLevel");
        app.MapDelete("/admin/users/{user}", DeleteUser).RequireAuthorization("AdminLevel");
        app.MapPost("/admin/tags", AddTag).RequireAuthorization("AdminLevel");
        app.MapPatch("/admin/tags/{slug}", EditTag).RequireAuthorization("AdminLevel");
        app.MapDelete("/admin/tags/{slug}", DeleteTag).RequireAuthorization("AdminLevel");
        app.MapPost("/admin/categories", AddCategory).RequireAuthorization("AdminLevel");
        app.MapPatch("/admin/categories/{slug}", EditCategory).RequireAuthorization("AdminLevel");
        app.MapDelete("/admin/categories/{slug}", DeleteCategory)
            .RequireAuthorization("AdminLevel");
        app.MapGet("/user-profile", GetProfile).RequireAuthorization();
        app.MapPost("/profile/edit", (Delegate)EditProfile).RequireAuthorization();
        app.MapPatch("/admin/users/{editorUsername}/assign-author", AssignAuthor)
            .RequireAuthorization("AdminLevel");
    }

    /*
    Handles getting users info
    Returns for each user: username, name, email, role, profile picture
    */
    private static async Task<IResult> GetUsers(string? role = null)
    {
        var usersDir = Path.Combine("content", "users");
        if (!Directory.Exists(usersDir))
            return Results.Ok(new List<User>());

        var users = new List<User>();
        foreach (var dir in Directory.GetDirectories(usersDir))
        {
            var userPath = Path.Combine(dir, "profile.json");
            if (File.Exists(userPath))
            {
                var json = await File.ReadAllTextAsync(userPath);
                var user = JsonSerializer.Deserialize<User>(json);
                if (
                    user != null
                    && (
                        string.IsNullOrEmpty(role)
                        || user.Role.Equals(role, StringComparison.OrdinalIgnoreCase)
                    )
                )
                {
                    users.Add(user);
                }
            }
        }

        return Results.Ok(users);
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
    public static IResult GetProfile(HttpContext context)
    {
        var username = context.User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Results.Unauthorized();

        var userDir = Path.Combine(Directory.GetCurrentDirectory(), "content", "users", username);
        var user = ReadUserFromFolder(userDir);
        if (user == null)
            return Results.NotFound("User not found");

        return Results.Ok(user);
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
    Define the email policy:
    Basic email format validation.
    */
    public static bool IsValidEmail(string email)
    {
        if (string.IsNullOrEmpty(email))
            return true; // Email is optional
        string pattern = @"^[^@\s]+@[^@\s]+\.[^@\s]+$";
        return Regex.IsMatch(email, pattern);
    }

    /*
    Handles adding a new user by taking username, name, password, role, and optional email
    Creates slug from the username and ensures it is unique
    Stores the password hashed
    */
    public static async Task<IResult> AddUser(HttpRequest request)
    {
        var form = await request.ReadFormAsync();
        var username = form["username"];
        var password = form["password"];
        var name = form["name"];
        var role = form["role"];
        var email = form["email"];

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
            return Results.BadRequest(
                "Invalid Password: Must be at least 8 characters, one uppercase, one lowercase, one digit"
            );
        if (!IsValidEmail(email!))
            return Results.BadRequest("Invalid email format");
        if (role != "admin" && role != "author" && role != "editor")
            return Results.BadRequest("Invalid role");

        var userFolder = Path.Combine("content", "users", username!);
        var userPath = Path.Combine(userFolder, "profile.json");

        if (File.Exists(userPath))
            return Results.BadRequest("Username already used");
        Directory.CreateDirectory(userFolder);

        var hash = BCrypt.Net.BCrypt.HashPassword(password);

        var user = new User
        {
            Username = username!,
            Name = name!,
            PasswordHash = hash!,
            Role = role!,
            Email = (string.IsNullOrEmpty(email!)) ? email! : string.Empty,
            ProfilePicture = null,
        };

        var userJson = JsonSerializer.Serialize(
            user,
            new JsonSerializerOptions { WriteIndented = true }
        );

        await File.WriteAllTextAsync(userPath, userJson);
        return Results.Ok();
    }

    /*
    Handles editing a user by taking name, password, role, or email
    Ensures the user exists, validates input, and rewrites their file
    */
    public static async Task<IResult> EditUser(HttpRequest request, string user)
    {
        var form = await request.ReadFormAsync();
        var password = form["password"];
        var name = form["name"];
        var role = form["role"];
        var email = form["email"];

        var userPath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "content",
            "users",
            user,
            "profile.json"
        );
        if (!File.Exists(userPath))
            return Results.NotFound("User not found");

        if (!string.IsNullOrEmpty(password) && !IsValidPassword(password!))
            return Results.BadRequest(
                "Invalid Password: Must be at least 8 characters, one uppercase, one lowercase, one digit"
            );
        if (!string.IsNullOrEmpty(role) && role != "admin" && role != "author" && role != "editor")
            return Results.BadRequest("Invalid role");
        if (!string.IsNullOrEmpty(email) && !IsValidEmail(email!))
            return Results.BadRequest("Invalid email format");

        var oldUserJson = File.ReadAllText(userPath);
        var oldUserInfo = JsonSerializer.Deserialize<User>(
            oldUserJson,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );

        var newUserInfo = new User
        {
            Username = oldUserInfo!.Username!,
            Name = string.IsNullOrEmpty(name) ? oldUserInfo!.Name! : name!,
            PasswordHash = string.IsNullOrEmpty(password)
                ? oldUserInfo!.PasswordHash!
                : BCrypt.Net.BCrypt.HashPassword(password)!,
            Role = string.IsNullOrEmpty(role) ? oldUserInfo!.Role! : role!,
            Email = string.IsNullOrEmpty(email) ? oldUserInfo!.Email! : email!,
            ProfilePicture = oldUserInfo!.ProfilePicture,
        };

        var userJson = JsonSerializer.Serialize(
            newUserInfo,
            new JsonSerializerOptions { WriteIndented = true }
        );

        await File.WriteAllTextAsync(userPath, userJson);
        return Results.Ok(newUserInfo);
    }

    /*
    Handles editing the current user's profile by taking name, email, and optional profile picture
    */
    public static async Task<IResult> EditProfile(HttpContext context)
    {
        var username = context.User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
            return Results.Unauthorized();

        var form = await context.Request.ReadFormAsync();
        var name = form["name"];
        var email = form["email"];
        var profilePicFile = form.Files["profilePic"];
        var description = form["description"];

        var userPath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "content",
            "users",
            username,
            "profile.json"
        );
        if (!File.Exists(userPath))
            return Results.NotFound("User not found");

        if (string.IsNullOrEmpty(name))
            return Results.BadRequest("Name is required");
        if (!string.IsNullOrEmpty(email) && !IsValidEmail(email!))
            return Results.BadRequest("Invalid email format");

        var oldUserJson = File.ReadAllText(userPath);
        var oldUserInfo = JsonSerializer.Deserialize<User>(
            oldUserJson,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );

        string? profilePicPath = oldUserInfo!.ProfilePicture;
        if (profilePicFile != null && profilePicFile.Length > 0)
        {
            if (!profilePicFile.ContentType.StartsWith("image/"))
                return Results.BadRequest("Profile picture must be an image");
            var extension = Path.GetExtension(profilePicFile.FileName).ToLower();
            if (
                extension != ".jpg"
                && extension != ".jpeg"
                && extension != ".png"
                && extension != ".webp"
            )
                return Results.BadRequest("Profile picture must be JPG or PNG or WEBP");

            var picPath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "content",
                "users",
                username,
                "profile-pic" + extension
            );
            using (var stream = new FileStream(picPath, FileMode.Create))
            {
                await profilePicFile.CopyToAsync(stream);
            }
            profilePicPath = $"/content/users/{username}/profile-pic{extension}";
        }

        var newUserInfo = new User
        {
            Username = oldUserInfo!.Username!,
            Name = name!,
            PasswordHash = oldUserInfo!.PasswordHash!,
            Role = oldUserInfo!.Role!,
            Email = string.IsNullOrEmpty(email) ? oldUserInfo!.Email! : email!,
            ProfilePicture = profilePicPath,
            Description = string.IsNullOrEmpty(description)
                ? oldUserInfo!.Description
                : description,
        };

        var userJson = JsonSerializer.Serialize(
            newUserInfo,
            new JsonSerializerOptions { WriteIndented = true }
        );

        await File.WriteAllTextAsync(userPath, userJson);
        return Results.Ok(newUserInfo);
    }

    /*
    Handles deleting a user folder by taking its username
    */
    public static IResult DeleteUser(HttpRequest request, string user)
    {
        var userDir = Path.Combine(Directory.GetCurrentDirectory(), "content", "users", user);
        if (!Directory.Exists(userDir))
            return Results.NotFound("User not found");

        Directory.Delete(userDir, true);
        return Results.Ok();
    }

    /*
    Handles adding a new tag by taking tag name
    Creates slug from the name and ensures it is unique
    */
    public static async Task<IResult> AddTag(HttpRequest request)
    {
        var form = await request.ReadFormAsync();
        var tagName = form["name"];

        if (string.IsNullOrEmpty(tagName))
            return Results.BadRequest("Tag name is required");

        var slug = SlugGenerator.ToSlug(tagName!);

        var tagPath = Path.Combine("content", "tags", $"{slug}.json");
        if (File.Exists(tagPath))
            return Results.BadRequest("Tag already exists");

        var tag = new Tag { Name = tagName!, Slug = slug! };

        var tagJson = JsonSerializer.Serialize(
            tag,
            new JsonSerializerOptions { WriteIndented = true }
        );

        Directory.CreateDirectory(Path.GetDirectoryName(tagPath)!);
        await File.WriteAllTextAsync(tagPath, tagJson);
        return Results.Created($"/admin/tags/{slug}", tag);
    }

    /*
    Handles editing the tags/categories slug inside the posts' meta files
    if a tag/category is edited, its new slug replaces the old slugs in all posts
    if delete is true, it deletes the tag/category from all posts
    */
    public static async void UpdatePosts(
        string type,
        string oldSlug,
        string newSlug,
        bool delete = false
    )
    {
        var postsDir = Path.Combine(Directory.GetCurrentDirectory(), "content", "posts");
        foreach (var postDir in Directory.GetDirectories(postsDir))
        {
            var postFile = Path.Combine(postDir, "meta.json");
            var postJson = File.ReadAllText(postFile);
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var post = JsonSerializer.Deserialize<Post>(postJson, options);

            List<string>? postData;
            if (type == "tags")
                postData = post?.Tags;
            else
                postData = post?.Categories;

            if (postData != null && postData.Contains(oldSlug))
            {
                if (delete)
                    postData.RemoveAll(n => n == oldSlug);
                else
                {
                    for (int i = 0; i < postData.Count; i++)
                    {
                        if (postData[i] == oldSlug)
                            postData[i] = newSlug;
                    }
                }

                var updatedJson = JsonSerializer.Serialize(
                    post,
                    new JsonSerializerOptions { WriteIndented = true }
                );
                await File.WriteAllTextAsync(postFile, updatedJson);
            }
        }
    }

    /*
    Handles editing a tag by taking a new name
    Updates slug if name changes and ensures it is unique
    */
    public static async Task<IResult> EditTag(HttpRequest request, string slug)
    {
        var form = await request.ReadFormAsync();
        var name = form["name"];

        if (string.IsNullOrEmpty(name))
            return Results.BadRequest("Tag name is required");

        var tagPath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "content",
            "tags",
            $"{slug}.json"
        );
        if (!File.Exists(tagPath))
            return Results.NotFound("Tag not found");

        var newSlug = SlugGenerator.ToSlug(name!);
        var newTagPath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "content",
            "tags",
            $"{newSlug}.json"
        );
        if (newSlug != slug && File.Exists(newTagPath))
            return Results.BadRequest("Tag with this name already exists");

        var tag = new Tag { Name = name!, Slug = newSlug };

        var tagJson = JsonSerializer.Serialize(
            tag,
            new JsonSerializerOptions { WriteIndented = true }
        );

        if (newSlug != slug)
            File.Delete(tagPath);
        await File.WriteAllTextAsync(newTagPath, tagJson);
        UpdatePosts("tags", slug, newSlug);
        return Results.Ok(tag);
    }

    /*
    Handles deleting a tag by its slug
    */
    public static IResult DeleteTag(HttpRequest request, string slug)
    {
        var tagPath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "content",
            "tags",
            $"{slug}.json"
        );
        if (!File.Exists(tagPath))
            return Results.NotFound("Tag not found");

        File.Delete(tagPath);
        UpdatePosts("tags", slug, "", true);
        return Results.NoContent();
    }

    /*
    Handles adding a new category by taking category name and optional description
    Creates slug from the name and ensures it is unique
    */
    public static async Task<IResult> AddCategory(HttpRequest request)
    {
        var form = await request.ReadFormAsync();
        var categoryName = form["name"];
        var description = form["description"];

        if (string.IsNullOrEmpty(categoryName))
            return Results.BadRequest("Category name is required");

        var slug = SlugGenerator.ToSlug(categoryName!);

        var categoryPath = Path.Combine("content", "categories", $"{slug}.json");
        if (File.Exists(categoryPath))
            return Results.BadRequest("Category already exists");

        var category = new Category
        {
            Name = categoryName!,
            Slug = slug,
            Description = description,
        };

        var categoryJson = JsonSerializer.Serialize(
            category,
            new JsonSerializerOptions { WriteIndented = true }
        );

        Directory.CreateDirectory(Path.GetDirectoryName(categoryPath)!);
        await File.WriteAllTextAsync(categoryPath, categoryJson);
        return Results.Created($"/admin/categories/{slug}", category);
    }

    /*
    Handles editing a category by taking a new name and/or description
    Updates slug if name changes and ensures it is unique
    */
    public static async Task<IResult> EditCategory(HttpRequest request, string slug)
    {
        var form = await request.ReadFormAsync();
        var name = form["name"];
        var description = form["description"];

        if (string.IsNullOrEmpty(name))
            return Results.BadRequest("Category name is required");

        var categoryPath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "content",
            "categories",
            $"{slug}.json"
        );
        if (!File.Exists(categoryPath))
            return Results.NotFound("Category not found");

        var oldCategoryJson = File.ReadAllText(categoryPath);
        var oldCategory = JsonSerializer.Deserialize<Category>(
            oldCategoryJson,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );

        var newSlug = SlugGenerator.ToSlug(name!);
        var newCategoryPath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "content",
            "categories",
            $"{newSlug}.json"
        );
        if (newSlug != slug && File.Exists(newCategoryPath))
            return Results.BadRequest("Category with this name already exists");

        var category = new Category
        {
            Name = name!,
            Slug = newSlug,
            Description = string.IsNullOrEmpty(description)
                ? oldCategory!.Description
                : description,
        };

        var categoryJson = JsonSerializer.Serialize(
            category,
            new JsonSerializerOptions { WriteIndented = true }
        );

        if (newSlug != slug)
            File.Delete(categoryPath);
        await File.WriteAllTextAsync(newCategoryPath, categoryJson);
        UpdatePosts("categories", slug, newSlug);
        return Results.Ok(category);
    }

    /*
    Handles deleting a category by its slug
    */
    public static IResult DeleteCategory(HttpRequest request, string slug)
    {
        var categoryPath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "content",
            "categories",
            $"{slug}.json"
        );
        if (!File.Exists(categoryPath))
            return Results.NotFound("Category not found");

        File.Delete(categoryPath);
        UpdatePosts("categories", slug, "", true);
        return Results.NoContent();
    }

    /* Handles assigning an author to an editor
        Validates the editor and author, updates the editor's AssignedAuthor field
        Returns OK if successful, NotFound if editor or author not found, BadRequest if invalid
    */
    private static async Task<IResult> AssignAuthor(string editorUsername, HttpContext context)
    {
        // Validate editor
        var editorDir = Path.Combine("content", "users", editorUsername);
        var editorPath = Path.Combine(editorDir, "profile.json");
        if (!File.Exists(editorPath))
            return Results.NotFound("Editor not found.");

        var editorJson = await File.ReadAllTextAsync(editorPath);
        var editor = JsonSerializer.Deserialize<User>(editorJson);
        if (editor == null)
            return Results.BadRequest("Invalid editor data.");

        if (editor.Role != "editor")
            return Results.BadRequest("User must be an editor to assign an author.");

        // Get authorUsername from query parameter
        var authorUsername = context.Request.Query["authorUsername"].ToString();
        if (string.IsNullOrWhiteSpace(authorUsername))
        {
            // Clear AssignedAuthor if no authorUsername provided
            editor.AssignedAuthor = string.Empty;
            var updateJson = JsonSerializer.Serialize(editor, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(editorPath, updateJson);
            return Results.Ok();
        }

        // Validate author
        var authorDir = Path.Combine("content", "users", authorUsername);
        var authorPath = Path.Combine(authorDir, "profile.json");
        if (!File.Exists(authorPath))
            return Results.NotFound("Author not found.");

        var authorJson = await File.ReadAllTextAsync(authorPath);
        var author = JsonSerializer.Deserialize<User>(authorJson);
        if (author == null || author.Role != "author")
            return Results.BadRequest("Invalid author or user is not an author.");

        // Update editor's AssignedAuthor
        editor.AssignedAuthor = authorUsername;
        var updatedJson = JsonSerializer.Serialize(editor, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(editorPath, updatedJson);

        return Results.Ok();
    }
}
