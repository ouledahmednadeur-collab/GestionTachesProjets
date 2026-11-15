using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using GestionTachesProjets.Data;
namespace GestionTachesProjets.Controllers;
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TachesController : ControllerBase
{
    private readonly ITacheRepository _taches;
    private readonly IProjetRepository _projets;
    private readonly IMembreRepository _membres;
    private readonly AppDbContext _context ;
    public  TachesController(ITacheRepository taches , IProjetRepository projets , IMembreRepository membres , AppDbContext context)
    {
        _taches=taches;
        _membres=membres;
        _projets=projets;
        _context=context;
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
        if (!User.IsInRole("Admin"))
        {
            var email=User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
            var membre = await _context.Membres.FirstOrDefaultAsync(m => m.Email == email);
            if (membre == null || membre.Id !=membreId)
            return Forbid();
        }
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
[Authorize(Roles ="Admin")]
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
        if (tache == null) 
        return NotFound();
        if (!User.IsInRole("Admin"))
        {
            var email=User.FindFirstValue(ClaimTypes.Email )?? User.Identity?.Name;
            var membre = await _context.Membres.FirstOrDefaultAsync(m => m.Email == email);
            if (membre == null || tache.MembreId !=membre.Id)
            return Forbid();
        }
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
[HttpGet("/api/projets/mes-projets")]
    public async Task<ActionResult> MesProjets()
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
        var membre = await _context.Membres.FirstOrDefaultAsync(m=> m.Email ==email );
        if (membre == null) return Ok(new List<object>());
        var ids = _context.Taches
                  .Where(t=> t.MembreId == membre.Id)
                  .Select(t=> t.ProjetId)
                  .Distinct();
        var projets = await _context.Projets 
                    .Where(p=>ids.Contains(p.Id))
                    .Select(p=> new {p.Id,p.Nom,p.Description})
                    .ToListAsync();
        return Ok(projets);
    }
[HttpGet("/api/membres/mon-equipe")]
public async Task<ActionResult> MonEquipe()
{
    var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
    var moi = await _context.Membres.FirstOrDefaultAsync(m => m.Email == email);
    if (moi == null) return Ok(new List<object>());

    // 1. Les projets où j'ai au moins une tâche
    var mesProjetsIds = await _context.Taches
        .Where(t => t.MembreId == moi.Id)
        .Select(t => t.ProjetId)
        .Distinct()
        .ToListAsync();

    var projets = await _context.Projets
        .Where(p => mesProjetsIds.Contains(p.Id))
        .Select(p => new { p.Id, p.Nom })
        .ToListAsync();

    // 2. Qui travaille sur ces projets (couples projet / membre)
    var affectations = await _context.Taches
        .Where(t => mesProjetsIds.Contains(t.ProjetId) && t.MembreId != null)
        .Select(t => new { t.ProjetId, MembreId = t.MembreId.GetValueOrDefault() })
        .Distinct()
        .ToListAsync();

    // 3. Les infos de ces membres
    var membresIds = affectations.Select(a => a.MembreId).Distinct().ToList();
    var membres = await _context.Membres
        .Where(m => membresIds.Contains(m.Id))
        .Select(m => new { m.Id, m.Nom, m.Email })
        .ToListAsync();

    // 4. Assemblage en mémoire
    var resultat = projets.Select(p => new
    {
        p.Id,
        p.Nom,
        Membres = affectations
            .Where(a => a.ProjetId == p.Id)
            .Select(a => membres.First(m => m.Id == a.MembreId))
            .ToList()
    });

    return Ok(resultat);
}
}
