using System.ComponentModel;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
namespace GestionTachesProjets.Controllers ;
[ApiController]
[Route("api/[controller]")]
public class ProjetsController :ControllerBase
{
    private readonly IProjetRepository _repo;
    public ProjetsController(IProjetRepository repo)
    {
        _repo=repo ;
    }
    [HttpGet]
    public async Task<ActionResult<PagedResult<ProjetDto>>> GetAll(int page=1 , int pageSize=10)
    /// question : allech houni manich keteb : [FromBoy]
    /// nahkiw aala el model binding w houa mecanisme elli yfasser kifeh ASP.NET trecuperi
    /// les valeurs envoyee mel client w t7othom f les parametres des methodes 
    /// el client yebaath GET /api/Projets?page=2&pageSize=20
    /// ASP.NET Core trecuperi et tconverti les valeurs 
    /// page : int page=2
    /// pageSize ; int pageSize = 20 
    /// execution du controleur GetAll(2,10)
    /// houni rana nrecuperiw fi les donnees fromquery automatiquement sans avoir besoin 
    /// kawnou n9oulou [FromQuery]
    /// famma 3 facon nel9aw biha les informations [FromQuery] , [FromRoute] w [FromBody]
    /// [FromBody] : exemple : 
    /// temchi t3ammer formulaire tekteb fiha 
    /// nom = "Alpha Tech" 
    /// decription="Projet Informatique"
    /// el navigateur yaamel serialisation lel les donnees , lahkeya tsir bel js 
    /// yebaath men ba3ad el json fel body mte3 el requete http 
    /// ASP.NET Core testa3mel mecanisme esmou Input Formatter , elli houa Json deserializer
    /// w tetransformi el json el objet csharp 
    /// men ba3ed fel retour Asp.Net tetransformi les objets csharp el json 
    /// wel navigateur y7awel json el javascript  
    { 
        if (page < 1 ) page=1 ;
        if (pageSize < 1 || pageSize > 50) pageSize =10 ;
        // houni lezemna naamlou les conditions ala page w ala pagesize khater 
        //elli declarineh el fou9 mahoumech des valeurs par defaut , hekom 
        // law ken el client ma b3ath hatta valeur fihom , el page wel pagesize 
        // yekhdhou les valeurs hekom 
        // lezem naamlou des conditions bech ma yjiwnech des erreurs 
        // skip((o-1)*10) taati skip(-10) erreur 500 
        // pagesize = 10000 tchargi barcha fel memoire 
        var result = await _repo.GetAllAsync(page , pageSize);
        return Ok(new PagedResult<ProjetDto>
        {
            Page = result.Page ,
            PageSize = result.PageSize ,
            Total = result.Total,
            Items= result.Items.Select(ToDto).ToList()
        });
        
    }
[HttpGet("{id}")]
public async Task<ActionResult<ProjetDto>> GetById(int id)
    {
        var projet = await _repo.GetByIdAsync(id);
        if (projet ==null) return NotFound ();
        return Ok(ToDto(projet));
    }
[HttpPost]
public async Task<ActionResult<ProjetDto>> Create(ProjetCreateDto dto)
    {
        var projet = new Projet
        {
            Nom=dto.Nom ,
            Description=dto.Description

        };
        await _repo.AddAsync(projet);
        return CreatedAtAction(nameof(GetById),new { id=projet.Id}, ToDto(projet));
    }
[HttpPut("{id}")]
public async Task<IActionResult> Update(int id, ProjetCreateDto dto )
    { var projet = await _repo.GetByIdAsync(id);
      if (projet == null) return NotFound();
      projet.Nom =dto.Nom ;
      projet.Description =dto.Description ;
      await _repo.UpdateAsync(projet);
      return NoContent();
    }
[HttpDelete("{id}")]
public async Task<IActionResult> Delete(int id)
{
    var projet = await _repo.GetByIdAsync(id);
    if (projet == null) return NotFound();
    await _repo.DeleteAsync(projet);
    return NoContent ();
}
private static ProjetDto ToDto(Projet p)=> new ProjetDto
{
    Id =p.Id,
    Nom = p.Nom,
    Description = p.Description
};
}
