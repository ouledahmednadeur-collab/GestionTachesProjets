using System.ComponentModel.DataAnnotations;
namespace GestionTachesProjets.Models ;
public class Membre
{
    public int Id {get;set;}
    [Required,MaxLength(100)]
    public string Nom {get;set;}=string.Empty;
    [Required,EmailAddress]
    public string Email {get;set;}=string.Empty;

}