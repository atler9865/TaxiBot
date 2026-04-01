using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;
using TaxiBotTest.Data;
using TaxiBotTest.Helpers;
using TaxiBotTest.Models;
using TaxiBotTest.Models.Entities;

namespace TaxiBotTest.Services;

public class BotService(
    ITelegramBotClient bot,
    SessionService sessions,
    RequestService requestService,
    IDbContextFactory<AppDbContext> dbFactory,
    IStringLocalizer<BotMessages> localizer,
    IStringLocalizerFactory localizerFactory,
    ILogger<BotService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        var options = new ReceiverOptions
        {
            AllowedUpdates = [UpdateType.Message, UpdateType.CallbackQuery]
        };

        bot.StartReceiving(
            updateHandler: HandleUpdateAsync,
            errorHandler: HandleErrorAsync,
            receiverOptions: options,
            cancellationToken: ct);

        var me = await bot.GetMe(ct);
        logger.LogInformation("Bot @{Username} started", me.Username);

        await SetCommandMenuAsync(ct);

        await Task.Delay(Timeout.Infinite, ct);
    }

    // ── Routing ───────────────────────────────────────────────────────────────

    private async Task HandleUpdateAsync(ITelegramBotClient _, Update update, CancellationToken ct)
    {
        try
        {
            if (update.Type == UpdateType.CallbackQuery && update.CallbackQuery != null)
                await HandleCallbackAsync(update.CallbackQuery, ct);
            else if (update.Type == UpdateType.Message && update.Message?.Text != null)
                await HandleMessageAsync(update.Message, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error handling update");
        }
    }

    // ── Message handler ───────────────────────────────────────────────────────

    private async Task HandleMessageAsync(Telegram.Bot.Types.Message msg, CancellationToken ct)
    {
        var chatId = msg.Chat.Id;
        var text = msg.Text!.Trim();
        var session = sessions.GetOrCreate(chatId);

        if (text == "/start")
        {
            await HandleStartAsync(chatId, session, ct);
            return;
        }

        if (text == "/language")
        {
            await bot.SendMessage(chatId, Loc(session.TempLanguage, "ChooseLanguage"),
                replyMarkup: KeyboardHelper.LanguageMenu(), cancellationToken: ct);
            return;
        }

        switch (session.State)
        {
            case UserState.WaitingForLanguage:
                await bot.SendMessage(chatId, Loc(session.TempLanguage, "ChooseLanguage"),
                    replyMarkup: KeyboardHelper.LanguageMenu(), cancellationToken: ct);
                return;

            case UserState.WaitingForFirstName:
                await HandleFirstNameInputAsync(chatId, session, text, ct);
                return;

            case UserState.WaitingForLastName:
                await HandleLastNameInputAsync(chatId, session, text, ct);
                return;
        }

        // Registered user flows
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        var user = await db.TelegramUsers.FirstOrDefaultAsync(u => u.ChatId == chatId, ct);
        if (user == null || !user.IsRegistered)
        {
            await HandleStartAsync(chatId, session, ct);
            return;
        }

        switch (session.State)
        {
            case UserState.WaitingForMessage:
                await HandleInitialMessageAsync(chatId, session, user, text, ct);
                break;
            case UserState.InChat:
                await HandleUserChatMessageAsync(session, user, text, db, ct);
                break;
            default:
                await SendMainMenuAsync(chatId, session, user.FirstName, user.Language, ct);
                break;
        }
    }

    // ── Callback handler ──────────────────────────────────────────────────────

    private async Task HandleCallbackAsync(CallbackQuery cb, CancellationToken ct)
    {
        var chatId = cb.Message!.Chat.Id;
        var data = cb.Data ?? "";
        await bot.AnswerCallbackQuery(cb.Id, cancellationToken: ct);

        var session = sessions.GetOrCreate(chatId);

        if (data.StartsWith("lang_"))
        {
            var lang = data[5..];
            if (LanguageCodes.IsValid(lang))
                await HandleLanguageSelectedAsync(chatId, session, lang, ct);
            return;
        }

        await using var db = await dbFactory.CreateDbContextAsync(ct);
        var user = await db.TelegramUsers.FirstOrDefaultAsync(u => u.ChatId == chatId, ct);
        if (user == null || !user.IsRegistered)
        {
            await HandleStartAsync(chatId, session, ct);
            return;
        }

        switch (data)
        {
            case "main_menu":
                await SendMainMenuAsync(chatId, session, user.FirstName, user.Language, ct);
                break;

            case "write_manager":
                session.State = UserState.WaitingForProblemType;
                sessions.Update(session);
                await bot.SendMessage(chatId, Loc(user.Language, "ChooseProblemType"),
                    replyMarkup: KeyboardHelper.ProblemMenu(localizer, user.Language),
                    cancellationToken: ct);
                break;

            case "contacts":
                await bot.SendMessage(chatId, Loc(user.Language, "Contacts"),
                    parseMode: ParseMode.Markdown,
                    replyMarkup: KeyboardHelper.BackToMenu(localizer, user.Language),
                    cancellationToken: ct);
                break;

            case "about":
                await bot.SendMessage(chatId, Loc(user.Language, "About"),
                    parseMode: ParseMode.Markdown,
                    replyMarkup: KeyboardHelper.BackToMenu(localizer, user.Language),
                    cancellationToken: ct);
                break;

            case "change_language":
                await bot.SendMessage(chatId, Loc(user.Language, "ChooseLanguage"),
                    replyMarkup: KeyboardHelper.LanguageMenu(), cancellationToken: ct);
                break;

            case "end_chat":
                await HandleUserEndChatAsync(chatId, session, user, db, ct);
                break;

            default:
                var problem = ProblemTypeExtensions.FromCallbackData(data);
                if (problem.HasValue && session.State == UserState.WaitingForProblemType)
                    await HandleProblemSelectedAsync(chatId, session, problem.Value, user.Language, ct);
                break;
        }
    }

    // ── Registration flow ─────────────────────────────────────────────────────

    private async Task HandleStartAsync(long chatId, UserSession session, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);
        var user = await db.TelegramUsers.FirstOrDefaultAsync(u => u.ChatId == chatId, ct);

        if (user == null || !user.IsRegistered)
        {
            session.State = UserState.WaitingForLanguage;
            sessions.Update(session);
            await bot.SendMessage(chatId, Loc(session.TempLanguage, "ChooseLanguage"),
                replyMarkup: KeyboardHelper.LanguageMenu(), cancellationToken: ct);
        }
        else
        {
            await SendMainMenuAsync(chatId, session, user.FirstName, user.Language, ct);
        }
    }

    private async Task HandleLanguageSelectedAsync(
        long chatId, UserSession session, string lang, CancellationToken ct)
    {
        session.TempLanguage = lang;

        await using var db = await dbFactory.CreateDbContextAsync(ct);
        var user = await db.TelegramUsers.FirstOrDefaultAsync(u => u.ChatId == chatId, ct);

        if (user != null && user.IsRegistered)
        {
            user.Language = lang;
            await db.SaveChangesAsync(ct);
            sessions.Update(session);
            await bot.SendMessage(chatId, Loc(lang, "LanguageChanged"),
                replyMarkup: KeyboardHelper.MainMenu(localizer, lang), cancellationToken: ct);
            return;
        }

        session.State = UserState.WaitingForFirstName;
        sessions.Update(session);
        await bot.SendMessage(chatId, Loc(lang, "EnterFirstName"), cancellationToken: ct);
    }

    private async Task HandleFirstNameInputAsync(
        long chatId, UserSession session, string text, CancellationToken ct)
    {
        session.TempFirstName = text.Trim();
        session.State = UserState.WaitingForLastName;
        sessions.Update(session);
        await bot.SendMessage(chatId, Loc(session.TempLanguage, "EnterLastName"), cancellationToken: ct);
    }

    private async Task HandleLastNameInputAsync(
        long chatId, UserSession session, string lastName, CancellationToken ct)
    {
        await using var db = await dbFactory.CreateDbContextAsync(ct);

        var user = await db.TelegramUsers.FirstOrDefaultAsync(u => u.ChatId == chatId, ct)
                   ?? new TelegramUser { ChatId = chatId };

        var isNew = user.Id == 0;
        user.FirstName = session.TempFirstName ?? "User";
        user.LastName = lastName.Trim();
        user.FullName = $"{user.FirstName} {user.LastName}";
        user.Language = session.TempLanguage;
        user.IsRegistered = true;
        user.RegisteredAt = DateTime.UtcNow;

        if (isNew) db.TelegramUsers.Add(user);
        await db.SaveChangesAsync(ct);

        session.State = UserState.Idle;
        sessions.Update(session);

        var lang = session.TempLanguage;
        await bot.SendMessage(chatId,
            Loc(lang, "RegistrationComplete", user.FirstName, user.LastName),
            cancellationToken: ct);
        await SendMainMenuAsync(chatId, session, user.FirstName, lang, ct);
    }

    // ── Main flow ─────────────────────────────────────────────────────────────

    private async Task SendMainMenuAsync(
        long chatId, UserSession session, string firstName, string lang, CancellationToken ct)
    {
        session.State = UserState.Idle;
        session.SelectedProblem = null;
        session.ActiveRequestId = null;
        sessions.Update(session);

        await bot.SendMessage(chatId, Loc(lang, "Welcome", firstName),
            parseMode: ParseMode.Markdown,
            replyMarkup: KeyboardHelper.MainMenu(localizer, lang),
            cancellationToken: ct);
    }

    private async Task HandleProblemSelectedAsync(
        long chatId, UserSession session, ProblemType problem, string lang, CancellationToken ct)
    {
        session.SelectedProblem = problem;
        session.State = UserState.WaitingForMessage;
        sessions.Update(session);

        var label = LocProblem(problem, lang);
        await bot.SendMessage(chatId, Loc(lang, "EnterDescription", label),
            cancellationToken: ct);
    }

    private async Task HandleInitialMessageAsync(
        long chatId, UserSession session, TelegramUser user, string text, CancellationToken ct)
    {
        if (session.SelectedProblem == null)
        {
            session.State = UserState.Idle;
            sessions.Update(session);
            await SendMainMenuAsync(chatId, session, user.FirstName, user.Language, ct);
            return;
        }

        session.State = UserState.InChat;
        sessions.Update(session);

        await bot.SendMessage(chatId, Loc(user.Language, "RequestAccepted"), cancellationToken: ct);

        var request = await requestService.CreateRequestAsync(
            user.Id, user.ChatId, user.Language,
            session.SelectedProblem.Value, text, ct);

        session.ActiveRequestId = request.Id;
        sessions.Update(session);

        await requestService.AddUserMessageAsync(request.Id, user.Id, text, ct);

        await bot.SendMessage(chatId, Loc(user.Language, "ChatStarted"),
            replyMarkup: KeyboardHelper.UserChatMenu(localizer, user.Language),
            cancellationToken: ct);
    }

    private async Task HandleUserChatMessageAsync(
        UserSession session, TelegramUser user, string text,
        AppDbContext db, CancellationToken ct)
    {
        var requestId = session.ActiveRequestId;
        if (requestId == null)
        {
            var active = await db.Requests
                .FirstOrDefaultAsync(r => r.TelegramUserId == user.Id
                                          && r.Status == RequestStatus.InProgress, ct);
            if (active == null)
            {
                session.State = UserState.Idle;
                sessions.Update(session);
                await SendMainMenuAsync(user.ChatId, session, user.FirstName, user.Language, ct);
                return;
            }
            requestId = active.Id;
            session.ActiveRequestId = requestId;
            sessions.Update(session);
        }

        await requestService.AddUserMessageAsync(requestId.Value, user.Id, text, ct);
    }

    private async Task HandleUserEndChatAsync(
        long chatId, UserSession session, TelegramUser user,
        AppDbContext db, CancellationToken ct)
    {
        var requestId = session.ActiveRequestId;
        if (requestId == null)
        {
            var active = await db.Requests
                .FirstOrDefaultAsync(r => r.TelegramUserId == user.Id
                                          && r.Status == RequestStatus.InProgress, ct);
            requestId = active?.Id;
        }

        if (requestId != null)
            await requestService.CompleteByUserAsync(requestId.Value, user.Id, ct);

        session.State = UserState.Idle;
        session.ActiveRequestId = null;
        session.SelectedProblem = null;
        sessions.Update(session);

        await bot.SendMessage(chatId, Loc(user.Language, "ChatEndedByUser"),
            replyMarkup: KeyboardHelper.MainMenu(localizer, user.Language),
            cancellationToken: ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string Loc(string lang, string key, params object[] args)
    {
        var prev = CultureInfo.CurrentUICulture;
        try
        {
            CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo(lang);
            return localizer[key, args].Value;
        }
        finally
        {
            CultureInfo.CurrentUICulture = prev;
        }
    }

    private string Loc2(string lang, string key, params object[] args)
    {
        var localizer = localizerFactory.Create(typeof(BotMessages));
        var culture = CultureInfo.GetCultureInfo(lang);

        var prevUi = CultureInfo.CurrentUICulture;
        var prevCulture = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentUICulture = culture;
            CultureInfo.CurrentCulture = culture;
            return localizer[key, args].Value;
        }
        finally
        {
            CultureInfo.CurrentUICulture = prevUi;
            CultureInfo.CurrentCulture = prevCulture;
        }
    }

    private string LocProblem(ProblemType problem, string lang)
        => Loc(lang, $"Problem{problem.ToDisplayName()}");

    private async Task SetCommandMenuAsync(CancellationToken ct)
    {
        var commandsByLang = new Dictionary<string, BotCommand[]>
        {
            ["uk"] =
            [
                new BotCommand { Command = "start", Description = "🏠 Головне меню" },
                new BotCommand { Command = "language", Description = "🌐 Змінити мову" }
            ],
            ["en"] =
            [
                new BotCommand { Command = "start", Description = "🏠 Main menu" },
                new BotCommand { Command = "language", Description = "🌐 Change language" }
            ],
            ["pl"] =
            [
                new BotCommand { Command = "start", Description = "🏠 Menu główne" },
                new BotCommand { Command = "language", Description = "🌐 Zmień język" }
            ],
            ["ru"] =
            [
                new BotCommand { Command = "start", Description = "🏠 Главное меню" },
                new BotCommand { Command = "language", Description = "🌐 Изменить язык" }
            ]
        };

        foreach (var (lang, commands) in commandsByLang)
        {
            await bot.SetMyCommands(
                commands: commands,
                scope: new BotCommandScopeDefault(),
                languageCode: lang,
                cancellationToken: ct);
        }

        // Fallback for users without a detected language
        await bot.SetMyCommands(
            commands: commandsByLang["uk"],
            scope: new BotCommandScopeDefault(),
            cancellationToken: ct);

        logger.LogInformation("Bot command menu set");
    }

    private Task HandleErrorAsync(ITelegramBotClient _, Exception ex, HandleErrorSource source, CancellationToken ct)
    {
        logger.LogError(ex, "Telegram error [{Source}]", source);
        return Task.CompletedTask;
    }
}
