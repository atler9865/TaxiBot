using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaxiBotTest.Migrations
{
    /// <inheritdoc />
    public partial class AddTelegramUserStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DriverStatus",
                table: "TelegramUsers",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DriverStatus",
                table: "TelegramUsers");
        }
    }
}
