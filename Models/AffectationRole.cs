using System.ComponentModel.DataAnnotations;
namespace GestionTachesProjets.Models;
// Rôle attribué à un membre DANS un projet précis (rôle porteur de privilèges, ou étiquette
// affectée par projet). Les privilèges d'un rôle ne s'appliquent que dans les projets où il est
// affecté. Supprimer le projet ou le membre supprime ses affectations (cascade).
public class AffectationRole
{
    public int Id {get;set;}
    public int MembreId {get;set;}
    public Membre? Membre {get;set;}
    public int ProjetId {get;set;}
    public Projet? Projet {get;set;}
    [Required, MaxLength(256)]
    public string NomRole {get;set;} = string.Empty;   // nom exact d'un rôle Identity existant
}
