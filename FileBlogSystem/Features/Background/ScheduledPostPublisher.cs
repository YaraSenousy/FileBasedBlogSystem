using System.Text.Json;
using FileBlogSystem.Features.Posting;

public class ScheduledPostPublisher : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var postRoot = Path.Combine(Directory.GetCurrentDirectory(), "content", "posts");
            if (!Directory.Exists(postRoot)) return;

            var folders = Directory.GetDirectories(postRoot);
            foreach (var folder in folders)
            {
                var metaPath = Path.Combine(folder, "meta.json");
                if (!File.Exists(metaPath)) continue;

                try
                {
                    var json = File.ReadAllText(metaPath);
                    var meta = JsonSerializer.Deserialize<PostMeta>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (meta == null || meta.Status != "scheduled") continue;

                    if (meta.Published <= DateTime.UtcNow)
                    {
                        meta.Status = "published"; 

                        File.WriteAllText(metaPath, JsonSerializer.Serialize(meta, new JsonSerializerOptions
                        {
                            WriteIndented = true
                        }));
                    }
                }
                catch
                {
                    continue;
                }
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}

public class PostMeta
{
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Slug { get; set; } = "";
    public DateTime Published { get; set; }
    public string Status { get; set; } = "draft";
    public List<string>? Tags { get; set; } = [];
    public List<string>? Categories { get; set; } = [];
}
