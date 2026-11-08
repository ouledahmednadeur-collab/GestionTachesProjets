using System.ComponentModel.DataAnnotations;
using GestionTachesProjets.Models ;
namespace GestionTachesProjets.Models ;
public class Projet
{
    public int Id{get;set;}
    [Required ,MaxLength(100)]
    public string Nom {get;set;} = string.Empty;
    [MaxLength(500)]
    public string? Description {get;set;}
    public List<Tache> Taches {get;set;}=new() ;
}