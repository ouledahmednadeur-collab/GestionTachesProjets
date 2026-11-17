using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using GestionTachesProjets.Data;
using Microsoft.AspNetCore.Identity;
using GestionTachesProjets.Services;
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
    private readonly UserManager<IdentityUser> _userManager ;
    private readonly INotificationService _notifications ;
    private readonly IPermissionService _permissions ;
    public  TachesController(ITacheRepository taches , IProjetRepository projets , IMembreRepository membres , AppDbContext context , UserManager<IdentityUser> userManager , INotificationService notifications , IPermissionService permissions)
    {
        _taches=taches;
        _membres=membres;
        _projets=projets;
        _context=context;
        _userManager=userManager;
        _notifications=notifications;
        _permissions=permissions;
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
        var dto = ToDto(tache);
        // membre affecté : son nom, et son rôle lu dans son compte Identity (relié par l'email)
        if (tache.MembreId != null)
        {
            var membre = await _membres.GetByIdAsync(tache.MembreId.Value);
            if (membre != null)
            {
                dto.MembreNom = membre.Nom;
                var user = await _userManager.FindByEmailAsync(membre.Email);
                var roles = user == null ? new List<string>() : await _userManager.GetRolesAsync(user);
                // Admin d'abord, sinon le rôle métier, sinon « Membre »
                dto.MembreRole = roles.Contains("Admin") ? "Admin"
                               : roles.FirstOrDefault(r => r != "Membre") ?? "Membre";
            }
        }
        return Ok(dto);
    }
[HttpPost]
    public async Task<ActionResult<TacheDto>> Create(TacheCreateDto dto)
    {
        if (await _projets.GetByIdAsync(dto.ProjetId)==null)
        return NotFound("projet introuvable");
        // Admin, ou membre qui a le privilège « taches.creer » DANS CE projet (rôle affecté au
        // projet + toujours membre du projet, droits relus en base à chaque requête) ; sinon 403
        if (!User.IsInRole("Admin")
            && !await _permissions.AUtilisateurPrivilegeAsync(User, Permissions.TachesCreer, dto.ProjetId))
            return Forbid();
        var tache = new Tache
        {
            Titre= dto.Titre,
            Description= dto.Description,
            ProjetId=dto.ProjetId
        };
        await _taches.AddAsync(tache);
        // notification « tâche ajoutée » aux membres du projet (pas aux admins), sauf l'auteur ;
        // auteur lu dans le token ; une erreur de notification n'annule pas la création
        var auteur = EmailToken();
        await _notifications.TacheAjouteeAsync(tache, auteur,
            await _notifications.NomAuteurAsync(auteur, User.IsInRole("Admin")));
        return CreatedAtAction(nameof(GetById),new {id=tache.Id},ToDto(tache));
    }
    // email du compte connecté, lu dans le token (jamais envoyé par le client)
    private string? EmailToken() => User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
[HttpPut("{id}/affecter")]
    public async Task<ActionResult<TacheDto>> Affecter(int id , AffecterTacheDto dto)
    {
        // Admin : comme avant. Sinon il faut le privilège « taches.affecter » DANS LE PROJET de la
        // tâche (affectation de rôle par projet, droits relus en base à chaque requête), sinon 403
        var admin = User.IsInRole("Admin");
        var tache = await _taches.GetByIdAsync(id);
        if (tache==null) return NotFound("Tache introuvable");
        if (!admin && !await _permissions.AUtilisateurPrivilegeAsync(User, Permissions.TachesAffecter, tache.ProjetId))
            return Forbid();
        if (await _membres.GetByIdAsync(dto.MembreId)==null)
        return NotFound("Membre introuvable");
        // le membre destinataire doit aussi être membre de ce projet (ou être la personne qui affecte)
        if (!admin)
        {
            var moi = await _context.Membres.FirstOrDefaultAsync(m => m.Email == EmailToken());
            if (moi == null) return Forbid();
            if (dto.MembreId != moi.Id && !await _permissions.MembreIdDansProjetAsync(dto.MembreId, tache.ProjetId))
                return Forbid();
        }
        var ancienMembre = tache.MembreId;   // pour ne notifier qu'une vraie (ré)affectation
        tache.MembreId=dto.MembreId;
        await _taches.UpdateAsync(tache);
        // notification « vous a affecté la tâche » au membre affecté (sauf s'il est l'auteur) ;
        // une erreur de notification n'annule pas l'affectation
        if (ancienMembre != tache.MembreId)
            await _notifications.TacheAffecteeAsync(tache, EmailToken(),
                await _notifications.NomAuteurAsync(EmailToken(), User.IsInRole("Admin")));
        return Ok(ToDto(tache));
    }
    //-------------------------------------------------------------------------------------------
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
            // règle actuelle : le membre affecté ; EN PLUS : privilège « taches.statut » DANS LE PROJET
            // de la tâche (rôle affecté à ce projet + toujours membre du projet, relu en base)
            var affecte = membre != null && tache.MembreId == membre.Id;
            if (!affecte && !await _permissions.AUtilisateurPrivilegeAsync(User, Permissions.TachesStatut, tache.ProjetId))
            return Forbid();
        }
        var ancien = tache.Statut;   // pour savoir si le statut change vraiment
        tache.Statut=dto.Statut ;
        await _taches.UpdateAsync(tache);
        // notifications après la mise à jour réussie (membres du projet + admins, sauf l'auteur,
        // seulement si le statut a changé) ; une erreur de notification n'annule pas la modification
        await _notifications.StatutTacheAsync(tache, ancien, EmailToken(),
            await _notifications.NomAuteurAsync(EmailToken(), User.IsInRole("Admin")));
        return Ok(ToDto(tache));
        }
        //-------------------------------------------------------------------------------------------
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
