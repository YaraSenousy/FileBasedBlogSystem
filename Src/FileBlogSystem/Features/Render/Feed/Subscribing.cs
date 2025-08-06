using System.Net;
using System.Text;
using Ganss.Xss;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Options;
using MimeKit;

namespace FileBlogSystem.Features.Render.Feed;

public static class Subscribing
{
    public static void MapSubscribe(this WebApplication app)
    {
        app.MapPost("/subscribe", Subscribe).RequireRateLimiting("login");
        app.MapGet("/unsubscribe", Unsubscribe);
    }

    /*
    Handles subscribing users to receiving emails when a blog is posted
    */
    public static async Task<IResult> Subscribe(
        string email,
        EmailSubscriberService svc,
        IOptions<NotifierSettings> config
    )
    {
        if (!svc.IsValidEmail(email))
            return Results.BadRequest("Invalid email address.");

        if (!svc.Add(email))
            return Results.Conflict("Email already subscribed.");

        var settings = config.Value;
        var msg = new MimeMessage();
        msg.From.Add(MailboxAddress.Parse(settings.FromEmail));
        msg.To.Add(MailboxAddress.Parse(email));
        msg.Subject = "You're now subscribed to blog updates!";
        msg.Body = new TextPart("html")
        {
            Text = $"""
                    <h2>Welcome!</h2>
                    <p>You’ve successfully subscribed to our blog updates.</p>
                    <p>You’ll receive a notification when new posts are published.</p>
                    <hr/>
                    <p style='font-size: 0.8em;'>Want out? <a href='{settings.BaseUrl}/unsubscribe?email={Uri.EscapeDataString(
                    email
                )}'>Unsubscribe</a></p>
                """,
        };

        using var client = new SmtpClient();
        await client.ConnectAsync(settings.SmtpHost, settings.SmtpPort, settings.UseSsl);
        await client.AuthenticateAsync(settings.SmtpUser, settings.SmtpPass);
        await client.SendAsync(msg);
        await client.DisconnectAsync(true);
        return Results.Ok("Subscribed successfully.");
    }

    /*
    Handles unsubscribing users from receiving emails
    */
    public static IResult Unsubscribe(string email, EmailSubscriberService svc)
    {
        if (svc.Remove(email))
        {
            var sanitizer = new HtmlSanitizer();
            var sanitizedEmail = sanitizer.Sanitize(email);
            var htmlContent = $"""
                <html>
                <head><title>Unsubscribed</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 2em;">
                    <h2>Unsubscribed</h2>
                    <p><strong>{sanitizedEmail}</strong> has been removed from our mailing list.</p>
                    <a href="/" style="display:inline-block;margin-top:1em;">Back to home</a>
                </body>
                </html>
                """;
            return Results.Content(sanitizer.Sanitize(htmlContent), "text/html");
        }

        return Results.NotFound("You are not subscribed.");
    }
}
