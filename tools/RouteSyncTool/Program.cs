using System.Text.Json;

var postRoot = Path.Combine("FileBlogSystem", "content", "posts");
var routesPath = Path.Combine("FileBlogSystem", "config", "routes.json");

if (!Directory.Exists("config")) Directory.CreateDirectory("config");

var routes = File.Exists(routesPath)
    ? JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(routesPath)) ?? new()
    : new Dictionary<string, string>();

foreach (var folder in Directory.GetDirectories(postRoot))
{
    var folderName = Path.GetFileName(folder)!;

    var metaPath = Path.Combine(folder, "meta.json");
    if (!File.Exists(metaPath)) continue;

    var metaJson = await File.ReadAllTextAsync(metaPath);
    var meta = JsonSerializer.Deserialize<PostMeta>(metaJson, new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true
    });

    if (meta?.Slug is not null)
    {
        routes[meta.Slug] = folderName;
    }
}

var output = JsonSerializer.Serialize(routes, new JsonSerializerOptions { WriteIndented = true });
await File.WriteAllTextAsync(routesPath, output);

Console.WriteLine("Routes.json has been updated.");

public class PostMeta
{
    public string Slug { get; set; } = "";
}
