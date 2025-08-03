using System.ServiceModel.Syndication;
using System.Xml;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Options;
using MimeKit;

public class RssEmailNotifierService : BackgroundService
{
    private readonly ILogger<RssEmailNotifierService> _logger;
    private readonly NotifierSettings _settings;
    private readonly EmailSubscriberService _subscriberService;
    private DateTime _lastPublished = DateTime.MinValue;
    private readonly string _rssUrl;

    public RssEmailNotifierService(
        ILogger<RssEmailNotifierService> logger,
        IOptions<NotifierSettings> options,
        EmailSubscriberService subscriberService
    )
    {
        _logger = logger;
        _settings = options.Value;
        _rssUrl = _settings.RssUrl;
        _subscriberService = subscriberService;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var reader = XmlReader.Create(_rssUrl);
                var feed = SyndicationFeed.Load(reader);
                var latest = feed.Items.FirstOrDefault();

                if (latest != null && latest.PublishDate.UtcDateTime > _lastPublished)
                {
                    _lastPublished = latest.PublishDate.UtcDateTime;
                    await SendEmailAsync(latest);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking RSS feed");
            }

            await Task.Delay(TimeSpan.FromMinutes(_settings.PollIntervalMinutes), stoppingToken);
        }
    }

    private async Task SendEmailAsync(SyndicationItem item)
    {
        var bodyTemplate = """
                <h3>{0}</h3>
                <p>{1}</p>
                <p><a href='{2}'>Read more</a></p>
                <hr/>
                <p style='font-size: 0.8em;'>Don't want updates? <a href='{3}/unsubscribe?email={4}'>Unsubscribe</a></p>
            """;

        foreach (var email in _subscriberService.All())
        {
            var encodedEmail = Uri.EscapeDataString(email);
            var body = string.Format(
                bodyTemplate,
                item.Title.Text,
                item.Summary.Text,
                item.Links[0].Uri,
                _settings.BaseUrl,
                encodedEmail
            );

            var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(_settings.FromEmail));
            message.To.Add(MailboxAddress.Parse(email));
            message.Subject = "New Blog Post: " + item.Title.Text;
            message.Body = new TextPart("html")
            {
                Text = body.Replace("{{email}}", Uri.EscapeDataString(email)),
            };

            using var client = new SmtpClient();
            try
            {
                await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, _settings.UseSsl);
                await client.AuthenticateAsync(_settings.SmtpUser, _settings.SmtpPass);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Failed to send email to " + email + ": " + ex.Message);
            }
        }
    }
}
