public class User
{
    public string Username { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? ProfilePicture { get; set; } = null;
    public string? Description { get; set; } = string.Empty;
    public string? AssignedAuthor { get; set; } = string.Empty;
    public DateTime? PasswordSetDate { get; set; } = DateTime.UtcNow;
}
