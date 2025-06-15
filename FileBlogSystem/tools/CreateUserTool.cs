// dotnet run --project tools/CreateUserTool.csproj admin 123456 admin,editor
using System.Text.Json;
using BCrypt.Net;

if (args.Length < 3)
{
    Console.WriteLine("Usage: dotnet run <username> <password> <role1,role2>");
    return;
}

var username = args[0];
var password = args[1];
var roles = args[2].Split(',', StringSplitOptions.RemoveEmptyEntries);

var hash = BCrypt.Net.BCrypt.HashPassword(password);

var user = new
{
    username = username,
    passwordHash = hash,
    roles = roles
};

var json = JsonSerializer.Serialize(user, new JsonSerializerOptions { WriteIndented = true });

var path = Path.Combine("content", "users", username);
Directory.CreateDirectory(path);
File.WriteAllText(Path.Combine(path, "profile.json"), json);

Console.WriteLine($"Created user: {username}");
