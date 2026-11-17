using System.ComponentModel.DataAnnotations;
namespace GestionTachesProjets.Models;
public enum TypeNotification
{
    NouveauMessage,
    StatutTache,
    TacheAjoutee   // ajoutée à la fin : les valeurs existantes (0, 1) ne changent pas
}
// notification créée par le serveur uniquement ; le destinataire est identifié par l'email de
// son compte (comme le reste du projet), car un admin peut ne pas avoir de fiche Membre
public class Notification
{
    public int Id {get;set;}
    [Required, MaxLength(256)]
    public string DestinataireEmail {get;set;} = string.Empty;   // enregistré en minuscules
    public TypeNotification Type {get;set;}
    [Required, MaxLength(200)]
    public string Texte {get;set;} = string.Empty;
    public int? TacheId {get;set;}
    public int? ExpediteurMembreId {get;set;}
    public bool Lue {get;set;}
    public DateTime DateCreation {get;set;} = DateTime.UtcNow;   // en UTC
}
