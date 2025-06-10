using FileBlogSystem.Features.Render.HomePage;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapHomePageEndpoints();

app.Run();
