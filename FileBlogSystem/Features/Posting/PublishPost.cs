using System.Text.Json;
using FileBlogSystem.Features.Render.Feed;

namespace FileBlogSystem.Features.Posting;

public static class PublishPost
{
    public static void MapPublishEndpoints(this WebApplication app)
    {
        app.MapPost("/posts/{slug}/publish", PublishNow).RequireAuthorization("EditorLevel");
        app.MapPost("/posts/{slug}/schedule", SchedulePublish).RequireAuthorization("EditorLevel");
        app.MapPost("/posts/{slug}/draft", SaveAsDraft).RequireAuthorization("EditorLevel");
        app.MapPost("/posts/{slug}/delete", DeletePost).RequireAuthorization("AdminLevel");
    }

    // publish a given post using its slug
    public static IResult PublishNow(string slug)
    {
        var folder = FindPostFolder(slug);
        if (folder == null) return Results.NotFound();

        var metaPath = Path.Combine(folder, "meta.json");
        var meta = JsonSerializer.Deserialize<PostMeta>(File.ReadAllText(metaPath));
        meta!.Status = "published";
        meta.Published = DateTime.Now;

        File.WriteAllText(metaPath, JsonSerializer.Serialize(meta, new JsonSerializerOptions
        {
            WriteIndented = true
        }));

        RssWriter.WriteRssFile();

        return Results.Ok();
    }

    // schedule publish time of a given post using its slug and a given time
    public static async Task<IResult> SchedulePublish(HttpRequest req, string slug)
    {
        var body = await JsonSerializer.DeserializeAsync<JsonElement>(req.Body);
        var publishAt = DateTime.Parse(body.GetProperty("published").GetString()!);

        var folder = FindPostFolder(slug);
        if (folder == null) return Results.NotFound();

        var metaPath = Path.Combine(folder, "meta.json");
        var meta = JsonSerializer.Deserialize<PostMeta>(File.ReadAllText(metaPath));
        meta!.Status = "scheduled";
        meta.Published = publishAt;

        File.WriteAllText(metaPath, JsonSerializer.Serialize(meta, new JsonSerializerOptions
        {
            WriteIndented = true
        }));

        return Results.Ok();
    }

    // save a given post as a draft using its slug
    public static async Task<IResult> SaveAsDraft(string slug)
    {
        var folder = FindPostFolder(slug);
        if (folder == null) return Results.NotFound();

        var metaPath = Path.Combine(folder, "meta.json");
        var meta = JsonSerializer.Deserialize<PostMeta>(File.ReadAllText(metaPath));
        meta!.Status = "draft";

        File.WriteAllText(metaPath, JsonSerializer.Serialize(meta, new JsonSerializerOptions
        {
            WriteIndented = true
        }));

        RssWriter.WriteRssFile();

        return Results.Ok();
    }

    // delete a given post using its slug
    public static async Task<IResult> DeletePost(string slug)
    {
        var folder = FindPostFolder(slug);
        if (folder == null) return Results.NotFound();

        Directory.Delete(folder, true);
        return Results.Ok();
    }
    private static string? FindPostFolder(string slug)
    {
        return Directory.GetDirectories("content/posts")
            .FirstOrDefault(d => d.EndsWith(slug, StringComparison.OrdinalIgnoreCase));
    }
}
