using System.Text.Json;

namespace FileBlogSystem.config;

public static class SiteConfig
{
    public static string Title { get; private set; } = "File Blog";
    public static string BaseUrl { get; private set; } = "https://letsblog.switzerlandnorth.cloudapp.azure.com";
    public static string Description { get; private set; } = "";
    public static int SchedulerIntervalSeconds { get; private set; } = 60;


    public static void Load()
    {
        var configPath = Path.Combine("config", "site.json");
        if (!File.Exists(configPath)) return;

        var json = File.ReadAllText(configPath);
        var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(json);

        if (parsed != null)
        {
            Title = parsed.GetValueOrDefault("title") ?? Title;
            BaseUrl = parsed.GetValueOrDefault("baseUrl") ?? BaseUrl;
            Description = parsed.GetValueOrDefault("description") ?? Description;
            if (parsed.TryGetValue("schedulerIntervalSeconds", out var intervalStr) && int.TryParse(intervalStr, out var interval))
            {
                SchedulerIntervalSeconds = interval;
            }
        }
    }
}
