using FileBlogSystem.Features.Render.HomePage;
using FileBlogSystem.Features.Render.Categories;
using FileBlogSystem.Features.Render.Tags;
using FileBlogSystem.Features.Render.Search;
using FileBlogSystem.Features.Render.PostDetails;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.FileProviders;


var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

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

app.Run();
