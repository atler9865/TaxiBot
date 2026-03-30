using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Telegram.Bot;
using TaxiBotTest.Data;
using TaxiBotTest.Hubs;
using TaxiBotTest.Models;
using TaxiBotTest.Models.Entities;
using TaxiBotTest.Services;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ── Telegram Bot ──────────────────────────────────────────────────────────────
var botToken = Environment.GetEnvironmentVariable("TELEGRAM_BOT_TOKEN")
               ?? config["BotToken"]
               ?? throw new InvalidOperationException("TELEGRAM_BOT_TOKEN is not set");
builder.Services.AddSingleton<ITelegramBotClient>(new TelegramBotClient(botToken));

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContextFactory<AppDbContext>(opt =>
    opt.UseSqlite(config.GetConnectionString("DefaultConnection")));

// ── Authentication (JWT) ──────────────────────────────────────────────────────
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = config["Jwt:Issuer"],
            ValidAudience = config["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(config["Jwt:Key"]!))
        };
        // Allow JWT via query string for SignalR
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"].ToString();
                if (!string.IsNullOrEmpty(token) &&
                    ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ── SignalR ───────────────────────────────────────────────────────────────────
builder.Services.AddSignalR();

// ── Localization ──────────────────────────────────────────────────────────────
/*builder.Services.AddLocalization(opt => opt.ResourcesPath = "Localization");*/
builder.Services.AddLocalization();

// ── MVC / API ─────────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── CORS (dev) ────────────────────────────────────────────────────────────────
builder.Services.AddCors(opt => opt.AddPolicy("Dev", policy =>
    policy.WithOrigins("http://localhost:5173")
          .AllowAnyHeader()
          .AllowAnyMethod()
          .AllowCredentials()));

// ── App services ──────────────────────────────────────────────────────────────
builder.Services.AddSingleton<SessionService>();
builder.Services.AddSingleton<RequestService>();
builder.Services.AddHostedService<BotService>();
builder.Services.AddHostedService<BackupService>();

// ─────────────────────────────────────────────────────────────────────────────

var app = builder.Build();

// ── Migrate DB & seed admin ───────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await SeedAdminAsync(db, config);
}

// ── Middleware ────────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("Dev");
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");
app.MapFallbackToFile("index.html");

await app.RunAsync();

// ── Seed helper ───────────────────────────────────────────────────────────────
static async Task SeedAdminAsync(AppDbContext db, IConfiguration config)
{
    if (await db.AppUsers.AnyAsync()) return;

    var login = config["SeedAdmin:Login"] ?? "admin";
    var password = config["SeedAdmin:Password"] ?? "admin123";
    var firstName = config["SeedAdmin:FirstName"] ?? "Admin";
    var lastName = config["SeedAdmin:LastName"] ?? "TaxiBot";

    var admin = new AppUser
    {
        Login = login,
        FirstName = firstName,
        LastName = lastName,
        IsAvailable = true,
        Role = OperatorRole.Administrator,
        RegisteredAt = DateTime.UtcNow
    };

    var hasher = new PasswordHasher<AppUser>();
    admin.PasswordHash = hasher.HashPassword(admin, password);

    db.AppUsers.Add(admin);
    await db.SaveChangesAsync();
}
