using FileBlogSystem.Features.Render.HomePage;
using FileBlogSystem.Features.Render.Categories;
using FileBlogSystem.Features.Render.Tags;
using FileBlogSystem.Features.Render.Search;
using FileBlogSystem.Features.Render.PostDetails;
using FileBlogSystem.Features.Posting;
using FileBlogSystem.Features.Render.Feed;

using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.FileProviders;
using SixLabors.ImageSharp.Web.DependencyInjection;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHostedService<ScheduledPostPublisher>();
builder.Services.AddImageSharp(); 

var app = builder.Build();

app.UseImageSharp();

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

app.Run();
