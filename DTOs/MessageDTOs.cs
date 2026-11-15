using System.ComponentModel.DataAnnotations;
namespace GestionTachesProjets.DTOs;
//---------------------------------------------------------------------------- allez
// envoi d'un message : l'expéditeur n'est JAMAIS envoyé par le client (il vient du token)
public class EnvoyerMessageDto
{
    [Range(1, int.MaxValue, ErrorMessage = "DestinataireId invalide")]
    public int DestinataireId {get;set;}
    [Required(ErrorMessage = "le contenu est obligatoire")]
    [StringLength(1000, MinimumLength = 1, ErrorMessage = "le contenu doit faire entre 1 et 1000 caractères")]
    // au moins un caractère qui n'est pas un espace (refuse un message fait seulement d'espaces)
    [RegularExpression(@"^[\s\S]*\S[\s\S]*$", ErrorMessage = "le contenu ne peut pas être vide")]
    public string Contenu {get;set;} = string.Empty;
}
//---------------------------------------------------------------------------- allez
//---------------------------------------------------------------------------- retour
public class MessageDto
{
    public int Id {get;set;}
    public int ExpediteurId {get;set;}
    public string ExpediteurNom {get;set;} = string.Empty;
    public int DestinataireId {get;set;}
    public string DestinataireNom {get;set;} = string.Empty;
    public string Contenu {get;set;} = string.Empty;
    public DateTime DateEnvoi {get;set;}
    public bool Lu {get;set;}
}
// résumé d'une conversation : l'interlocuteur, le dernier message et le nombre de non lus
public class ConversationDto
{
    public int InterlocuteurId {get;set;}
    public string Nom {get;set;} = string.Empty;
    public string Email {get;set;} = string.Empty;
    public string Extrait {get;set;} = string.Empty;
    public DateTime DateDernierMessage {get;set;}
    public int NonLus {get;set;}
}
//---------------------------------------------------------------------------- retour
