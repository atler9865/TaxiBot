using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaxiBotTest.Migrations
{
    /// <inheritdoc />
    public partial class AddedFullNameForTelegramUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FullName",
                table: "TelegramUsers",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_TelegramUsers_FullName",
                table: "TelegramUsers",
                column: "FullName");

            migrationBuilder.Sql("UPDATE TelegramUsers SET FullName = FirstName || ' ' || LastName");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TelegramUsers_FullName",
                table: "TelegramUsers");

            migrationBuilder.DropColumn(
                name: "FullName",
                table: "TelegramUsers");
        }
    }
}
