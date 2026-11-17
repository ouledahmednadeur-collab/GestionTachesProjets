using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionTachesProjets.Migrations
{
    /// <inheritdoc />
    public partial class AjoutNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DestinataireEmail = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    Texte = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    TacheId = table.Column<int>(type: "INTEGER", nullable: true),
                    ExpediteurMembreId = table.Column<int>(type: "INTEGER", nullable: true),
                    Lue = table.Column<bool>(type: "INTEGER", nullable: false),
                    DateCreation = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_DestinataireEmail_Lue_DateCreation",
                table: "Notifications",
                columns: new[] { "DestinataireEmail", "Lue", "DateCreation" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Notifications");
        }
    }
}
