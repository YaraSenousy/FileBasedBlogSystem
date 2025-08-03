using System.Text;
using System.Threading.RateLimiting;
using FileBlogSystem.config;
using FileBlogSystem.Features.Admin;
using FileBlogSystem.Features.Joining;
using FileBlogSystem.Features.Posting;
using FileBlogSystem.Features.Render.Categories;
using FileBlogSystem.Features.Render.Feed;
using FileBlogSystem.Features.Render.PostDetails;
using FileBlogSystem.Features.Render.Posts;
using FileBlogSystem.Features.Render.Search;
using FileBlogSystem.Features.Render.Tags;
using FileBlogSystem.Features.Render.UserFunctions;
using FileBlogSystem.Features.Security;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using SixLabors.ImageSharp.Web.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);
SiteConfig.Load(builder.Configuration);
RouteMapper.LoadRoutes();

builder.Services.AddHostedService<ScheduledPostPublisher>();
builder.Services.AddImageSharp();

DotNetEnv.Env.Load();
var jwtKey =
    Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? throw new Exception("Missing JWT_SECRET in .env");

builder
    .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var cookie = context.Request.Cookies["auth"];
                if (!string.IsNullOrWhiteSpace(cookie))
                    context.Token = cookie;

                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminAuthor", policy => policy.RequireRole("admin", "author"));
    options.AddPolicy("EditorLevel", policy => policy.RequireRole("admin", "author", "editor"));
    options.AddPolicy("AdminLevel", policy => policy.RequireRole("admin"));
});

builder.Services.AddHostedService<RssEmailNotifierService>();
builder.Services.Configure<NotifierSettings>(builder.Configuration.GetSection("Notifier"));

builder.Services.AddSingleton<EmailSubscriberService>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    
    options.AddFixedWindowLimiter(
        "login",
        opt =>
        {
            opt.PermitLimit = 5;
            opt.Window = TimeSpan.FromMinutes(1);
            opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            opt.QueueLimit = 0;
        }
    );
});

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
});

var app = builder.Build();

app.UseImageSharp();
app.UseAuthentication();
app.UseAuthorization();
app.UseHsts();
app.UseHttpsRedirection();
app.UseMiddleware<ActivityMiddleware>();
app.UseRateLimiter();

app.UseStaticFiles();
app.UseStaticFiles(
    new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(
            Path.Combine(Directory.GetCurrentDirectory(), "content")
        ),
        RequestPath = "/content",
    }
);

app.MapGetPostsEndpoints();
app.MapCategoryListEndpoint();
app.MapTagListEndpoint();
app.MapCategoryPostsEndpoint();
app.MapSearchEndpoint();
app.MapPostDetailsEndpoint();
app.MapPostCreationEndpoint();
app.MapMediaEndpoint();
app.MapPublishEndpoints();
app.MapRssFeed();
app.MapPostEditEndpoint();
app.MapLoginEndpoint();
app.MapAdminEndPoint();
app.MapSubscribe();
app.MapUserPostsEndpoint();
app.MapJoinRequests();

app.MapFallback(context =>
{
    PathString path = context.Request.Path.Value;

    if (
        path.StartsWithSegments("/dashboard")
        || path == "/create"
        || path == "/users"
        || path == "/tag"
        || path == "/category"
        || path == "/my-posts"
        || path == "/profile"
        || path == "/requests"
        || path.StartsWithSegments("/requests", out var remaining)
    )
    {
        var user = context.User;
        if (!user.Identity?.IsAuthenticated ?? true)
        {
            var loginUrl =
                $"/login?returnUrl={Uri.EscapeDataString(context.Request.Path + context.Request.QueryString)}";
            context.Response.StatusCode = StatusCodes.Status302Found;
            context.Response.Headers.Location = loginUrl;
            return Task.CompletedTask;
        }
    }

    if (path.StartsWithSegments("/dashboard"))
        return context.Response.SendFileAsync("wwwroot/dashboard.html");
    if (path == "/create")
        return context.Response.SendFileAsync("wwwroot/create.html");
    if (path.StartsWithSegments("/post", out remaining) && remaining!.Value!.Trim('/').Length > 0)
        return context.Response.SendFileAsync("wwwroot/post.html");
    if (path == "/login")
        return context.Response.SendFileAsync("wwwroot/login.html");
    if (path == "/users")
        return context.Response.SendFileAsync("wwwroot/users.html");
    if (path == "/tag")
        return context.Response.SendFileAsync("wwwroot/tags.html");
    if (path == "/category")
        return context.Response.SendFileAsync("wwwroot/categories.html");
    if (path == "/blogs")
        return context.Response.SendFileAsync("wwwroot/blogs.html");
    if (path == "/my-posts")
        return context.Response.SendFileAsync("wwwroot/my-posts.html");
    if (path == "/profile")
        return context.Response.SendFileAsync("wwwroot/profile.html");
    if (path == "/team")
        return context.Response.SendFileAsync("wwwroot/team.html");
    if (
        path.StartsWithSegments("/profiles", out remaining)
        && remaining!.Value!.Trim('/').Length > 0
    )
        return context.Response.SendFileAsync("wwwroot/team-profile.html");
    if (path == "/saved")
        return context.Response.SendFileAsync("wwwroot/saved.html");
    if (path == "/join")
        return context.Response.SendFileAsync("wwwroot/join.html");
    if (path == "/requests")
        return context.Response.SendFileAsync("wwwroot/requests.html");
    if (
        path.StartsWithSegments("/requests", out remaining)
        && remaining!.Value!.Trim('/').Length > 0
    )
        return context.Response.SendFileAsync("wwwroot/request.html");

    return context.Response.SendFileAsync("wwwroot/index.html");
});

app.Run();
