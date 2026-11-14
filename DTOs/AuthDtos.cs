using System.ComponentModel.DataAnnotations;
using Microsoft.OpenApi.MicrosoftExtensions;
namespace GestionTachesProjets.DTOs;
public class RegisterDto
{
    [Required(ErrorMessage="L'email est obligatoire")]
    [EmailAddress(ErrorMessage ="Email Invalide")]
    public string Email {get;set;}=string.Empty ;
    [Required(ErrorMessage ="Le mot de passe est obligatoire")]
    public string Password {get;set;}=string.Empty ;
    public string? Nom {get;set;}
}
public class LoginDto
{
    [Required(ErrorMessage ="L'email est obligatoire")]
    public string Email{get;set;}=string.Empty;
    [Required(ErrorMessage ="Le motde passe est obligatoire")]
    public string Password {get;set;}=string.Empty;
}
public class AuthResponseDto
{
    public string Token {get;set;}=string.Empty;
    public DateTime Expiration {get;set;}

}