using System.ComponentModel.DataAnnotations;
namespace GestionTachesProjets.Models;
// message privé entre deux membres, ou entre un membre et un Admin (expéditeur -> destinataire).
// Un Admin n'a pas de fiche Membre : de son côté l'id est null et AdminEmail contient son email.
public class Message
{
    public int Id {get;set;}
    public int? ExpediteurId {get;set;}       // null : l'expéditeur est l'Admin (AdminEmail)
    public Membre? Expediteur {get;set;}
    public int? DestinataireId {get;set;}     // null : le destinataire est l'Admin (AdminEmail)
    public Membre? Destinataire {get;set;}
    [MaxLength(256)]
    public string? AdminEmail {get;set;}      // email de l'Admin participant ; null entre deux membres
    [Required, StringLength(1000, MinimumLength = 1)]
    public string Contenu {get;set;} = string.Empty;
    public DateTime DateEnvoi {get;set;} = DateTime.UtcNow;   // en UTC
    public bool Lu {get;set;}
    public DateTime? DateLecture {get;set;}
}
