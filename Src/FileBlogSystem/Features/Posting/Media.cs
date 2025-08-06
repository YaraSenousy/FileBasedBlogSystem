using System.IO;
using FileBlogSystem.config;
using SixLabors.ImageSharp;

namespace FileBlogSystem.Features.Posting;

public static class Media
{
    public static void MapMediaEndpoint(this WebApplication app)
    {
        app.MapPost("/posts/{slug}/media", HandleMediaUpload).RequireAuthorization("EditorLevel");
        app.MapDelete("/posts/{slug}/media/{filename}", HandleMediaDelete)
            .RequireAuthorization("EditorLevel");
    }

    /*
    Validates that a file is a valid image using ImageSharp
    */
    private static bool IsValidImage(IFormFile file)
    {
        try
        {
            using var image = Image.Load(file.OpenReadStream());
            return true;
        }
        catch
        {
            return false;
        }
    }

    public static async Task<IResult> HandleMediaUpload(HttpRequest request, string slug)
    {
        if (!request.HasFormContentType)
            return Results.BadRequest("Expected form");

        var form = await request.ReadFormAsync();
        var files = form.Files;

        if (files.Count == 0)
            return Results.BadRequest("No files");

        var postDir = PostReader.FindPostFolder(slug);
        if (postDir == null)
            return Results.NotFound("Post not found");

        var assetsDir = Path.Combine(postDir, "assets");
        Directory.CreateDirectory(assetsDir);

        var uploadedUrls = new List<string>();

        foreach (var file in files)
        {
            // Validate file size (5MB limit for images)
            if (file.Length > 5 * 1024 * 1024)
                return Results.BadRequest("File too large. Maximum size is 5MB.");

            // Validate content type and actual content
            if (!file.ContentType.StartsWith("image/") || !IsValidImage(file))
                return Results.BadRequest("File must be a valid image (jpg, png, webp).");

            var safeFileName = Path.GetFileName(file.FileName);
            // Prevent path traversal
            if (
                safeFileName.Contains("..")
                || safeFileName.Contains("/")
                || safeFileName.Contains("\\")
            )
                return Results.BadRequest("Invalid filename.");

            // Validate file extension
            var extension = Path.GetExtension(safeFileName).ToLowerInvariant();
            if (
                extension != ".jpg"
                && extension != ".jpeg"
                && extension != ".png"
                && extension != ".webp"
            )
                return Results.BadRequest("File must be JPG, PNG, or WEBP.");

            var path = Path.Combine(assetsDir, safeFileName);

            using var stream = new FileStream(path, FileMode.Create);
            await file.CopyToAsync(stream);

            // Generate URL relative to content root
            var relativePath = Path.GetRelativePath(Directory.GetCurrentDirectory(), path)
                .Replace('\\', '/');
            uploadedUrls.Add($"/{relativePath}");
        }

        return Results.Ok(uploadedUrls);
    }

    public static IResult HandleMediaDelete(string slug, string filename)
    {
        var folder = PostReader.FindPostFolder(slug);
        if (folder == null)
            return Results.NotFound("Post not found");

        // Prevent path traversal in filename
        if (filename.Contains("..") || filename.Contains("/") || filename.Contains("\\"))
            return Results.BadRequest("Invalid filename.");

        var path = Path.Combine(folder, "assets", filename);
        if (!File.Exists(path))
            return Results.NotFound("File not found");

        File.Delete(path);
        return Results.Ok(new { deleted = filename });
    }
}
