using System.ComponentModel.DataAnnotations;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
namespace GestionTachesProjets.DTOs ;
public class TacheCreateDto
{
    [Required(ErrorMessage ="le titre d'une tache est obligatoire")]
    [MaxLength(150)]
    public string Titre {get;set;}=string.Empty;
    [MaxLength(500)]
    public string? Description {get;set;}
    [Range (1,int.MaxValue,ErrorMessage ="ProjetId invalide")]
    public int ProjetId {get;set;}
}
public class AffecterTacheDto
{
    [Range(1, int.MaxValue,ErrorMessage="MembreId Invalide ")]
    public int ProjetId{get;set;}
}
public class ChangerStatutDto
{
    [Range(1, int.MaxValue,ErrorMessage ="MembreId invalide")]
    public int MembreId{get;set;}
}
public class TacheDto
{
    public int Id {get;set;}
    public string Titre {get;set;}=string.Empty ;
    public string? Description {get; set;}
    public StatutTache Statut {get;set;} 
    public int ProjetId {get;set;}
    public int? MembreId {get;set;}
}