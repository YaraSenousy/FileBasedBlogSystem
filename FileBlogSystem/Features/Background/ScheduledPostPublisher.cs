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
                        PropertyNameCaseInsensitive = true,
                        Converters = { new UtcDateTimeConverter() }
                    });


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

                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Scheduler Error] {ex.Message}");
                }

            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}

