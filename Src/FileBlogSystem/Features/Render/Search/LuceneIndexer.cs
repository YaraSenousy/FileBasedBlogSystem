using Lucene.Net.Analysis.Standard;
using Lucene.Net.Documents;
using Lucene.Net.Index;
using Lucene.Net.Store;
using Lucene.Net.Util;
using FileBlogSystem.Features.Posting;
using Lucene.Net.Analysis.En;

namespace FileBlogSystem.Features.Render.Search;

public static class LuceneIndexer
{
    private static readonly string IndexPath = Path.Combine(AppContext.BaseDirectory, "lucene_index");
    private static readonly LuceneVersion AppLuceneVersion = LuceneVersion.LUCENE_48;

    private static IndexWriter GetWriter()
    {
        var dir = FSDirectory.Open(IndexPath);
        var analyzer = new StandardAnalyzer(AppLuceneVersion);
        var config = new IndexWriterConfig(AppLuceneVersion, analyzer);
        return new IndexWriter(dir, config);
    }

    public static List<Post> LoadAllPosts(string? status = null)
    {
        var postsDir = Path.Combine(System.IO.Directory.GetCurrentDirectory(), "content", "posts");
        if (!System.IO.Directory.Exists(postsDir))
            return [];

        var allPosts = System.IO.Directory
            .GetDirectories(postsDir)
            .Select(PostReader.ReadPostFromFolder)
            .Where(p => p != null)
            .ToList();

        if (!string.IsNullOrEmpty(status))
            allPosts = allPosts.Where(p => p!.Status == status).ToList();

        return allPosts!;
    }
    public static void RebuildIndex()
    {
        if (!System.IO.Directory.Exists(IndexPath))
            System.IO.Directory.CreateDirectory(IndexPath);

        using var dir = FSDirectory.Open(IndexPath);
        var analyzer = new EnglishAnalyzer(AppLuceneVersion);
        var config = new IndexWriterConfig(AppLuceneVersion, analyzer)
        {
            OpenMode = OpenMode.CREATE
        };

        using var writer = new IndexWriter(dir, config);

        var posts = LoadAllPosts();

        foreach (var post in posts)
        {
            var doc = new Document
        {
            new StringField("Slug", post.Slug ?? "", Field.Store.YES),
            new TextField("Title", post.Title ?? "", Field.Store.YES),
            new TextField("Description", post.Description ?? "", Field.Store.YES),
            new TextField("Content", post.HtmlContent ?? "", Field.Store.YES),
            new TextField("RawMarkdown", post.RawMarkdown ?? "", Field.Store.YES),
            new StringField("Author", post.CreatedBy ?? "", Field.Store.YES),
            new StringField("ModifiedBy", post.ModifiedBy ?? "", Field.Store.YES),
            new StringField("Status", post.Status ?? "", Field.Store.YES),
            new StringField("Published", post.Published.ToString("o"), Field.Store.YES),
            new StringField("Modified", post.Modified.ToString("o"), Field.Store.YES)
        };

            foreach (var tag in post.Tags ?? Enumerable.Empty<string>())
                doc.Add(new StringField("Tag", tag, Field.Store.YES));

            foreach (var cat in post.Categories ?? Enumerable.Empty<string>())
                doc.Add(new StringField("Category", cat, Field.Store.YES));

            foreach (var media in post.MediaUrls ?? Enumerable.Empty<string>())
                doc.Add(new StringField("MediaUrl", media, Field.Store.YES));

            writer.AddDocument(doc);
        }

        writer.Commit();
    }

    public static void IndexPost(Post post)
    {
        using var writer = GetWriter();

        var doc = new Document
    {
        new StringField("Slug", post.Slug, Field.Store.YES),
        new TextField("Title", post.Title ?? "", Field.Store.YES),
        new TextField("Description", post.Description ?? "", Field.Store.YES),
        new TextField("Content", post.HtmlContent ?? "", Field.Store.YES),
        new TextField("RawMarkdown", post.RawMarkdown ?? "", Field.Store.YES),
        new StringField("Author", post.CreatedBy ?? "", Field.Store.YES),
        new StringField("ModifiedBy", post.ModifiedBy ?? "", Field.Store.YES),
        new StringField("Status", post.Status ?? "", Field.Store.YES),
        new StringField("Published", post.Published.ToString("o"), Field.Store.YES),
        new StringField("Modified", post.Modified.ToString("o"), Field.Store.YES)
    };

        if (post.Tags != null)
            foreach (var tag in post.Tags)
                doc.Add(new StringField("Tag", tag, Field.Store.YES));

        if (post.Categories != null)
            foreach (var cat in post.Categories)
                doc.Add(new StringField("Category", cat, Field.Store.YES));

        if (post.MediaUrls != null)
            foreach (var media in post.MediaUrls)
                doc.Add(new StringField("MediaUrl", media, Field.Store.YES));

        writer.UpdateDocument(new Term("Slug", post.Slug), doc);
        writer.Commit();
    }

    public static void DeletePost(string slug)
    {
        using var writer = GetWriter();
        writer.DeleteDocuments(new Term("Slug", slug));
        writer.Commit();
    }
}
