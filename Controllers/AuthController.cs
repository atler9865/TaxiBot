using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TaxiBotTest.Data;
using TaxiBotTest.DTOs;
using TaxiBotTest.Models.Entities;

namespace TaxiBotTest.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(
        [FromBody] LoginRequest request, CancellationToken ct)
    {
        var op = await db.AppUsers
            .FirstOrDefaultAsync(o => o.Login == request.Login, ct);

        if (op == null)
            return Unauthorized(new { message = "Invalid credentials" });

        var hasher = new PasswordHasher<AppUser>();
        var result = hasher.VerifyHashedPassword(op, op.PasswordHash, request.Password);

        if (result == PasswordVerificationResult.Failed)
            return Unauthorized(new { message = "Invalid credentials" });

        var token = GenerateJwt(op);
        var dto = new OperatorDto(op.Id, op.Login, op.FirstName, op.LastName, op.Status.ToString(), op.Role.ToString());

        return Ok(new LoginResponse(token, dto));
    }

    private string GenerateJwt(AppUser op)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddHours(config.GetValue<int>("Jwt:ExpiryHours", 24));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, op.Id.ToString()),
            new Claim(ClaimTypes.Name, op.Login),
            new Claim(ClaimTypes.Role, op.Role.ToString()),
            new Claim("firstName", op.FirstName),
            new Claim("lastName", op.LastName)
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
