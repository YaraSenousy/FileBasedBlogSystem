namespace FileBlogSystem.Features.Posting;

public static class UploadMedia
{
    public static void MapMediaUploadEndpoint(this WebApplication app)
    {
        app.MapPost("/posts/{slug}/media", async (HttpRequest request, string slug) =>
        {
            if (!request.HasFormContentType)
                return Results.BadRequest("Expected multipart form data");

            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");

            if (file == null || file.Length == 0)
                return Results.BadRequest("No file uploaded");

            var postDir = Directory.GetDirectories("content/posts")
                .FirstOrDefault(dir => dir.EndsWith(slug, StringComparison.OrdinalIgnoreCase));

            if (postDir == null)
                return Results.NotFound("Post not found");

            var assetsDir = Path.Combine(postDir, "assets");
            Directory.CreateDirectory(assetsDir);

            var safeFileName = Path.GetFileName(file.FileName);
            var fullPath = Path.Combine(assetsDir, safeFileName);

            using var stream = new FileStream(fullPath, FileMode.Create);
            await file.CopyToAsync(stream);

            return Results.Ok(new { url = $"/content/posts/{slug}/assets/{safeFileName}" });
        });
    }
}
