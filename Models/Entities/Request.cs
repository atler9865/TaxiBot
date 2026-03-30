namespace TaxiBotTest.Models.Entities;

public class Request
{
    public int Id { get; set; }
    public int TelegramUserId { get; set; }
    public TelegramUser TelegramUser { get; set; } = null!;
    public ProblemType ProblemType { get; set; }
    public string InitialMessage { get; set; } = "";
    public RequestStatus Status { get; set; } = RequestStatus.New;
    public int? AssignedOperatorId { get; set; }
    public AppUser? AssignedOperator { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? AssignedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public ICollection<Message> Messages { get; set; } = [];
}
