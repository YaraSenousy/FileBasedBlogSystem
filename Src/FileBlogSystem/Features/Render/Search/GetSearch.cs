using FileBlogSystem.Features.Posting;
using Lucene.Net.Analysis.En;
using Lucene.Net.Index;
using Lucene.Net.QueryParsers.Classic;
using Lucene.Net.Search;
using Lucene.Net.Store;
using Lucene.Net.Util;

namespace FileBlogSystem.Features.Render.Search;

public static class GetSearch
{
    private static readonly string IndexPath = Path.Combine(AppContext.BaseDirectory, "lucene_index");
    private static readonly LuceneVersion AppLuceneVersion = LuceneVersion.LUCENE_48;

    public static void MapSearchEndpoint(this WebApplication app)
    {
        app.MapGet("/search", HandleSearch);
    }

    /*
    GET /search?q=term&page=1&limit=5
    Handles searching publshed posts by title, description, or content
    paginates them, and returns posts ordered by publish time as JSON.
    */
    public static IResult HandleSearch(HttpContext context)
    {
        var q = context.Request.Query["q"].ToString();
        if (string.IsNullOrWhiteSpace(q))
            return Results.BadRequest("Missing search term");

        var page = int.TryParse(context.Request.Query["page"], out var p) ? p : 1;
        var limit = int.TryParse(context.Request.Query["limit"], out var l) ? l : 5;

        using var dir = FSDirectory.Open(IndexPath);
        using var reader = DirectoryReader.Open(dir);

        var searcher = new IndexSearcher(reader);
        var analyzer = new EnglishAnalyzer(AppLuceneVersion);

        var parser = new MultiFieldQueryParser(AppLuceneVersion, new[] { "Title", "Description", "Content", "Author" }, analyzer);
        Query query;
        try
        {
            query = parser.Parse(q);
        }
        catch (ParseException)
        {
            return Results.BadRequest("Invalid search query");
        }

        var hits = searcher.Search(query, page * limit);
        var totalItems = hits.TotalHits;
        var pagedHits = hits.ScoreDocs.Skip((page - 1) * limit).Take(limit);

        var results = pagedHits.Select(hit =>
        {
            var doc = searcher.Doc(hit.Doc);
            return new Post
            {
                Slug = doc.Get("Slug"),
                Title = doc.Get("Title"),
                Description = doc.Get("Description"),
                HtmlContent = doc.Get("Content"),
                RawMarkdown = doc.Get("RawMarkdown"),
                CreatedBy = doc.Get("Author"),
                ModifiedBy = doc.Get("ModifiedBy"),
                Status = doc.Get("Status"),
                Published = DateTime.Parse(doc.Get("Published")),
                Modified = DateTime.Parse(doc.Get("Modified")),
                Tags = doc.GetValues("Tag").ToList(),
                Categories = doc.GetValues("Category").ToList(),
                MediaUrls = doc.GetValues("MediaUrl").ToList()
            };
        }).ToList();

        return Results.Ok(new { data = results, totalItems });
    }
}
