using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaxiBotTest.Migrations
{
    /// <inheritdoc />
    public partial class RenamedTAbles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Messages_Operators_SenderOperatorId",
                table: "Messages");

            migrationBuilder.DropForeignKey(
                name: "FK_Requests_Operators_AssignedOperatorId",
                table: "Requests");

            migrationBuilder.DropTable(
                name: "Operators");

            migrationBuilder.CreateTable(
                name: "AppUsers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Login = table.Column<string>(type: "TEXT", nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", nullable: false),
                    FirstName = table.Column<string>(type: "TEXT", nullable: false),
                    LastName = table.Column<string>(type: "TEXT", nullable: false),
                    IsAvailable = table.Column<bool>(type: "INTEGER", nullable: false),
                    Role = table.Column<int>(type: "INTEGER", nullable: false),
                    RegisteredAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppUsers", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppUsers_Login",
                table: "AppUsers",
                column: "Login",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Messages_AppUsers_SenderOperatorId",
                table: "Messages",
                column: "SenderOperatorId",
                principalTable: "AppUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Requests_AppUsers_AssignedOperatorId",
                table: "Requests",
                column: "AssignedOperatorId",
                principalTable: "AppUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Messages_AppUsers_SenderOperatorId",
                table: "Messages");

            migrationBuilder.DropForeignKey(
                name: "FK_Requests_AppUsers_AssignedOperatorId",
                table: "Requests");

            migrationBuilder.DropTable(
                name: "AppUsers");

            migrationBuilder.CreateTable(
                name: "Operators",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    FirstName = table.Column<string>(type: "TEXT", nullable: false),
                    IsAvailable = table.Column<bool>(type: "INTEGER", nullable: false),
                    LastName = table.Column<string>(type: "TEXT", nullable: false),
                    Login = table.Column<string>(type: "TEXT", nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", nullable: false),
                    RegisteredAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Operators", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Operators_Login",
                table: "Operators",
                column: "Login",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Messages_Operators_SenderOperatorId",
                table: "Messages",
                column: "SenderOperatorId",
                principalTable: "Operators",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Requests_Operators_AssignedOperatorId",
                table: "Requests",
                column: "AssignedOperatorId",
                principalTable: "Operators",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
