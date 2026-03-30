using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TaxiBotTest.Hubs;

[Authorize]
public class ChatHub : Hub
{
    /// <summary>Operator joins the general operators group to receive all request events.</summary>
    public async Task JoinOperatorGroup()
        => await Groups.AddToGroupAsync(Context.ConnectionId, "operators");

    /// <summary>Operator joins a specific request group to receive messages for that request.</summary>
    public async Task JoinRequestGroup(int requestId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, $"request_{requestId}");

    /// <summary>Operator leaves a specific request group.</summary>
    public async Task LeaveRequestGroup(int requestId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"request_{requestId}");
}
