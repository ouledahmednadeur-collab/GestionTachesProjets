using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using GestionTachesProjets.Data;
using GestionTachesProjets.Services;
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
    private readonly IPermissionService _permissions ;

    public CommentairesController( ICommentaireRepository commentaires , ITacheRepository taches , IMembreRepository membres , AppDbContext context , IPermissionService permissions)
    {
        _commentaires=commentaires ;
        _taches=taches ;
        _membres=membres ;
        _context=context ;
        _permissions=permissions ;
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
      // L'auteur est TOUJOURS déduit du token, jamais choisi par le client (plus d'usurpation).
      var email=User.FindFirstValue(ClaimTypes.Email)??User.Identity?.Name;
      var commentaire = new Commentaire
      {
          Contenu = dto.Contenu,
          TacheId = tacheId
      };
      if (User.IsInRole("Admin"))
        {
      // Admin (compte sans fiche Membre) : commentaire marqué Admin, nom tiré de son email ;
      // un MembreId envoyé est ignoré
      commentaire.EstAdmin = true;
      commentaire.AuteurNom = (email ?? "Administrateur").Split('@')[0];
        }
      else
        {
      // Membre : sa propre fiche, obligatoire (règle existante : jamais au nom d'un autre)
      var membre=await _context.Membres.FirstOrDefaultAsync(m=>m.Email==email);
      if (membre==null || (dto.MembreId != null && membre.Id!=dto.MembreId))
        {
            return Forbid();
        }
      commentaire.MembreId = membre.Id;
        }
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
            // règle actuelle : l'auteur ; EN PLUS : privilège « commentaires.moderer » DANS LE PROJET
            // de la tâche commentée (rôle affecté à ce projet + toujours membre, relu en base)
            var auteur = membre != null && commentaire.MembreId == membre.Id;
            var tache = auteur || membre == null ? null : await _taches.GetByIdAsync(commentaire.TacheId);
            if (!auteur && !(tache != null
                    && await _permissions.AUtilisateurPrivilegeAsync(User, Permissions.CommentairesModerer, tache.ProjetId)))
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
        MembreId =c.MembreId ,
        EstAdmin = c.EstAdmin ,
        AuteurNom = c.EstAdmin ? (c.AuteurNom ?? "Administrateur") : null
    };
}