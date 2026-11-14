using System.ComponentModel.DataAnnotations;
using GestionTachesProjets.Models;
namespace GestionTachesProjets.Models ;
public class Tache
{
    public int Id { get;set;}
    [Required,MaxLength(150)]
    public string Titre {get;set;}=string.Empty;
    [MaxLength(500)]
    public string? Description {get;set;}
    public StatutTache Statut {get;set;}= StatutTache.AFaire;
    public int ProjetId {get;set;}
    public Projet? Projet {get;set;}
    public int? MembreId {get;set;}
    public Membre? Membre{get;set;}
    public List<Commentaire> Commentaires{get;set;}=new() ;
}