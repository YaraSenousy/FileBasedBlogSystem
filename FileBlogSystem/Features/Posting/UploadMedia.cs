namespace FileBlogSystem.Features.Posting;

public static class UploadMedia
{
    public static void MapMediaUploadEndpoint(this WebApplication app)
    {
        app.MapPost("/posts/{slug}/media", HandleMediaUpload).RequireAuthorization("EditorLevel");
    }
    public static async Task<IResult> HandleMediaUpload(HttpRequest request, string slug)
    {
        if (!request.HasFormContentType) return Results.BadRequest("Expected form");

        var form = await request.ReadFormAsync();
        var files = form.Files;

        if (files.Count == 0) return Results.BadRequest("No files");

        var postDir = Directory.GetDirectories("content/posts")
            .FirstOrDefault(dir => dir.EndsWith(slug, StringComparison.OrdinalIgnoreCase));
        if (postDir == null) return Results.NotFound("Post not found");

        var assetsDir = Path.Combine(postDir, "assets");
        Directory.CreateDirectory(assetsDir);

        var uploadedUrls = new List<string>();

        foreach (var file in files)
        {
            var safeFileName = Path.GetFileName(file.FileName);
            var path = Path.Combine(assetsDir, safeFileName);

            using var stream = new FileStream(path, FileMode.Create);
            await file.CopyToAsync(stream);

            uploadedUrls.Add($"/content/posts/{postDir}/assets/{safeFileName}");
        }

        return Results.Ok(uploadedUrls);
    }
}

