using TaxiBotTest.Models;

namespace TaxiBotTest.Models.Entities;

public class AppUser
{
    public int Id { get; set; }
    public string Login { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public UserStatus Status { get; set; } = UserStatus.Available;
    public OperatorRole Role { get; set; } = OperatorRole.Operator;
    public DateTime RegisteredAt { get; set; }

    public ICollection<Request> AssignedRequests { get; set; } = [];
}
