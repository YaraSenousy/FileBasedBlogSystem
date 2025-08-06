using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using BCrypt.Net;
using FileBlogSystem.Features.Admin;
using FileBlogSystem.Features.Security;
using Ganss.Xss;
using MailKit.Net.Smtp;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using MimeKit;
using SixLabors.ImageSharp;

namespace FileBlogSystem.Features.Joining;

public static class JoinRequests
{
    public static void MapJoinRequests(this WebApplication app)
    {
        app.MapPost("/join", HandleJoinRequest).RequireRateLimiting("login");
        app.MapGet("/all-requests", GetRequests).RequireAuthorization("AdminLevel");
        app.MapGet("/all-requests/pending/count", GetPendingRequestsCount)
            .RequireAuthorization("AdminLevel");
        app.MapGet("/all-requests/{requestId}", GetRequestById).RequireAuthorization("AdminLevel");
        app.MapPost("/all-requests/{requestId}/approve", ApproveRequest)
            .RequireAuthorization("AdminLevel");
        app.MapPost("/all-requests/{requestId}/deny", DenyRequest)
            .RequireAuthorization("AdminLevel");
    }

    /*
    HtmlSanitizer to strip HTML tags
    */
    public static string SanitizeInput(string input)
    {
        var sanitizer = new HtmlSanitizer();
        return sanitizer.Sanitize(input);
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

    /*
    Validates that a file is a valid PDF by checking the header
    */
    private static bool IsValidPdf(IFormFile file)
    {
        try
        {
            using var stream = file.OpenReadStream();
            byte[] header = new byte[5];
            stream.ReadExactly(header, 0, 5);
            return header.SequenceEqual(new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D });
        }
        catch
        {
            return false;
        }
    }

    private static async Task<IResult> HandleJoinRequest(
        HttpContext context,
        IOptions<NotifierSettings> config,
        IAntiforgery antiforgery
    )
    {
        try
        {
            await antiforgery.ValidateRequestAsync(context);
            if (!context.Request.HasFormContentType)
                return Results.BadRequest("Invalid form data.");

            var form = await context.Request.ReadFormAsync();
            var name = SanitizeInput(form["name"].ToString());
            var email = form["email"].ToString();
            var description = SanitizeInput(form["description"].ToString());
            var password = form["password"].ToString();
            var whyJoin = SanitizeInput(form["whyJoin"].ToString());
            var picture = form.Files["picture"];
            var cv = form.Files["cv"];

            // Validate required fields
            if (
                string.IsNullOrWhiteSpace(name)
                || string.IsNullOrWhiteSpace(email)
                || string.IsNullOrWhiteSpace(description)
                || string.IsNullOrWhiteSpace(password)
                || string.IsNullOrWhiteSpace(whyJoin)
            )
                return Results.BadRequest("Missing required fields.");

            // Validate password strength
            if (!AdminFunctions.IsValidPassword(password!))
                return Results.BadRequest(
                    "Invalid Password: Must be at least 16 characters, one uppercase, one lowercase, one digit, and one special character (@$!%*?&-_). Consider using a passphrase like 'block-curious-sunny-leaves'"
                );

            // Validate email format
            if (!AdminFunctions.IsValidEmail(email))
                return Results.BadRequest("Invalid email address.");

            // Check if email is already a user
            var usersDir = Path.Combine("content", "users");
            if (Directory.Exists(usersDir))
            {
                foreach (var user in Directory.GetDirectories(usersDir))
                {
                    var file = Path.Combine(user, "profile.json");
                    if (!File.Exists(file))
                        continue;

                    // Deserialize user profile to check email
                    var userJson = await File.ReadAllTextAsync(file);
                    var userProfile = JsonSerializer.Deserialize<User>(userJson);
                    if (
                        userProfile?.Email?.Equals(email, StringComparison.OrdinalIgnoreCase)
                        == true
                    )
                        return Results.Conflict("Email already used.");
                }
            }

            // Validate file types and sizes
            if (picture != null)
            {
                if (picture.Length > 5 * 1024 * 1024) // 5MB limit
                    return Results.BadRequest("Picture file too large. Maximum size is 5MB.");
                if (!picture.ContentType.StartsWith("image/") || !IsValidImage(picture))
                    return Results.BadRequest("Picture must be a valid image (jpg, png, webp).");
            }
            if (cv != null)
            {
                if (cv.Length > 10 * 1024 * 1024) // 10MB limit
                    return Results.BadRequest("CV file too large. Maximum size is 10MB.");
                if (cv.ContentType != "application/pdf" || !IsValidPdf(cv))
                    return Results.BadRequest("CV must be a valid PDF.");
            }

            // Create request object
            var request = new Request
            {
                Name = name,
                Email = email,
                Description = description,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                WhyJoin = whyJoin,
            };

            // Create request folder
            var requestId = request.Id;
            var requestDir = Path.Combine("content", "requests", $"request_{requestId}");
            var assetsDir = Path.Combine(requestDir, "assets");
            Directory.CreateDirectory(assetsDir);

            // Save picture if provided
            if (picture != null)
            {
                var ext = Path.GetExtension(picture.FileName).ToLowerInvariant();
                if (ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp")
                    return Results.BadRequest("Picture must be JPG, PNG, or WEBP.");
                if (
                    picture.FileName.Contains("..")
                    || picture.FileName.Contains("/")
                    || picture.FileName.Contains("\\")
                )
                    return Results.BadRequest("Invalid picture filename.");

                var picturePath = Path.Combine(assetsDir, $"picture{ext}");
                using (var stream = new FileStream(picturePath, FileMode.Create))
                {
                    await picture.CopyToAsync(stream);
                }
                request.PicturePath = Path.Combine(
                    "requests",
                    $"request_{requestId}",
                    "assets",
                    $"picture{ext}"
                );
            }

            // Save CV if provided
            if (cv != null)
            {
                if (
                    cv.FileName.Contains("..")
                    || cv.FileName.Contains("/")
                    || cv.FileName.Contains("\\")
                )
                    return Results.BadRequest("Invalid CV filename.");

                var cvPath = Path.Combine(assetsDir, "cv.pdf");
                using (var stream = new FileStream(cvPath, FileMode.Create))
                {
                    await cv.CopyToAsync(stream);
                }
                request.CvPath = Path.Combine(
                    "requests",
                    $"request_{requestId}",
                    "assets",
                    "cv.pdf"
                );
            }

            // Save request metadata
            var metaPath = Path.Combine(requestDir, "meta.json");
            var requestJson = JsonSerializer.Serialize(
                request,
                new JsonSerializerOptions { WriteIndented = true }
            );
            await File.WriteAllTextAsync(metaPath, requestJson);

            // Send confirmation email with sanitized inputs
            var settings = config.Value;
            var sanitizer = new HtmlSanitizer();
            var sanitizedName = sanitizer.Sanitize(name);
            var msg = new MimeMessage();
            msg.From.Add(MailboxAddress.Parse(settings.FromEmail));
            msg.To.Add(MailboxAddress.Parse(email));
            msg.Subject = "Thank You for Your Application!";
            msg.Body = new TextPart("html")
            {
                Text = $"""
                    <h2>Thank You, {sanitizedName}!</h2>
                    <p>We’ve received your application to join Lets Blog.</p>
                    <p>Our team will review your request, and we’ll contact you soon with the result.</p>
                    <hr/>
                    <p style='font-size: 0.8em;'>Questions? Contact us at <a href='mailto:letsblog047@gmail.com'>letsblog047@gmail.com</a></p>
                    """,
            };

            using var client = new SmtpClient();
            await client.ConnectAsync(settings.SmtpHost, settings.SmtpPort, settings.UseSsl);
            await client.AuthenticateAsync(settings.SmtpUser, settings.SmtpPass);
            await client.SendAsync(msg);
            await client.DisconnectAsync(true);

            return Results.Ok("Application submitted successfully.");
        }
        catch (AntiforgeryValidationException)
        {
            return Results.BadRequest("Invalid CSRF token.");
        }
    }

    private static async Task<IResult> GetRequests(
        HttpContext context,
        string? status = null,
        string? q = null,
        int page = 1,
        int limit = 3
    )
    {
        var requestsDir = Path.Combine("content", "requests");
        if (!Directory.Exists(requestsDir))
            return Results.Ok(new { data = new List<Request>(), totalItems = 0 });

        var requests = new List<Request>();
        foreach (var dir in Directory.GetDirectories(requestsDir))
        {
            var metaPath = Path.Combine(dir, "meta.json");
            if (File.Exists(metaPath))
            {
                var json = await File.ReadAllTextAsync(metaPath);
                var request = JsonSerializer.Deserialize<Request>(json);
                if (
                    request != null
                    && (
                        string.IsNullOrEmpty(status)
                        || request.Status.Equals(status, StringComparison.OrdinalIgnoreCase)
                    )
                )
                {
                    if (
                        string.IsNullOrEmpty(q)
                        || request.Name.ToLowerInvariant().Contains(q.ToLowerInvariant())
                        || request.Email.ToLowerInvariant().Contains(q.ToLowerInvariant())
                    )
                    {
                        requests.Add(request);
                    }
                }
            }
        }

        var totalItems = requests.Count;
        var pagedRequests = requests
            .OrderByDescending(r => r.CreationDate)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();

        return Results.Ok(new { data = pagedRequests, totalItems });
    }

    private static async Task<IResult> GetPendingRequestsCount()
    {
        var requestsDir = Path.Combine("content", "requests");
        if (!Directory.Exists(requestsDir))
            return Results.Ok(new { count = 0 });

        int count = 0;
        foreach (var dir in Directory.GetDirectories(requestsDir))
        {
            var metaPath = Path.Combine(dir, "meta.json");
            if (File.Exists(metaPath))
            {
                var json = await File.ReadAllTextAsync(metaPath);
                var request = JsonSerializer.Deserialize<Request>(json);
                if (request?.Status == "Pending")
                    count++;
            }
        }

        return Results.Ok(new { count });
    }

    private static async Task<IResult> GetRequestById(string requestId)
    {
        var metaPath = Path.Combine("content", "requests", $"request_{requestId}", "meta.json");
        if (!File.Exists(metaPath))
            return Results.NotFound("Request not found.");

        var json = await File.ReadAllTextAsync(metaPath);
        var request = JsonSerializer.Deserialize<Request>(json);
        return Results.Ok(request);
    }

    private static async Task<IResult> ApproveRequest(
        string requestId,
        HttpContext context,
        IOptions<NotifierSettings> config
    )
    {
        var metaPath = Path.Combine("content", "requests", $"request_{requestId}", "meta.json");
        if (!File.Exists(metaPath))
            return Results.NotFound("Request not found.");

        var json = await File.ReadAllTextAsync(metaPath);
        var request = JsonSerializer.Deserialize<Request>(json);
        if (request == null)
            return Results.BadRequest("Invalid request data.");

        if (request.Status != "Pending")
            return Results.BadRequest("Request is not pending.");

        // Get current admin username from JWT
        var adminName = context.User?.Identity?.Name ?? "Unknown";

        // Check if email is already a user
        var usersDir = Path.Combine("content", "users");
        if (Directory.Exists(usersDir))
        {
            foreach (var oldUser in Directory.GetDirectories(usersDir))
            {
                var file = Path.Combine(oldUser, "profile.json");
                if (!File.Exists(file))
                    continue;

                // Deserialize user profile to check email
                var oldUserJson = await File.ReadAllTextAsync(file);
                var userProfile = JsonSerializer.Deserialize<User>(oldUserJson);
                if (
                    userProfile?.Email?.Equals(request.Email, StringComparison.OrdinalIgnoreCase)
                    == true
                )
                    return Results.Conflict("Email already used.");
            }
        }

        // Create user
        var usernameBase = Regex.Replace(request.Name.ToLowerInvariant(), @"[^a-z0-9\s-]", "");
        usernameBase = Regex.Replace(usernameBase, @"[\s-]+", "-").Trim('-');
        var root = Path.Combine("content", "users");
        var counter = 1;
        var username = usernameBase;

        var existing = Directory
            .GetDirectories(root)
            .Select(d => Path.GetFileName(d)?.Split('-', 4).Last()?.ToLowerInvariant())
            .ToHashSet();

        while (existing.Contains(username))
        {
            username = $"{usernameBase}-{counter++}";
        }
        var userDir = Path.Combine("content", "users", username);
        Directory.CreateDirectory(userDir);
        var userPath = Path.Combine(userDir, "profile.json");
        if (File.Exists(userPath))
            return Results.Conflict("User already exists.");

        var user = new User
        {
            Username = username,
            Name = request.Name,
            Email = request.Email,
            Description = request.Description,
            PasswordHash = request.PasswordHash,
            Role = "author",
            ProfilePicture = null,
            PasswordSetDate = DateTime.UtcNow,
        };

        // Move profile picture if it exists
        if (!string.IsNullOrEmpty(request.PicturePath))
        {
            var sourcePicturePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "content",
                request.PicturePath
            );
            if (File.Exists(sourcePicturePath))
            {
                var ext = Path.GetExtension(sourcePicturePath).ToLowerInvariant();
                var destPicturePath = Path.Combine(userDir, $"profile-pic{ext}");
                File.Move(sourcePicturePath, destPicturePath);
                user.ProfilePicture = Path.Combine(
                    "content",
                    "users",
                    username,
                    $"profile-pic{ext}"
                );
            }
            else
            {
                Console.WriteLine($"Warning: Profile picture not found at {sourcePicturePath}");
            }
        }

        // Save user
        var userJson = JsonSerializer.Serialize(
            user,
            new JsonSerializerOptions { WriteIndented = true }
        );
        await File.WriteAllTextAsync(userPath, userJson);

        // Update request status
        request.Status = "Approved";
        request.ReviewedBy = adminName;
        var updatedJson = JsonSerializer.Serialize(
            request,
            new JsonSerializerOptions { WriteIndented = true }
        );
        await File.WriteAllTextAsync(metaPath, updatedJson);

        // Send approval email with sanitized inputs
        var settings = config.Value;
        var sanitizer = new HtmlSanitizer();
        var sanitizedName = sanitizer.Sanitize(request.Name);
        var sanitizedUsername = sanitizer.Sanitize(username);
        var msg = new MimeMessage();
        msg.From.Add(MailboxAddress.Parse(settings.FromEmail));
        msg.To.Add(MailboxAddress.Parse(request.Email));
        msg.Subject = "Your Application Has Been Approved!";
        msg.Body = new TextPart("html")
        {
            Text = $"""
                <h2>Congratulations, {sanitizedName}!</h2>
                <p>Your application to join Lets Blog has been approved.</p>
                <p>You can now log in using your username: {sanitizedUsername} and password at <a href="{settings.BaseUrl}/login">{settings.BaseUrl}/login</a>.</p>
                <hr/>
                <p style='font-size: 0.8em;'>Questions? Contact us at <a href='mailto:letsblog047@gmail.com'>letsblog047@gmail.com</a></p>
                """,
        };

        using var client = new SmtpClient();
        await client.ConnectAsync(settings.SmtpHost, settings.SmtpPort, settings.UseSsl);
        await client.AuthenticateAsync(settings.SmtpUser, settings.SmtpPass);
        await client.SendAsync(msg);
        await client.DisconnectAsync(true);

        return Results.Ok("Request approved and user created.");
    }

    private static async Task<IResult> DenyRequest(
        string requestId,
        HttpContext context,
        IOptions<NotifierSettings> config
    )
    {
        var metaPath = Path.Combine("content", "requests", $"request_{requestId}", "meta.json");
        if (!File.Exists(metaPath))
            return Results.NotFound("Request not found.");

        var json = await File.ReadAllTextAsync(metaPath);
        var request = JsonSerializer.Deserialize<Request>(json);
        if (request == null)
            return Results.BadRequest("Invalid request data.");

        if (request.Status != "Pending")
            return Results.BadRequest("Request is not pending.");

        // Get current admin username from JWT
        var adminName = context.User?.Identity?.Name ?? "Unknown";

        // Update request status
        request.Status = "Denied";
        request.ReviewedBy = adminName;
        var updatedJson = JsonSerializer.Serialize(
            request,
            new JsonSerializerOptions { WriteIndented = true }
        );
        await File.WriteAllTextAsync(metaPath, updatedJson);

        // Send denial email with sanitized inputs
        var settings = config.Value;
        var sanitizer = new HtmlSanitizer();
        var sanitizedName = sanitizer.Sanitize(request.Name);
        var msg = new MimeMessage();
        msg.From.Add(MailboxAddress.Parse(settings.FromEmail));
        msg.To.Add(MailboxAddress.Parse(request.Email));
        msg.Subject = "Update on Your Application";
        msg.Body = new TextPart("html")
        {
            Text = $"""
                <h2>Dear {sanitizedName},</h2>
                <p>Thank you for applying to join Lets Blog.</p>
                <p>After careful consideration, we regret to inform you that your application has not been approved at this time.</p>
                <p>We appreciate your interest and encourage you to apply again in the future.</p>
                <hr/>
                <p style='font-size: 0.8em;'>Questions? Contact us at <a href='mailto:letsblog047@gmail.com'>letsblog047@gmail.com</a></p>
                """,
        };

        using var client = new SmtpClient();
        await client.ConnectAsync(settings.SmtpHost, settings.SmtpPort, settings.UseSsl);
        await client.AuthenticateAsync(settings.SmtpUser, settings.SmtpPass);
        await client.SendAsync(msg);
        await client.DisconnectAsync(true);

        return Results.Ok("Request denied.");
    }
}
