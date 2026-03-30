using System.Globalization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using Telegram.Bot;
using Telegram.Bot.Types.Enums;
using TaxiBotTest.Data;
using TaxiBotTest.DTOs;
using TaxiBotTest.Hubs;
using TaxiBotTest.Models;
using TaxiBotTest.Models.Entities;

namespace TaxiBotTest.Services;

public class RequestService(
    IDbContextFactory<AppDbContext> dbFactory,
    IHubContext<ChatHub> hub,
    ITelegramBotClient bot,
    IStringLocalizer<BotMessages> localizer,
    ILogger<RequestService> logger)
{
    public async Task<Request> CreateRequestAsync(
        int telegramUserId, long userChatId, string userLanguage,
        ProblemType problemType, string initialMessage, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);

        var request = new Request
        {
            TelegramUserId = telegramUserId,
            ProblemType = problemType,
            InitialMessage = initialMessage,
            Status = RequestStatus.New,
            CreatedAt = DateTime.UtcNow
        };

        db.Requests.Add(request);
        await db.SaveChangesAsync(ct);

        await db.Entry(request).Reference(r => r.TelegramUser).LoadAsync(ct);

        var dto = await BuildRequestDtoAsync(request, db, ct);
        await hub.Clients.Group("operators").SendAsync("RequestCreated", dto, ct);

        var count = await db.Requests.CountAsync(r => r.Status == RequestStatus.New, ct);
        await hub.Clients.Group("operators").SendAsync("UnassignedCountChanged", count, ct);

        logger.LogInformation("Request {Id} created for user {UserId}", request.Id, telegramUserId);
        return request;
    }

    public async Task<(Request? Request, bool NotFound, bool WrongStatus)> AssignRequestAsync(
        int requestId, int operatorId, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);

        var request = await db.Requests
            .Include(r => r.TelegramUser)
            .Include(r => r.AssignedOperator)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct);

        if (request == null) return (null, true, false);
        if (request.Status != RequestStatus.New) return (null, false, true);

        var op = await db.AppUsers.FindAsync([operatorId], ct);
        if (op == null) return (null, true, false);

        request.Status = RequestStatus.InProgress;
        request.AssignedOperatorId = operatorId;
        request.AssignedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        // Reload operator
        await db.Entry(request).Reference(r => r.AssignedOperator).LoadAsync(ct);

        var dto = await BuildRequestDtoAsync(request, db, ct);
        await hub.Clients.Group("operators").SendAsync("RequestAssigned", dto, ct);

        var count = await db.Requests.CountAsync(r => r.Status == RequestStatus.New, ct);
        await hub.Clients.Group("operators").SendAsync("UnassignedCountChanged", count, ct);

        // Notify user via Telegram
        var operatorName = $"{op.FirstName} {op.LastName}".Trim();
        var msg = Loc(request.TelegramUser.Language, "OperatorConnected", operatorName);
        await SendToUserSafe(request.TelegramUser.ChatId, msg, ct);

        return (request, false, false);
    }

    public async Task<(Request? Request, bool NotFound, bool Forbidden)> CompleteRequestAsync(
        int requestId, int operatorId, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);

        var request = await db.Requests
            .Include(r => r.TelegramUser)
            .Include(r => r.AssignedOperator)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct);

        if (request == null) return (null, true, false);
        if (request.Status != RequestStatus.InProgress || request.AssignedOperatorId != operatorId)
            return (null, false, true);

        request.Status = RequestStatus.Completed;
        request.CompletedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        var dto = await BuildRequestDtoAsync(request, db, ct);
        await hub.Clients.Group("operators").SendAsync("RequestCompleted", dto, ct);
        await hub.Clients.Group($"request_{requestId}").SendAsync("RequestCompleted", dto, ct);

        // Notify user via Telegram
        var msg = Loc(request.TelegramUser.Language, "ChatEndedByOperator");
        await SendToUserSafe(request.TelegramUser.ChatId, msg, ct);

        return (request, false, false);
    }

    public async Task<MessageDto?> AddOperatorMessageAsync(
        int requestId, int operatorId, string text, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);

        var request = await db.Requests
            .Include(r => r.TelegramUser)
            .Include(r => r.AssignedOperator)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct);

        if (request == null || request.Status != RequestStatus.InProgress || request.AssignedOperatorId != operatorId)
            return null;

        var op = request.AssignedOperator!;
        var message = new Message
        {
            RequestId = requestId,
            SenderOperatorId = operatorId,
            Text = text,
            SentAt = DateTime.UtcNow,
            IsFromOperator = true
        };

        db.Messages.Add(message);
        await db.SaveChangesAsync(ct);

        var dto = new MessageDto
        {
            Id = message.Id,
            RequestId = requestId,
            Text = text,
            SentAt = message.SentAt,
            IsFromOperator = true,
            SenderName = $"{op.FirstName} {op.LastName}".Trim()
        };

        await hub.Clients.Group($"request_{requestId}").SendAsync("NewMessage", dto, ct);

        // Forward to Telegram user with localized format
        var displayName = $"{op.FirstName} {op.LastName}".Trim();
        var formatted = displayName + ": " + text;
        await SendToUserSafe(request.TelegramUser.ChatId, formatted, ct, ParseMode.Markdown);

        return dto;
    }

    public async Task AddUserMessageAsync(
        int requestId, int telegramUserId, string text, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);

        var user = await db.TelegramUsers.FindAsync([telegramUserId], ct);

        var message = new Message
        {
            RequestId = requestId,
            SenderTelegramUserId = telegramUserId,
            Text = text,
            SentAt = DateTime.UtcNow,
            IsFromOperator = false
        };

        db.Messages.Add(message);
        await db.SaveChangesAsync(ct);

        var dto = new MessageDto
        {
            Id = message.Id,
            RequestId = requestId,
            Text = text,
            SentAt = message.SentAt,
            IsFromOperator = false,
            SenderName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : null
        };

        await hub.Clients.Group($"request_{requestId}").SendAsync("NewMessage", dto, ct);
    }

    /// <summary>Called when the Telegram user clicks "End Chat" button.</summary>
    public async Task CompleteByUserAsync(int requestId, int telegramUserId, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);

        var request = await db.Requests
            .Include(r => r.TelegramUser)
            .Include(r => r.AssignedOperator)
            .FirstOrDefaultAsync(r => r.Id == requestId && r.TelegramUserId == telegramUserId, ct);

        if (request == null || request.Status == RequestStatus.Completed) return;

        request.Status = RequestStatus.Completed;
        request.CompletedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        var dto = MapToDto(request);
        await hub.Clients.Group("operators").SendAsync("RequestCompleted", dto, ct);
        await hub.Clients.Group($"request_{requestId}").SendAsync("RequestCompleted", dto, ct);

        var count = await db.Requests.CountAsync(r => r.Status == RequestStatus.New, ct);
        await hub.Clients.Group("operators").SendAsync("UnassignedCountChanged", count, ct);
    }

    public async Task<int> GetUnassignedCountAsync(CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        return await db.Requests.CountAsync(r => r.Status == RequestStatus.New, ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string Loc(string language, string key, params object[] args)
    {
        var prev = CultureInfo.CurrentUICulture;
        try
        {
            CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo(language);
            return localizer[key, args].Value;
        }
        finally
        {
            CultureInfo.CurrentUICulture = prev;
        }
    }

    private async Task SendToUserSafe(long chatId, string text, CancellationToken ct, ParseMode parseMode = ParseMode.None)
    {
        try
        {
            await bot.SendMessage(chatId, text, parseMode: parseMode, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send Telegram message to {ChatId}", chatId);
        }
    }

    private static async Task<RequestDto> BuildRequestDtoAsync(Request r, AppDbContext db, CancellationToken ct)
    {
        if (r.TelegramUser == null)
            await db.Entry(r).Reference(x => x.TelegramUser).LoadAsync(ct);
        if (r.AssignedOperator == null && r.AssignedOperatorId != null)
            await db.Entry(r).Reference(x => x.AssignedOperator).LoadAsync(ct);

        return MapToDto(r);
    }

    public static RequestDto MapToDto(Request r) => new()
    {
        Id = r.Id,
        ProblemType = r.ProblemType.ToString(),
        ProblemTypeLabel = r.ProblemType.ToDisplayName(),
        InitialMessage = r.InitialMessage,
        Status = r.Status.ToString(),
        CreatedAt = r.CreatedAt,
        AssignedAt = r.AssignedAt,
        CompletedAt = r.CompletedAt,
        AssignedOperatorId = r.AssignedOperatorId,
        AssignedOperatorName = r.AssignedOperator != null
            ? $"{r.AssignedOperator.FirstName} {r.AssignedOperator.LastName}".Trim()
            : null,
        UserFirstName = r.TelegramUser?.FirstName ?? "",
        UserLastName = r.TelegramUser?.LastName ?? "",
        UserUsername = r.TelegramUser?.Username
    };

    public static MessageDto MapMessageToDto(Message m) => new()
    {
        Id = m.Id,
        RequestId = m.RequestId,
        Text = m.Text,
        SentAt = m.SentAt,
        IsFromOperator = m.IsFromOperator,
        SenderName = m.IsFromOperator
            ? (m.SenderOperator != null ? $"{m.SenderOperator.FirstName} {m.SenderOperator.LastName}".Trim() : null)
            : (m.SenderTelegramUser != null ? $"{m.SenderTelegramUser.FirstName} {m.SenderTelegramUser.LastName}".Trim() : null)
    };
}
