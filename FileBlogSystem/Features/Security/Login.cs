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

        var user = JsonSerializer.Deserialize<User>(await File.ReadAllTextAsync(path));
        if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return Results.Unauthorized();

        var token = JwtHelper.GenerateToken(user);
        return Results.Ok(new { token });

    }
}
