using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionTachesProjets.Migrations
{
    /// <inheritdoc />
    public partial class RolesParProjet : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AffectationsRoles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    MembreId = table.Column<int>(type: "INTEGER", nullable: false),
                    ProjetId = table.Column<int>(type: "INTEGER", nullable: false),
                    NomRole = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AffectationsRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AffectationsRoles_Membres_MembreId",
                        column: x => x.MembreId,
                        principalTable: "Membres",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AffectationsRoles_Projets_ProjetId",
                        column: x => x.ProjetId,
                        principalTable: "Projets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AffectationsRoles_MembreId_ProjetId_NomRole",
                table: "AffectationsRoles",
                columns: new[] { "MembreId", "ProjetId", "NomRole" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AffectationsRoles_ProjetId",
                table: "AffectationsRoles",
                column: "ProjetId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AffectationsRoles");
        }
    }
}
