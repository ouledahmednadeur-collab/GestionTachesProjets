using System.ComponentModel.DataAnnotations;
namespace GestionTachesProjets.Models;
// message privé entre deux membres (expéditeur -> destinataire)
public class Message
{
    public int Id {get;set;}
    public int ExpediteurId {get;set;}
    public Membre? Expediteur {get;set;}
    public int DestinataireId {get;set;}
    public Membre? Destinataire {get;set;}
    [Required, StringLength(1000, MinimumLength = 1)]
    public string Contenu {get;set;} = string.Empty;
    public DateTime DateEnvoi {get;set;} = DateTime.UtcNow;   // en UTC
    public bool Lu {get;set;}
    public DateTime? DateLecture {get;set;}
}
