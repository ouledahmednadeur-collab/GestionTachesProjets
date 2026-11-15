using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionTachesProjets.Migrations
{
    /// <inheritdoc />
    public partial class AjoutMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Messages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ExpediteurId = table.Column<int>(type: "INTEGER", nullable: false),
                    DestinataireId = table.Column<int>(type: "INTEGER", nullable: false),
                    Contenu = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    DateEnvoi = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Lu = table.Column<bool>(type: "INTEGER", nullable: false),
                    DateLecture = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Messages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Messages_Membres_DestinataireId",
                        column: x => x.DestinataireId,
                        principalTable: "Membres",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Messages_Membres_ExpediteurId",
                        column: x => x.ExpediteurId,
                        principalTable: "Membres",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Messages_DestinataireId",
                table: "Messages",
                column: "DestinataireId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ExpediteurId_DestinataireId_DateEnvoi",
                table: "Messages",
                columns: new[] { "ExpediteurId", "DestinataireId", "DateEnvoi" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Messages");
        }
    }
}
