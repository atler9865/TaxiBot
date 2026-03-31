using Microsoft.EntityFrameworkCore;
using TaxiBotTest.Models.Entities;

namespace TaxiBotTest.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<TelegramUser> TelegramUsers => Set<TelegramUser>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<Request> Requests => Set<Request>();
    public DbSet<Message> Messages => Set<Message>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TelegramUser>()
            .HasIndex(u => u.ChatId).IsUnique();

        modelBuilder.Entity<TelegramUser>()
            .HasIndex(u => u.FullName);

        modelBuilder.Entity<AppUser>()
            .HasIndex(o => o.Login).IsUnique();

        modelBuilder.Entity<Request>()
            .HasOne(r => r.TelegramUser)
            .WithMany(u => u.Requests)
            .HasForeignKey(r => r.TelegramUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Request>()
            .HasOne(r => r.AssignedOperator)
            .WithMany(o => o.AssignedRequests)
            .HasForeignKey(r => r.AssignedOperatorId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Message>()
            .HasOne(m => m.Request)
            .WithMany(r => r.Messages)
            .HasForeignKey(m => m.RequestId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Message>()
            .HasOne(m => m.SenderTelegramUser)
            .WithMany()
            .HasForeignKey(m => m.SenderTelegramUserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Message>()
            .HasOne(m => m.SenderOperator)
            .WithMany()
            .HasForeignKey(m => m.SenderOperatorId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
