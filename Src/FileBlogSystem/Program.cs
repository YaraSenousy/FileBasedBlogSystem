using FileBlogSystem.Features.Render.Posts;
using FileBlogSystem.Features.Render.Categories;
using FileBlogSystem.Features.Render.Tags;
using FileBlogSystem.Features.Render.Search;
using FileBlogSystem.Features.Render.PostDetails;
using FileBlogSystem.Features.Posting;
using FileBlogSystem.Features.Render.Feed;
using FileBlogSystem.config;
using FileBlogSystem.Features.Security;
using FileBlogSystem.Features.Admin;
using FileBlogSystem.Features.Render.User;

using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.FileProviders;
using SixLabors.ImageSharp.Web.DependencyInjection;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;


var builder = WebApplication.CreateBuilder(args);
SiteConfig.Load();
RouteMapper.LoadRoutes();

builder.Services.AddHostedService<ScheduledPostPublisher>();
builder.Services.AddImageSharp();

DotNetEnv.Env.Load();
var jwtKey = Environment.GetEnvironmentVariable("JWT_SECRET") 
             ?? throw new Exception("Missing JWT_SECRET in .env");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var cookie = context.Request.Cookies["auth"];
                if (!string.IsNullOrWhiteSpace(cookie))
                    context.Token = cookie;

                return Task.CompletedTask;
            }
        };
    });
    
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminAuthor", policy =>
        policy.RequireRole("admin", "author"));
    options.AddPolicy("EditorLevel", policy =>
        policy.RequireRole("admin", "author", "editor"));
    options.AddPolicy("AdminLevel", policy =>
        policy.RequireRole("admin"));
});

builder.Services.AddHostedService<RssEmailNotifierService>();
builder.Services.Configure<NotifierSettings>(
    builder.Configuration.GetSection("Notifier")
);

builder.Services.AddSingleton<EmailSubscriberService>();

var app = builder.Build();

app.UseImageSharp();
app.UseAuthentication();
app.UseAuthorization();

app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), "content")),
    RequestPath = "/content"
});

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

app.MapFallback(context =>
{
    var path = context.Request.Path.Value;

    if (path == "/dashboard" || path == "/create" || path == "/users" || path == "/tag" || path == "/category")
    {
        var user = context.User;
        if (!user.Identity?.IsAuthenticated ?? true)
        {
            context.Response.Redirect("/login");
            return Task.CompletedTask;
        }
    }

    if (path == "/dashboard")
        return context.Response.SendFileAsync("wwwroot/dashboard.html");
    if (path == "/create")
        return context.Response.SendFileAsync("wwwroot/create.html");
    if (path == "/post")
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

    return context.Response.SendFileAsync("wwwroot/index.html");
});

app.Run();
