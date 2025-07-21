using System;

namespace FileBlogSystem.Features.Joining;

public class Request
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? PicturePath { get; set; } = string.Empty;
    public string WhyJoin { get; set; } = string.Empty;
    public string? CvPath { get; set; } = string.Empty;
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Pending";
    public string? ReviewedBy { get; set; } = string.Empty;
}