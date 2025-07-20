using System.Security.Claims;
using System.Text.Json;
using FileBlogSystem.config;
using FileBlogSystem.Features.Render.Feed;

namespace FileBlogSystem.Features.Posting;

public static class PublishPost
{
    public static void MapPublishEndpoints(this WebApplication app)
    {
        app.MapPost("/posts/{slug}/publish", PublishNow).RequireAuthorization("EditorLevel");
        app.MapPost("/posts/{slug}/schedule", SchedulePublish).RequireAuthorization("EditorLevel");
        app.MapPost("/posts/{slug}/draft", SaveAsDraft).RequireAuthorization("EditorLevel");
        app.MapPost("/posts/{slug}/delete", DeletePost).RequireAuthorization("AdminAuthor");
    }

    // changes the status of a given post to published and sets the Publish Date update the rss
    // only allow owner of the blog
    public static async Task<IResult> PublishNow(string slug, HttpContext context)
    {
        var username = context.User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
        {
            return Results.Unauthorized();
        }

        var folder = PostReader.FindPostFolder(slug);
        if (folder == null)
            return Results.NotFound();

        var metaPath = Path.Combine(folder, "meta.json");
        var meta = JsonSerializer.Deserialize<PostMeta>(File.ReadAllText(metaPath));
        if (meta!.CreatedBy != username)
            return Results.Unauthorized();
        meta!.Status = "published";
        meta.Published = DateTime.Now;

        await File.WriteAllTextAsync(
            metaPath,
            JsonSerializer.Serialize(meta, new JsonSerializerOptions { WriteIndented = true })
        );

        RssWriter.WriteRssFile();

        return Results.Ok();
    }

    // schedule publish time of a given post using its slug and a given time
    // only allow owner of the blog
    public static async Task<IResult> SchedulePublish(
        HttpRequest req,
        string slug,
        HttpContext context
    )
    {
        var username = context.User.Identity?.Name;
        if (string.IsNullOrEmpty(username))
        {
            return Results.Unauthorized();
        }

        var body = await JsonSerializer.DeserializeAsync<JsonElement>(req.Body);
        var publishAt = DateTime.Parse(body.GetProperty("published").GetString()!);

        var folder = PostReader.FindPostFolder(slug);
        if (folder == null)
            return Results.NotFound();

        var metaPath = Path.Combine(folder, "meta.json");
        var meta = JsonSerializer.Deserialize<PostMeta>(File.ReadAllText(metaPath));
        if (meta!.CreatedBy != username)
            return Results.Unauthorized();
        meta!.Status = "scheduled";
        meta.Published = publishAt;

        await File.WriteAllTextAsync(
            metaPath,
            JsonSerializer.Serialize(meta, new JsonSerializerOptions { WriteIndented = true })
        );

        return Results.Ok();
    }

    // changes the status of a given post to draft and update the rss
    // only allow admins or owners if the blog isn't published
    public static async Task<IResult> SaveAsDraft(string slug, HttpContext context)
    {
        var username = context.User.Identity?.Name;
        var role = context.User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(role))
        {
            return Results.Unauthorized();
        }

        var folder = PostReader.FindPostFolder(slug);
        if (folder == null)
            return Results.NotFound();

        var metaPath = Path.Combine(folder, "meta.json");
        var meta = JsonSerializer.Deserialize<PostMeta>(File.ReadAllText(metaPath));
        if (meta!.Status == "published" && role != "admin")
            return Results.Unauthorized();
        if (meta!.CreatedBy != username && role != "admin")
            return Results.Unauthorized();
        meta!.Status = "draft";

        await File.WriteAllTextAsync(
            metaPath,
            JsonSerializer.Serialize(meta, new JsonSerializerOptions { WriteIndented = true })
        );

        RssWriter.WriteRssFile();

        return Results.Ok();
    }

    // delete a given postfrom the content and the routes and update the rss
    // only allow admins or owners if the blog isn't published
    public static IResult DeletePost(string slug, HttpContext context)
    {
        var username = context.User.Identity?.Name;
        var role = context.User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(role))
        {
            return Results.Unauthorized();
        }

        var folder = PostReader.FindPostFolder(slug);
        if (folder == null)
            return Results.NotFound();
        var metaPath = Path.Combine(folder, "meta.json");
        var meta = JsonSerializer.Deserialize<PostMeta>(File.ReadAllText(metaPath));
        if (meta!.Status == "published" && role != "admin")
            return Results.Unauthorized();
        if (meta!.CreatedBy != username && role != "admin")
            return Results.Unauthorized();

        Directory.Delete(folder, true);
        RouteMapper.RemoveRoute(slug);

        RssWriter.WriteRssFile();

        return Results.Ok();
    }
}
