using System.ComponentModel.DataAnnotations ;
using System.Diagnostics.CodeAnalysis;
namespace GestionTachesProjets.DTOs;
public class MembreCreateDto
{
    [Required(ErrorMessage ="le nom est obligatoire")]
    [MaxLength(100)]
    public string Nom {get;set;}=string.Empty ;
    [Required(ErrorMessage = "L'email est obligatoire ")]
    [EmailAddress(ErrorMessage = "Email Invalide")]
    public string Email {get;set;}=string.Empty ;
    // mot de passe du compte de connexion créé avec le membre (jamais renvoyé dans une réponse) ;
    // 6 caractères minimum, comme la politique Identity par défaut (Program.cs ne la change pas)
    [Required(ErrorMessage = "Le mot de passe est obligatoire")]
    [MinLength(6, ErrorMessage = "Le mot de passe doit contenir au moins 6 caractères")]
    public string Password {get;set;}=string.Empty ;
}
// modification d'un membre (PUT) : mêmes champs qu'avant, sans mot de passe
public class MembreUpdateDto
{
    [Required(ErrorMessage ="le nom est obligatoire")]
    [MaxLength(100)]
    public string Nom {get;set;}=string.Empty ;
    [Required(ErrorMessage = "L'email est obligatoire ")]
    [EmailAddress(ErrorMessage = "Email Invalide")]
    public string Email {get;set;}=string.Empty ;
}
public class MembreDto
{
    public int Id {get;set;}
    public string Nom{get;set;}=string.Empty ;
    public string Email {get;set;}=string.Empty;

}