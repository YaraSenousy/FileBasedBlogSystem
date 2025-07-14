using System.Net.Mail;

public class EmailSubscriberService
{
    private readonly string _filePath = Path.Combine("content", "subscribers.txt");
    private readonly HashSet<string> _emails = new(StringComparer.OrdinalIgnoreCase);

    public EmailSubscriberService()
    {
        if (File.Exists(_filePath))
        {
            foreach (var line in File.ReadAllLines(_filePath))
            {
                var trimmed = line.Trim();
                if (!string.IsNullOrEmpty(trimmed))
                    _emails.Add(trimmed);
            }
        }
    }

    public bool IsValidEmail(string email)
    {
        try { _ = new MailAddress(email); return true; }
        catch { return false; }
    }
    
    public bool Add(string email)
    {
        var normalized = email.Trim();
        if (!IsValidEmail(normalized)) return false;

        if (_emails.Add(normalized))
        {
            File.AppendAllLines(_filePath, new[] { normalized });
            return true;
        }
        return false;
    }

    public bool Remove(string email)
    {
        var normalized = email.Trim();
        if (_emails.Remove(normalized))
        {
            File.WriteAllLines(_filePath, _emails);
            return true;
        }
        return false;
    }

    public IEnumerable<string> All() => _emails;
}