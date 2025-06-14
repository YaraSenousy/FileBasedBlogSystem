using System.Text;
using FileBlogSystem.Features.Posting;

namespace FileBlogSystem.Features.Render.Feed;

public static class RssFeed
{
    public static void MapRssFeed(this WebApplication app)
    {
        app.MapGet("/rss.xml", GetRss);
    }

    public static async Task<IResult> GetRss()
    {
        var xml = RssWriter.GenerateRssXml(); 
        return Results.Text(xml, "application/rss+xml", Encoding.UTF8);
    }
}
