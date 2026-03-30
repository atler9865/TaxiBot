namespace TaxiBotTest.Models.Entities;

public class Message
{
    public int Id { get; set; }
    public int RequestId { get; set; }
    public Request Request { get; set; } = null!;
    public int? SenderTelegramUserId { get; set; }
    public TelegramUser? SenderTelegramUser { get; set; }
    public int? SenderOperatorId { get; set; }
    public AppUser? SenderOperator { get; set; }
    public string Text { get; set; } = "";
    public DateTime SentAt { get; set; }
    public bool IsFromOperator { get; set; }
}
