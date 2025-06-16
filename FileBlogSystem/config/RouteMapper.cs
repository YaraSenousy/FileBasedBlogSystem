using System.Text.Json;

namespace FileBlogSystem.config;

public static class RouteMapper
{
    private static Dictionary<string, string>? _map;

    public static void LoadRoutes()
    {
        var path = Path.Combine("config", "routes.json");
        if (!File.Exists(path))
        {
            _map = new();
            return;
        }

        var json = File.ReadAllText(path);
        _map = JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new();
    }

    public static string? ResolveSlug(string slug)
    {
        return _map != null && _map.TryGetValue(slug, out var folder) ? folder : null;
    }

    public static void AddRoute(string slug, string folder)
    {
        _map![slug] = folder;
        var path = Path.Combine("config", "routes.json");
        var json = JsonSerializer.Serialize(_map, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(path, json);
    }

    public static void RemoveRoute(string slug)
    {
        if (_map == null || !_map.ContainsKey(slug)) return;

        _map.Remove(slug);

        var path = Path.Combine("config", "routes.json");
        var json = JsonSerializer.Serialize(_map, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(path, json);
    }
}
