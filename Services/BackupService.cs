using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using TaxiBotTest.Data;

namespace TaxiBotTest.Services;

public class BackupService(
    IDbContextFactory<AppDbContext> dbFactory,
    ILogger<BackupService> logger,
    IConfiguration config) : BackgroundService
{
    private const int KeepLastN = 5;
    private string BackupDir => config["BackupDirectory"] ?? "./backups";

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await CreateBackupAsync(ct);

        using var timer = new PeriodicTimer(TimeSpan.FromHours(2));
        while (await timer.WaitForNextTickAsync(ct))
            await CreateBackupAsync(ct);
    }

    private async Task CreateBackupAsync(CancellationToken ct)
    {
        try
        {
            Directory.CreateDirectory(BackupDir);
            var fileName = $"taxibot_{DateTime.UtcNow:yyyy-MM-dd_HH-mm}.db";
            var destPath = Path.Combine(BackupDir, fileName);

            await using var context = await dbFactory.CreateDbContextAsync(ct);
            var sourceConn = (SqliteConnection)context.Database.GetDbConnection();
            await sourceConn.OpenAsync(ct);

            await using var destConn = new SqliteConnection($"Data Source={destPath}");
            await destConn.OpenAsync(ct);
            sourceConn.BackupDatabase(destConn);

            logger.LogInformation("Backup created: {Path}", destPath);
            CleanOldBackups();
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            logger.LogError(ex, "Backup failed");
        }
    }

    private void CleanOldBackups()
    {
        var toDelete = Directory.GetFiles(BackupDir, "taxibot_*.db")
            .OrderByDescending(f => f)
            .Skip(KeepLastN);

        foreach (var file in toDelete)
        {
            File.Delete(file);
            logger.LogInformation("Deleted old backup: {File}", file);
        }
    }
}
