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
    // auteur membre : sa fiche ; commentaire d'un Admin (compte sans fiche Membre) : null
    public int? MembreId {get;set;}
    public Membre? Membre {get;set;}
    // commentaire écrit par un Admin (false pour les commentaires existants)
    public bool EstAdmin {get;set;}
    // nom affiché d'un Admin sans fiche, lu dans le token (partie avant « @ » de son email)
    [MaxLength(100)]
    public string? AuteurNom {get;set;}

}