using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaxiBotTest.Data;
using TaxiBotTest.DTOs;

namespace TaxiBotTest.Controllers;

[Authorize]
[ApiController]
[Route("api/drivers")]
public class DriversController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<TelegramUserDto>>> GetDrivers(CancellationToken ct)
    {
        var users = await db.TelegramUsers
            .Where(u => u.IsRegistered)
            .OrderBy(u => u.FirstName)
            .Select(u => new TelegramUserDto(
                u.Id, u.ChatId,
                u.FirstName, u.LastName,
                u.Username, u.Language,
                u.IsRegistered, u.RegisteredAt,
                u.Requests.Count))
            .ToListAsync(ct);

        return Ok(users);
    }
}
