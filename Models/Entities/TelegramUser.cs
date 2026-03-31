using TaxiBotTest.Models;

namespace TaxiBotTest.Models.Entities;

public class TelegramUser
{
    public int Id { get; set; }
    public long ChatId { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string FullName { get; set; } = "";
    public string? Username { get; set; }
    public string Language { get; set; } = LanguageCodes.Uk;
    public bool IsRegistered { get; set; }
    public DateTime RegisteredAt { get; set; }
    public DriverStatus DriverStatus { get; set; } = DriverStatus.None;

    public ICollection<Request> Requests { get; set; } = [];
}
