using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using GestionTachesProjets.Data;
namespace GestionTachesProjets.Controllers ;
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CommentairesController : ControllerBase
{
    private readonly ICommentaireRepository _commentaires ;
    private readonly ITacheRepository _taches ;
    private readonly IMembreRepository _membres ;
    private readonly AppDbContext _context ;
    public CommentairesController( ICommentaireRepository commentaires , ITacheRepository taches , IMembreRepository membres , AppDbContext context)
    {
        _commentaires=commentaires ;
        _taches=taches ;
        _membres=membres ;
        _context=context ;
    }
[HttpGet("/api/taches/{tacheId}/commentaires")]
    public async Task<ActionResult<PagedResult<CommentaireDto>>> GetByTache( int tacheId , int page=1 ,int pageSize=10)
    {
        if(await _taches.GetByIdAsync(tacheId) ==null) 
        return NotFound("tache introuvable");
        if (page<1) page=1 ;
        if (pageSize <1 || pageSize >50 ) pageSize =10;
        var result = await _commentaires.GetByTacheAsync(tacheId,page,pageSize);
        return Ok( new PagedResult<CommentaireDto>
        {
            Page=result.Page ,
            PageSize= result.PageSize,
            Total=result.Total,
            Items=result.Items.Select(ToDto).ToList()
        });
    }
[HttpGet("{id}")]
    public async Task<ActionResult<CommentaireDto>> GetById(int id)
    {
        var commentaire = await _commentaires.GetByIdAsync(id);
        if (commentaire == null) return NotFound();
        return Ok(ToDto(commentaire));
    }
[HttpPost("/api/taches/{tacheId}/commentaires")]
public async Task<ActionResult<CommentaireDto>> Create(int tacheId, CommentaireCreateDto dto)
    { if (await _taches.GetByIdAsync(tacheId) == null) return NotFound("Tache introuvable");
      if (await  _membres.GetByIdAsync(dto.MembreId)==null) return NotFound("Membre introuvable");
      var commentaire = new Commentaire
      {
          Contenu = dto.Contenu,
          TacheId = tacheId,
          MembreId = dto.MembreId
      };
      await _commentaires.AddAsync(commentaire);
      return CreatedAtAction(nameof(GetById),new{id=commentaire.Id},ToDto(commentaire));
    }
[HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var commentaire= await _commentaires.GetByIdAsync(id);
        if (commentaire == null) return NotFound();
        if (!User.IsInRole("Admin"))
        {
            var email=User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
            var membre = await _context.Membres.FirstOrDefaultAsync(m => m.Email == email);
            if (membre == null || commentaire.MembreId != membre.Id)
            return Forbid();
        }
        await _commentaires.DeleteAsync(commentaire);
        return NoContent();
    }
    private static CommentaireDto ToDto(Commentaire c)=> new CommentaireDto
    {
        Id=c.Id,
        contenu=c.Contenu ,
        DateCreation=c.DateCreation,
        TacheId=c.TacheId,
        MembreId =c.MembreId 
    };
}