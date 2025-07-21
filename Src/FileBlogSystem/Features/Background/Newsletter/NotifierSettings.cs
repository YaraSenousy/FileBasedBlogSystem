// NotifierSettings.cs
public class NotifierSettings
{
    public string RssUrl { get; set; } = string.Empty;
    public int PollIntervalMinutes { get; set; } = 15;
    public string FromEmail { get; set; } = string.Empty;
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; }
    public bool UseSsl { get; set; }
    public string SmtpUser { get; set; } = string.Empty;
    public string SmtpPass { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
}