using System.ComponentModel.DataAnnotations;
namespace GestionTachesProjets.DTOs;
public class CommentaireCreateDto
{
    [Required(ErrorMessage ="contenu obligatoire")]
    [MaxLength(500)]
    public string Contenu {get;set;}=string.Empty;
    // plus envoyé par le front : l'auteur est TOUJOURS déduit du token. Gardé facultatif pour
    // les anciens clients : ignoré pour un Admin, 403 pour un membre s'il n'est pas le sien.
    [Range(1,int.MaxValue,ErrorMessage ="MembreId invalide")]
    public int? MembreId {get;set;}

}
public class CommentaireDto
{
    public int Id {get;set;}
    public string contenu {get;set;}=string.Empty ;
    public DateTime DateCreation {get;set;}
    public int TacheId{get;set;}
    public int? MembreId{get;set;}     // null pour un commentaire d'Admin
    public bool EstAdmin {get;set;}    // commentaire écrit par un Admin (badge « Admin »)
    public string? AuteurNom {get;set;}   // nom affiché d'un Admin (ex. « admin ») ; null pour un membre
}