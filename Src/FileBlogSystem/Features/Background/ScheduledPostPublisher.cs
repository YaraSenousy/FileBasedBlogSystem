using System.Text.Json;
using FileBlogSystem.Features.Posting;
using FileBlogSystem.Features.Render.Feed;
using FileBlogSystem.config;

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
                        PropertyNameCaseInsensitive = true,
                        Converters = { new UtcDateTimeConverter() }
                    });

                    if (meta != null)
                    {
                        if (!string.Equals(meta.Status, "scheduled", StringComparison.OrdinalIgnoreCase)) continue;

                        if (meta.Published <= DateTime.Now)
                        {
                            meta.Status = "published";
                            File.WriteAllText(metaPath, JsonSerializer.Serialize(meta, new JsonSerializerOptions
                            {
                                WriteIndented = true
                            }));
                            Console.WriteLine($"[Scheduler] Published: {meta.Slug}");
                        }

                        RssWriter.WriteRssFile();
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Scheduler Error] {ex.Message}");
                }

            }

            await Task.Delay(TimeSpan.FromSeconds(SiteConfig.SchedulerIntervalSeconds), stoppingToken);
        }
    }
}

