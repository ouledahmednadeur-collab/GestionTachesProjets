using System.ComponentModel.DataAnnotations;
namespace GestionTachesProjets.Models;
public class Commentaire
{
    public int Id {get;set;}
    [Required,MaxLength(500)]
    public string Contenu {get;set;}=string.Empty;
    public DateTime DateCreation {get;set;}=DateTime.UtcNow;
    public int TacheId {get;set;}
    public Tache? Tache{get;set;}
    public int MembreId {get;set;}
    public Membre? Membre {get;set;}

}