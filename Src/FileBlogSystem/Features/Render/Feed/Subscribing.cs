using System.Text;

namespace FileBlogSystem.Features.Render.Feed;

public static class Subscribing
{
    public static void MapSubscribe(this WebApplication app)
    {
        app.MapPost("/subscribe", Subscribe);
        app.MapGet("/unsubscribe", Unsubscribe);
    }

    /*
    Handles subscribing users to receiving emails when a blog is posted
    */
    public static IResult Subscribe(string email, EmailSubscriberService svc)
    {
        if (!svc.IsValidEmail(email))
            return Results.BadRequest("Invalid email address.");

        if (svc.Add(email))
            return Results.Ok("Subscribed successfully.");

        return Results.Conflict("Email already subscribed.");
    }

    /*
    Handles unsubscribing users from receiving emails
    */
    public static IResult Unsubscribe(string email, EmailSubscriberService svc)
    {
        if (svc.Remove(email)) return Results.Ok("Unsubscribed successfully.");
        return Results.NotFound("Email not found.");
    }
}