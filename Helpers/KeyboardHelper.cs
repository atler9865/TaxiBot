using System.Globalization;
using Microsoft.Extensions.Localization;
using Telegram.Bot.Types.ReplyMarkups;
using TaxiBotTest.Models;

namespace TaxiBotTest.Helpers;

public static class KeyboardHelper
{
    public static InlineKeyboardMarkup LanguageMenu() => new(new[]
    {
        new[] { InlineKeyboardButton.WithCallbackData("🇺🇦 Українська", "lang_uk") },
        new[] { InlineKeyboardButton.WithCallbackData("🇬🇧 English", "lang_en") },
        new[] { InlineKeyboardButton.WithCallbackData("🇵🇱 Polski", "lang_pl") },
        new[] { InlineKeyboardButton.WithCallbackData("🇷🇺 Русский", "lang_ru") }
    });

    public static InlineKeyboardMarkup MainMenu(IStringLocalizer<BotMessages> loc, string lang)
    {
        using var _ = new CultureScope(lang);
        return new InlineKeyboardMarkup(new[]
        {
            new[] { InlineKeyboardButton.WithCallbackData(loc["BtnWriteManager"], "write_manager") },
            new[] { InlineKeyboardButton.WithCallbackData(loc["BtnContacts"], "contacts") },
            new[] { InlineKeyboardButton.WithCallbackData(loc["BtnAbout"], "about") },
            new[] { InlineKeyboardButton.WithCallbackData(loc["BtnChangeLanguage"], "change_language") }
        });
    }

    public static InlineKeyboardMarkup ProblemMenu(IStringLocalizer<BotMessages> loc, string lang)
    {
        using var _ = new CultureScope(lang);
        var problems = Enum.GetValues<ProblemType>();
        var rows = problems.Select(p =>
        {
            var label = loc[$"Problem{p.ToDisplayName()}"].Value;
            return new[] { InlineKeyboardButton.WithCallbackData(label, p.ToCallbackData()) };
        }).ToArray();
        return new InlineKeyboardMarkup(rows);
    }

    public static InlineKeyboardMarkup UserChatMenu(IStringLocalizer<BotMessages> loc, string lang)
    {
        using var _ = new CultureScope(lang);
        return new InlineKeyboardMarkup(new[]
        {
            new[] { InlineKeyboardButton.WithCallbackData(loc["BtnEndChat"], "end_chat") }
        });
    }

    public static InlineKeyboardMarkup BackToMenu(IStringLocalizer<BotMessages> loc, string lang)
    {
        using var _ = new CultureScope(lang);
        return new InlineKeyboardMarkup(new[]
        {
            new[] { InlineKeyboardButton.WithCallbackData(loc["BtnMainMenu"], "main_menu") }
        });
    }

    /// <summary>Temporarily sets CultureInfo.CurrentUICulture for the scope.</summary>
    private sealed class CultureScope : IDisposable
    {
        private readonly CultureInfo _previous;
        public CultureScope(string lang)
        {
            _previous = CultureInfo.CurrentUICulture;
            CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo(lang);
        }
        public void Dispose() => CultureInfo.CurrentUICulture = _previous;
    }
}
