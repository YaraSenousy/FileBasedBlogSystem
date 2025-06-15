public class User
{
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public List<string> Roles { get; set; } = new();
}
