using GestionTachesProjets.Models;
namespace GestionTachesProjets.DTOs;
//---------------------------------------------------------------------------- retour
// pas de DTO d'entrée : les notifications sont créées par le serveur uniquement
public class NotificationDto
{
    public int Id {get;set;}
    public TypeNotification Type {get;set;}
    public string Texte {get;set;} = string.Empty;
    public int? TacheId {get;set;}
    public int? ExpediteurMembreId {get;set;}
    public bool Lue {get;set;}
    public DateTime DateCreation {get;set;}
}
//---------------------------------------------------------------------------- retour
