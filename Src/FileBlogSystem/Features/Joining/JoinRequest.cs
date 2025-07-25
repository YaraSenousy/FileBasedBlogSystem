using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using BCrypt.Net;
using FileBlogSystem.Features.Admin;
using FileBlogSystem.Features.Security;
using MailKit.Net.Smtp;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using MimeKit;
using System.Text.RegularExpressions;

namespace FileBlogSystem.Features.Joining;

public static class JoinRequests
{
    public static void MapJoinRequests(this WebApplication app)
    {
        app.MapPost("/join", HandleJoinRequest);
        app.MapGet("/all-requests", GetRequests).RequireAuthorization("AdminLevel");
        app.MapGet("/all-requests/pending/count", GetPendingRequestsCount)
            .RequireAuthorization("AdminLevel");
        app.MapGet("/all-requests/{requestId}", GetRequestById).RequireAuthorization("AdminLevel");
        app.MapPost("/all-requests/{requestId}/approve", ApproveRequest)
            .RequireAuthorization("AdminLevel");
        app.MapPost("/all-requests/{requestId}/deny", DenyRequest)
            .RequireAuthorization("AdminLevel");
    }

    private static async Task<IResult> HandleJoinRequest(
        HttpContext context,
        IOptions<NotifierSettings> config
    )
    {
        if (!context.Request.HasFormContentType)
            return Results.BadRequest("Invalid form data.");

        var form = await context.Request.ReadFormAsync();
        var name = form["name"].ToString();
        var email = form["email"].ToString();
        var description = form["description"].ToString();
        var password = form["password"].ToString();
        var whyJoin = form["whyJoin"].ToString();
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
                "Invalid Password: Must be at least 8 characters, one uppercase, one lowercase, one digit"
            );

        // Validate email format
        if (!IsValidEmail(email))
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
                if (userProfile?.Email?.Equals(email, StringComparison.OrdinalIgnoreCase) == true)
                    return Results.Conflict("Email already used.");
            }
        }

        // Validate file types
        if (picture != null && !picture.ContentType.StartsWith("image/"))
            return Results.BadRequest("Picture must be an image (jpg/png).");
        if (cv != null && cv.ContentType != "application/pdf")
            return Results.BadRequest("CV must be a PDF.");

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
            var cvPath = Path.Combine(assetsDir, "cv.pdf");
            using (var stream = new FileStream(cvPath, FileMode.Create))
            {
                await cv.CopyToAsync(stream);
            }
            request.CvPath = Path.Combine("requests", $"request_{requestId}", "assets", "cv.pdf");
        }

        // Save request metadata
        var metaPath = Path.Combine(requestDir, "meta.json");
        var requestJson = JsonSerializer.Serialize(
            request,
            new JsonSerializerOptions { WriteIndented = true }
        );
        await File.WriteAllTextAsync(metaPath, requestJson);

        // Send confirmation email
        var settings = config.Value;
        var msg = new MimeMessage();
        msg.From.Add(MailboxAddress.Parse(settings.FromEmail));
        msg.To.Add(MailboxAddress.Parse(email));
        msg.Subject = "Thank You for Your Application!";
        msg.Body = new TextPart("html")
        {
            Text = $"""
                <h2>Thank You, {name}!</h2>
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
            .OrderBy(r => r.CreationDate)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();

        return Results.Ok(requests);
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
                if (userProfile?.Email?.Equals(request.Email, StringComparison.OrdinalIgnoreCase) == true)
                    return Results.Conflict("Email already used.");
            }
        }

        // Create user
        var usernameBase = Regex.Replace(request.Name.ToLowerInvariant(), @"[^a-z0-9\s-]", "");
        usernameBase = Regex.Replace(usernameBase, @"[\s-]+", "-").Trim('-');
        var root = Path.Combine("content", "users");
        var counter = 1;
        var username = usernameBase;

        var existing = Directory.GetDirectories(root)
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

        // Send approval email
        var settings = config.Value;
        var msg = new MimeMessage();
        msg.From.Add(MailboxAddress.Parse(settings.FromEmail));
        msg.To.Add(MailboxAddress.Parse(request.Email));
        msg.Subject = "Your Application Has Been Approved!";
        msg.Body = new TextPart("html")
        {
            Text = $"""
                <h2>Congratulations, {request.Name}!</h2>
                <p>Your application to join Lets Blog has been approved.</p>
                <p>You can now log in using your username: {username} and password at <a href="{settings.BaseUrl}/login">{settings.BaseUrl}/login</a>.</p>
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

        // Send denial email
        var settings = config.Value;
        var msg = new MimeMessage();
        msg.From.Add(MailboxAddress.Parse(settings.FromEmail));
        msg.To.Add(MailboxAddress.Parse(request.Email));
        msg.Subject = "Update on Your Application";
        msg.Body = new TextPart("html")
        {
            Text = $"""
                <h2>Dear {request.Name},</h2>
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

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}
