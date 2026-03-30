using System.Collections.Concurrent;
using TaxiBotTest.Models;

namespace TaxiBotTest.Services;

public class SessionService
{
    private readonly ConcurrentDictionary<long, UserSession> _sessions = new();

    public UserSession GetOrCreate(long chatId)
        => _sessions.GetOrAdd(chatId, id => new UserSession { ChatId = id });

    public UserSession? Get(long chatId)
        => _sessions.TryGetValue(chatId, out var s) ? s : null;

    public void Update(UserSession session)
        => _sessions[session.ChatId] = session;

    public void Remove(long chatId)
        => _sessions.TryRemove(chatId, out _);
}
