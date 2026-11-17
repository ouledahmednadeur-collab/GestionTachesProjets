using System.ComponentModel.DataAnnotations;
namespace GestionTachesProjets.DTOs;
public class RoleCreateDto 
{
    [Required(ErrorMessage = "Le nom du role est obligatoire")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "Le nom du role doit faire entre 2 et 50 caractères")]
    public string Nom{get;set;}=string.Empty;
    // privilèges optionnels accordés dès la création (clés du catalogue Permissions)
    public List<string>? Privileges {get;set;}
}
public class UserRoleDto
{
    [Required(ErrorMessage ="L'Email est obligatoire")]
    [EmailAddress(ErrorMessage ="Email invalide")]
    public string Email {get; set;}= string.Empty;
    [Required(ErrorMessage ="Le role est obligatoire")]
    public string Role {get;set;} = string.Empty ;
    // optionnel : projet de l'affectation (obligatoire pour un rôle porteur de privilèges,
    // interdit pour Admin et Membre qui restent globaux)
    public int? ProjetId {get;set;}
}
// remplacement complet des privilèges d'un rôle (clés du catalogue Permissions)
public class RolePrivilegesDto
{
    [Required(ErrorMessage = "La liste des privilèges est obligatoire")]
    public List<string> Privileges {get;set;} = new();
}
