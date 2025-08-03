using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace FileBlogSystem.Features.Security;

public class ActivityMiddleware
{
    private readonly RequestDelegate _next;

    public ActivityMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var token = context.Request.Cookies["auth"];
            if (!string.IsNullOrEmpty(token))
            {
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
            }
        }
        await _next(context);
    }
}
