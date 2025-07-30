using System.IO;
using System.Text.Json;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;

namespace FileBlogSystem.Features.Security;

public static class Login
{
    public static void MapLoginEndpoint(this WebApplication app)
    {
        app.MapPost("/login", HandleLogin).RequireRateLimiting("login");
        app.MapPost("/logout", HandleLogout);
    }

    public static async Task<IResult> HandleLogin(HttpContext context, IAntiforgery antiforgery)
    {
        try
        {
            await antiforgery.ValidateRequestAsync(context);

            context.Request.EnableBuffering();

            using var reader = new StreamReader(context.Request.Body);
            var body = await reader.ReadToEndAsync();
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var bodyData = JsonSerializer.Deserialize<LoginRequest>(body, options);

            if (
                bodyData == null
                || string.IsNullOrEmpty(bodyData.Username)
                || string.IsNullOrEmpty(bodyData.Password)
            )
                return Results.BadRequest("Username and password are required.");

            var path = Path.Combine("content", "users", bodyData.Username, "profile.json");
            if (!File.Exists(path))
                return Results.Unauthorized();

            var userJson = await File.ReadAllTextAsync(path);
            var user = JsonSerializer.Deserialize<User?>(userJson, options);

            if (user == null)
                return Results.BadRequest("User profile is invalid or corrupt.");

            if (string.IsNullOrWhiteSpace(user.PasswordHash))
                return Results.BadRequest("Password not set for this user");

            if (!BCrypt.Net.BCrypt.Verify(bodyData.Password, user.PasswordHash))
                return Results.Unauthorized();

            var token = JwtHelper.GenerateToken(user);

            context.Response.Cookies.Append(
                "auth",
                token,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTimeOffset.UtcNow.AddMinutes(15),
                }
            );

            var daysUntilExpiration = user.PasswordSetDate.HasValue
                ? (user.PasswordSetDate.Value.AddDays(30) - DateTime.UtcNow).TotalDays
                : double.MaxValue;

            return Results.Ok(
                new
                {
                    success = true,
                    role = user.Role,
                    name = user.Username,
                    passwordSetDate = user.PasswordSetDate,
                    daysUntilExpiration,
                }
            );
        }
        catch (AntiforgeryValidationException)
        {
            return Results.BadRequest("Invalid CSRF token.");
        }
        catch (JsonException)
        {
            return Results.BadRequest("Invalid request format.");
        }
    }

    public static IResult HandleLogout(HttpContext context)
    {
        context.Response.Cookies.Append(
            "auth",
            "",
            new CookieOptions
            {
                HttpOnly = true,
                Secure = context.Request.IsHttps,
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddDays(-1),
                Path = "/",
            }
        );

        context.Response.Cookies.Append(
            "user-role",
            "",
            new CookieOptions
            {
                HttpOnly = false,
                Secure = context.Request.IsHttps,
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddDays(-1),
                Path = "/",
            }
        );

        return Results.Ok(new { success = true });
    }

    private class LoginRequest
    {
        public string? Username { get; set; } = string.Empty;
        public string? Password { get; set; } = string.Empty;
    }
}
