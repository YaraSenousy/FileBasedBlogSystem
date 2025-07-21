using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using BCrypt.Net;
using FileBlogSystem.Features.Security;
using FileBlogSystem.Features.Admin;
using MailKit.Net.Smtp;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using MimeKit;

namespace FileBlogSystem.Features.Joining;

public static class JoinRequests
{
    public static void MapJoinRequests(this WebApplication app)
    {
        app.MapPost("/join", HandleJoinRequest);
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
            foreach (var file in Directory.GetFiles(usersDir, "*.json"))
            {
                var userJson = await File.ReadAllTextAsync(file);
                var user = JsonSerializer.Deserialize<User>(userJson);
                if (user?.Email?.Equals(email, StringComparison.OrdinalIgnoreCase) == true)
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
                <p style='font-size: 0.8em;'>Questions? Contact us at <a href='mailto:letsg047@gmail.com'>letsblog047@gmail.com</a></p>
                """,
        };

        using var client = new SmtpClient();
        await client.ConnectAsync(settings.SmtpHost, settings.SmtpPort, settings.UseSsl);
        await client.AuthenticateAsync(settings.SmtpUser, settings.SmtpPass);
        await client.SendAsync(msg);
        await client.DisconnectAsync(true);

        return Results.Ok("Application submitted successfully.");
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
