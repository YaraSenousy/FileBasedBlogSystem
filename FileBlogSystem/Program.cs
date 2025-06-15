using FileBlogSystem.Features.Render.Posts;
using FileBlogSystem.Features.Render.Categories;
using FileBlogSystem.Features.Render.Tags;
using FileBlogSystem.Features.Render.Search;
using FileBlogSystem.Features.Render.PostDetails;
using FileBlogSystem.Features.Posting;
using FileBlogSystem.Features.Render.Feed;
using FileBlogSystem.config;
using FileBlogSystem.Features.Security;

using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.FileProviders;
using SixLabors.ImageSharp.Web.DependencyInjection;


var builder = WebApplication.CreateBuilder(args);
SiteConfig.Load();

builder.Services.AddHostedService<ScheduledPostPublisher>();
builder.Services.AddImageSharp();

builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = JwtHelper.GetValidationParameters();
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

app.MapHomePageEndpoints();
app.MapCategoryListEndpoint();
app.MapTagListEndpoint();
app.MapCategoryPostsEndpoint();
app.MapSearchEndpoint();
app.MapPostDetailsEndpoint();
app.MapPostCreationEndpoint();
app.MapMediaUploadEndpoint();
app.MapPublishEndpoints();
app.MapRssFeed();
app.MapPostEditEndpoint();

app.Run();
