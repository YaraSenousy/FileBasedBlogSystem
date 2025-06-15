using System.Text.Json;

namespace FileBlogSystem.Features.Security;

public static class Login
{
    public static void MapLoginEndpoint(this WebApplication app)
    {
        app.MapPost("/login", HandleLogin);
    }

    public static async Task<IResult> HandleLogin(HttpRequest request)
    {
        var form = await request.ReadFormAsync();
        var username = form["username"].ToString();
        var password = form["password"].ToString();

        var path = Path.Combine("content", "users", username, "profile.json");
        if (!File.Exists(path)) return Results.Unauthorized();

        var userJson = await File.ReadAllTextAsync(path);
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        var user = JsonSerializer.Deserialize<User?>(userJson, options);

        if (user == null)
            return Results.BadRequest("User profile is invalid or corrupt.");

        if (string.IsNullOrWhiteSpace(user.PasswordHash))
            return Results.BadRequest("Password not set for this user");

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return Results.Unauthorized();


        var token = JwtHelper.GenerateToken(user);

        request.HttpContext.Response.Cookies.Append("auth", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });


        return Results.Ok(new { success = true });
    }
}
