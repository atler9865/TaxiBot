using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaxiBotTest.Data;
using TaxiBotTest.DTOs;
using TaxiBotTest.Models;
using TaxiBotTest.Services;

namespace TaxiBotTest.Controllers;

[Authorize]
[ApiController]
[Route("api/requests")]
public class RequestsController(AppDbContext db, RequestService requestService) : ControllerBase
{
    private int CurrentOperatorId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<PagedResult<RequestDto>>> GetRequests(
        [FromQuery] RequestsQuery query, CancellationToken ct)
    {
        var q = db.Requests
            .Include(r => r.TelegramUser)
            .Include(r => r.AssignedOperator)
            .AsQueryable();

        if (Enum.TryParse<RequestStatus>(query.Status, true, out var s))
            q = q.Where(r => r.Status == s);

        if (query.OperatorId.HasValue)
            q = q.Where(r => r.AssignedOperatorId == query.OperatorId.Value);

        if (query.DriverId.HasValue)
            q = q.Where(r => r.TelegramUserId == query.DriverId.Value);

        if (query.DateFrom.HasValue)
            q = q.Where(r => r.CreatedAt >= query.DateFrom.Value);

        if (query.DateTo.HasValue)
            q = q.Where(r => r.CreatedAt < query.DateTo.Value.AddDays(1));

        q = query.SortBy.ToLower() switch
        {
            "assignedat"   => query.SortDesc ? q.OrderByDescending(r => r.AssignedAt)   : q.OrderBy(r => r.AssignedAt),
            "completedat"  => query.SortDesc ? q.OrderByDescending(r => r.CompletedAt)  : q.OrderBy(r => r.CompletedAt),
            "drivername"   => query.SortDesc
                ? q.OrderByDescending(r => r.TelegramUser.FirstName).ThenByDescending(r => r.TelegramUser.LastName)
                : q.OrderBy(r => r.TelegramUser.FirstName).ThenBy(r => r.TelegramUser.LastName),
            "operatorname" => query.SortDesc
                ? q.OrderByDescending(r => r.AssignedOperator!.FirstName).ThenByDescending(r => r.AssignedOperator!.LastName)
                : q.OrderBy(r => r.AssignedOperator!.FirstName).ThenBy(r => r.AssignedOperator!.LastName),
            _              => query.SortDesc ? q.OrderByDescending(r => r.CreatedAt)    : q.OrderBy(r => r.CreatedAt),
        };

        var totalCount = await q.CountAsync(ct);
        var pageSize   = Math.Clamp(query.PageSize, 1, 100);
        var page       = Math.Max(1, query.Page);
        var totalPages = totalCount == 0 ? 1 : (int)Math.Ceiling(totalCount / (double)pageSize);

        var items = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return Ok(new PagedResult<RequestDto>
        {
            Items      = items.Select(RequestService.MapToDto).ToList(),
            TotalCount = totalCount,
            Page       = page,
            PageSize   = pageSize,
            TotalPages = totalPages,
        });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RequestDetailDto>> GetRequest(int id, CancellationToken ct)
    {
        var request = await db.Requests
            .Include(r => r.TelegramUser)
            .Include(r => r.AssignedOperator)
            .Include(r => r.Messages)
                .ThenInclude(m => m.SenderTelegramUser)
            .Include(r => r.Messages)
                .ThenInclude(m => m.SenderOperator)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (request == null) return NotFound();

        var dto = new RequestDetailDto
        {
            Id = request.Id,
            ProblemType = request.ProblemType.ToString(),
            ProblemTypeLabel = request.ProblemType.ToDisplayName(),
            InitialMessage = request.InitialMessage,
            Status = request.Status.ToString(),
            CreatedAt = request.CreatedAt,
            AssignedAt = request.AssignedAt,
            CompletedAt = request.CompletedAt,
            AssignedOperatorId = request.AssignedOperatorId,
            AssignedOperatorName = request.AssignedOperator != null
                ? $"{request.AssignedOperator.FirstName} {request.AssignedOperator.LastName}".Trim()
                : null,
            UserFirstName = request.TelegramUser.FirstName,
            UserLastName = request.TelegramUser.LastName,
            UserUsername = request.TelegramUser.Username,
            Messages = request.Messages
                .OrderBy(m => m.SentAt)
                .Select(RequestService.MapMessageToDto)
                .ToList()
        };

        return Ok(dto);
    }

    [HttpPost("{id:int}/assign")]
    public async Task<ActionResult<RequestDto>> AssignRequest(int id, CancellationToken ct)
    {
        var (request, notFound, wrongStatus) =
            await requestService.AssignRequestAsync(id, CurrentOperatorId, ct);

        if (notFound) return NotFound();
        if (wrongStatus) return Conflict(new { message = "Request is not in New status" });

        return Ok(RequestService.MapToDto(request!));
    }

    [HttpPost("{id:int}/complete")]
    public async Task<ActionResult<RequestDto>> CompleteRequest(int id, CancellationToken ct)
    {
        var (request, notFound, forbidden) =
            await requestService.CompleteRequestAsync(id, CurrentOperatorId, ct);

        if (notFound) return NotFound();
        if (forbidden) return Forbid();

        return Ok(RequestService.MapToDto(request!));
    }

    [HttpPost("{id:int}/messages")]
    public async Task<ActionResult<MessageDto>> SendMessage(
        int id, [FromBody] SendMessageRequest body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Text))
            return BadRequest(new { message = "Message text is required" });

        var dto = await requestService.AddOperatorMessageAsync(id, CurrentOperatorId, body.Text, ct);
        if (dto == null) return Forbid();

        return Ok(dto);
    }

    [HttpGet("unassigned-count")]
    public async Task<ActionResult<UnassignedCountDto>> GetUnassignedCount(CancellationToken ct)
    {
        var count = await requestService.GetUnassignedCountAsync(ct);
        return Ok(new UnassignedCountDto(count));
    }
}
