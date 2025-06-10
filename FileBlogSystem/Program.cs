using FileBlogSystem.Features.Render.HomePage;
using Microsoft.AspNetCore.Http.Json;


var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.MapHomePageEndpoints();

app.Run();
