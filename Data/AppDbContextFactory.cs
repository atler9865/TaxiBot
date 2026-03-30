using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace TaxiBotTest.Data;

/// <summary>Used by EF Core tools (dotnet ef migrations add ...) at design time.</summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite("Data Source=taxibot.db")
            .Options;
        return new AppDbContext(options);
    }
}
