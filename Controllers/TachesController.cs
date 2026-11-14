using System.ComponentModel;
using System.Reflection.Metadata.Ecma335;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SQLitePCL;
namespace GestionTachesProjets.Controllers;
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TachesController : ControllerBase
{
    private readonly ITacheRepository _taches;
    private readonly IProjetRepository _projets;
    private readonly IMembreRepository _membres;
    public  TachesController(ITacheRepository taches , IProjetRepository projets , IMembreRepository membres)
    {
        _taches=taches;
        _membres=membres;
        _projets=projets;
    }
    [HttpGet("/api/projets/{projetId}/taches")]
    public async Task<ActionResult<PagedResult<TacheDto>>> GetByProjet(
        int projetId , StatutTache? statut , int page=1 , int pageSize=10)
    {
        if(await _projets.GetByIdAsync(projetId)==null)
        return NotFound("Projet Introuvable");
        if (page<1) page=1;
        if(pageSize<1 || pageSize >50) pageSize=10 ;
        var result=await _taches.GetByProjetAsync(projetId,statut,page,pageSize);
        return Ok(ToPagedDto(result));
    }
    [HttpGet("/api/membres/{membreId}/taches")]
    public async Task<ActionResult<PagedResult<TacheDto>>> GetByMembre(int membreId , int page=1 , int pageSize=10 )
    {
        if (await _membres.GetByIdAsync(membreId)==null) 
        return NotFound("Membre introuvable");
        if (page<1) page=1 ;
        if(pageSize<1 || pageSize>50 ) pageSize=10 ;
        var result = await _taches.GetByMembreAsync(membreId,page,pageSize);
        return Ok(ToPagedDto(result));
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<TacheDto>> GetById (int id)
    {
        var tache = await _taches.GetByIdAsync(id);
        if (tache==null) return NotFound();
        return Ok(ToDto(tache));
    }
    [HttpPost]
    public async Task<ActionResult<TacheDto>> Create(TacheCreateDto dto)
    {
        if (await _projets.GetByIdAsync(dto.ProjetId)==null)
        return NotFound("projet introuvable");
        var tache = new Tache
        {
            Titre= dto.Titre,
            Description= dto.Description,
            ProjetId=dto.ProjetId
        };
        await _taches.AddAsync(tache);
        return CreatedAtAction(nameof(GetById),new {id=tache.Id},ToDto(tache));
    }
    [HttpPut("{id}/affecter")]
    public async Task<ActionResult<TacheDto>> Affecter(int id , AffecterTacheDto dto)
    {
        var tache = await _taches.GetByIdAsync(id);
        if (tache==null) return NotFound("Tache introuvable");
        if (await _membres.GetByIdAsync(dto.MembreId)==null) 
        return NotFound("Membre introuvable");
        tache.MembreId=dto.MembreId;
        await _taches.UpdateAsync(tache);
        return Ok(ToDto(tache));
    }
    [HttpPut("{id}/statut")]
    public async Task<ActionResult<TacheDto>> ChangerStatut(int id ,ChangerStatutDto dto)
        {
        var tache = await _taches.GetByIdAsync(id);
        if (tache == null) return NotFound();
        tache.Statut=dto.Statut ;
        await _taches.UpdateAsync(tache);
        return Ok(ToDto(tache));
        }
    [HttpDelete("{id}")]
    [Authorize(Roles ="Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var tache = await _taches.GetByIdAsync (id);
        if(tache==null) return NotFound();
        await _taches.DeleteAsync(tache);
        return NoContent();
    }
    private static PagedResult<TacheDto> ToPagedDto(PagedResult<Tache> r ) => new PagedResult<TacheDto> 
    {   
        Page= r.Page ,
        PageSize = r.PageSize,
        Total=r.Total,
        Items=r.Items.Select(ToDto).ToList()
    };
    private static TacheDto ToDto(Tache t) => new TacheDto
    {
        Id=t.Id ,
        Titre=t.Titre ,
        Description = t.Description ,
        Statut = t.Statut ,
        ProjetId = t.ProjetId,
        MembreId = t.MembreId
    };
}
