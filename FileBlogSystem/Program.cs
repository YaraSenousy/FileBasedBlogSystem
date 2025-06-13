using FileBlogSystem.Features.Render.HomePage;
using FileBlogSystem.Features.Render.Categories;
using FileBlogSystem.Features.Render.Tags;
using Microsoft.AspNetCore.Http.Json;


var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseStaticFiles();
app.MapHomePageEndpoints();
app.MapCategoryListEndpoint();
app.MapTagListEndpoint();
app.MapCategoryPostsEndpoint();

app.Run();
