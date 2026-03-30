namespace TaxiBotTest.Models;

public enum OperatorRole
{
    Operator = 1,
    Administrator = 2
}

public enum UserState
{
    WaitingForLanguage,
    WaitingForFirstName,
    WaitingForLastName,
    Idle,
    WaitingForProblemType,
    WaitingForMessage,
    InChat
}

public class UserSession
{
    public long ChatId { get; set; }
    public UserState State { get; set; } = UserState.WaitingForLanguage;
    public string TempLanguage { get; set; } = "uk";
    public string? TempFirstName { get; set; }
    public ProblemType? SelectedProblem { get; set; }
    public int? ActiveRequestId { get; set; }
}

public enum ProblemType
{
    Accident = 1,
    LateDriver = 2,
    WrongRoute = 3,
    PaymentIssue = 4,
    DriverBehavior = 5,
    Other = 6
}

public enum RequestStatus
{
    New = 1,
    InProgress = 2,
    Completed = 3
}

public static class ProblemTypeExtensions
{
    public static string ToCallbackData(this ProblemType type) => $"problem_{(int)type}";

    public static ProblemType? FromCallbackData(string data)
    {
        if (data.StartsWith("problem_") && int.TryParse(data[8..], out var id))
            return (ProblemType)id;
        return null;
    }

    public static string ToDisplayName(this ProblemType type) => type switch
    {
        ProblemType.Accident       => "Accident",
        ProblemType.LateDriver     => "LateDriver",
        ProblemType.WrongRoute     => "WrongRoute",
        ProblemType.PaymentIssue   => "PaymentIssue",
        ProblemType.DriverBehavior => "DriverBehavior",
        ProblemType.Other          => "Other",
        _                          => "Unknown"
    };
}

public static class LanguageCodes
{
    public const string Uk = "uk";
    public const string En = "en";
    public const string Pl = "pl";
    public const string Ru = "ru";

    public static readonly string[] All = [Uk, En, Pl, Ru];

    public static bool IsValid(string lang) => All.Contains(lang);
}
