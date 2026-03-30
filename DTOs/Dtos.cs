namespace TaxiBotTest.DTOs;

// ── Auth ──────────────────────────────────────────────────────────────────────

public record LoginRequest(string Login, string Password);

public record LoginResponse(string Token, OperatorDto Operator);

// ── Operators ─────────────────────────────────────────────────────────────────

public record OperatorDto(int Id, string Login, string FirstName, string LastName, bool IsAvailable, string Role);

public record CreateUserRequest(string Login, string Password, string FirstName, string LastName, string Role);

// ── Requests ──────────────────────────────────────────────────────────────────

public class RequestDto
{
    public int Id { get; init; }
    public string ProblemType { get; init; } = "";
    public string ProblemTypeLabel { get; init; } = "";
    public string InitialMessage { get; init; } = "";
    public string Status { get; init; } = "";
    public DateTime CreatedAt { get; init; }
    public DateTime? AssignedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public int? AssignedOperatorId { get; init; }
    public string? AssignedOperatorName { get; init; }
    public string UserFirstName { get; init; } = "";
    public string UserLastName { get; init; } = "";
    public string? UserUsername { get; init; }
}

public class RequestDetailDto : RequestDto
{
    public List<MessageDto> Messages { get; init; } = [];
}

// ── Messages ──────────────────────────────────────────────────────────────────

public class MessageDto
{
    public int Id { get; init; }
    public int RequestId { get; init; }
    public string Text { get; init; } = "";
    public DateTime SentAt { get; init; }
    public bool IsFromOperator { get; init; }
    public string? SenderName { get; init; }
}

public record SendMessageRequest(string Text);

// ── Drivers ───────────────────────────────────────────────────────────────────

public record TelegramUserDto(
    int Id, long ChatId,
    string FirstName, string LastName,
    string? Username, string Language,
    bool IsRegistered, DateTime RegisteredAt,
    int RequestsCount);

// ── Misc ──────────────────────────────────────────────────────────────────────

public record UnassignedCountDto(int Count);
