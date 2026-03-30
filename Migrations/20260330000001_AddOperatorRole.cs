using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaxiBotTest.Migrations
{
    /// <inheritdoc />
    public partial class AddOperatorRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Role",
                table: "Operators",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Role",
                table: "Operators");
        }
    }
}
