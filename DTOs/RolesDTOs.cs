using System.ComponentModel.DataAnnotations;
namespace GestionTachesProjets.DTOs;
public class RoleCreateDto 
{
    [Required(ErrorMessage = "Le nom du role est obligatoire")]
    [MaxLength(50)]
    public string Nom{get;set;}=string.Empty;
}
public class UserRoleDto
{
    [Required(ErrorMessage ="L'Email est obligatoire")]
    [EmailAddress(ErrorMessage ="Email invalide")]
    public string Email {get; set;}= string.Empty;
    [Required(ErrorMessage ="Le role est obligatoire")]
    public string Role {get;set;} = string.Empty ;
}