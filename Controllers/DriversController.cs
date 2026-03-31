using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaxiBotTest.Data;
using TaxiBotTest.DTOs;
using TaxiBotTest.Models;

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
                u.Requests.Count, u.DriverStatus.ToString()))
            .ToListAsync(ct);

        return Ok(users);
    }

    [Authorize(Roles = "Administrator")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<TelegramUserDto>> UpdateDriver(
        int id, [FromBody] UpdateDriverRequest request, CancellationToken ct)
    {
        var user = await db.TelegramUsers
            .Include(u => u.Requests)
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        if (user is null) return NotFound(new { message = "Driver not found" });

        if (!Enum.TryParse<DriverStatus>(request.DriverStatus, out var status))
            return BadRequest(new { message = "Invalid driver status" });

        user.DriverStatus = status;
        await db.SaveChangesAsync(ct);

        return Ok(new TelegramUserDto(
            user.Id, user.ChatId,
            user.FirstName, user.LastName,
            user.Username, user.Language,
            user.IsRegistered, user.RegisteredAt,
            user.Requests.Count, user.DriverStatus.ToString()));
    }
}
