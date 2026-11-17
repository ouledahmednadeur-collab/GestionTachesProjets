using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionTachesProjets.Migrations
{
    /// <inheritdoc />
    public partial class CommentaireAdmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "MembreId",
                table: "Commentaires",
                type: "INTEGER",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AddColumn<string>(
                name: "AuteurNom",
                table: "Commentaires",
                type: "TEXT",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EstAdmin",
                table: "Commentaires",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AuteurNom",
                table: "Commentaires");

            migrationBuilder.DropColumn(
                name: "EstAdmin",
                table: "Commentaires");

            migrationBuilder.AlterColumn<int>(
                name: "MembreId",
                table: "Commentaires",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldNullable: true);
        }
    }
}
