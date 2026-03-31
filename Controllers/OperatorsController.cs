using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaxiBotTest.Data;
using TaxiBotTest.DTOs;
using TaxiBotTest.Models;
using TaxiBotTest.Models.Entities;

namespace TaxiBotTest.Controllers;

[Authorize(Roles = "Administrator")]
[ApiController]
[Route("api/operators")]
public class OperatorsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<OperatorDto>>> GetOperators(CancellationToken ct)
    {
        var operators = await db.AppUsers
            .OrderBy(o => o.FirstName)
            .Select(o => new OperatorDto(o.Id, o.Login, o.FirstName, o.LastName, o.IsAvailable, o.Role.ToString()))
            .ToListAsync(ct);

        return Ok(operators);
    }

    [HttpPost]
    public async Task<ActionResult<OperatorDto>> CreateUser(
        [FromBody] CreateUserRequest request, CancellationToken ct)
    {
        if (await db.AppUsers.AnyAsync(o => o.Login == request.Login, ct))
            return Conflict(new { message = "Login already taken" });

        if (!Enum.TryParse<OperatorRole>(request.Role, out var role))
            return BadRequest(new { message = "Invalid role" });

        var user = new AppUser
        {
            Login = request.Login,
            FirstName = request.FirstName,
            LastName = request.LastName,
            IsAvailable = true,
            Role = role,
            RegisteredAt = DateTime.UtcNow
        };

        var hasher = new PasswordHasher<AppUser>();
        user.PasswordHash = hasher.HashPassword(user, request.Password);

        db.AppUsers.Add(user);
        await db.SaveChangesAsync(ct);

        return Ok(new OperatorDto(user.Id, user.Login, user.FirstName, user.LastName, user.IsAvailable, user.Role.ToString()));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<OperatorDto>> UpdateUser(
        int id, [FromBody] UpdateUserRequest request, CancellationToken ct)
    {
        var user = await db.AppUsers.FindAsync([id], ct);
        if (user is null) return NotFound(new { message = "User not found" });

        if (await db.AppUsers.AnyAsync(o => o.Login == request.Login && o.Id != id, ct))
            return Conflict(new { message = "Login already taken" });

        if (!Enum.TryParse<OperatorRole>(request.Role, out var role))
            return BadRequest(new { message = "Invalid role" });

        user.Login = request.Login;
        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Role = role;

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            var hasher = new PasswordHasher<AppUser>();
            user.PasswordHash = hasher.HashPassword(user, request.Password);
        }

        await db.SaveChangesAsync(ct);

        return Ok(new OperatorDto(user.Id, user.Login, user.FirstName, user.LastName, user.IsAvailable, user.Role.ToString()));
    }
}
