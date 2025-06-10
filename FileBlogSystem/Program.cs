using FileBlogSystem.Features.Render.HomePage;
using Microsoft.AspNetCore.Http.Json;


var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseStaticFiles();
app.MapHomePageEndpoints();

app.Run();
