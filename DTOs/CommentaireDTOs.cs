using System.ComponentModel.DataAnnotations;
namespace GestionTachesProjets.DTOs;
public class CommentaireCreateDto
{
    [Required(ErrorMessage ="contenu obligatoire")]
    [MaxLength(500)]
    public string Contenu {get;set;}=string.Empty;
    [Range(1,int.MaxValue,ErrorMessage ="MembreId invalide")]
    public int MembreId {get;set;}
}
public class CommentaireDto
{
    public int Id {get;set;}
    public string contenu {get;set;}=string.Empty ;
    public DateTime DateCreation {get;set;}
    public int TacheId{get;set;}
    public int MembreId{get;set;}
}