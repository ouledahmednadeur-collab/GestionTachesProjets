using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using GestionTachesProjets.Data;
using GestionTachesProjets.Repositories;
using GestionTachesProjets.Services;
namespace GestionTachesProjets.Controllers;
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles ="Admin")]
public class RolesController : ControllerBase
{
    private readonly RoleManager<IdentityRole> _roleManager ; 
    private readonly UserManager<IdentityUser> _userManager ;
    private readonly AppDbContext _context ;                      // membres et projets (lecture)
    private readonly IAffectationRoleRepository _affectations ;   // rôles par projet
    private readonly IPermissionService _permissions ;
    public RolesController(RoleManager<IdentityRole> roleManager ,UserManager<IdentityUser> userManager,
        AppDbContext context, IAffectationRoleRepository affectations, IPermissionService permissions)
    {
        _roleManager = roleManager ;
        _userManager = userManager ;
        _context = context ;
        _affectations = affectations ;
        _permissions = permissions ;
    }
    [HttpGet]
    public async Task<ActionResult<List<string>>> GetAll()
    {
        var roles = await _roleManager.Roles.Select(r=>r.Name).ToListAsync();
        return Ok(roles);
    }
    // liste des utilisateurs avec leurs roles (lecture seule)
    [HttpGet("utilisateurs")]
    public async Task<ActionResult> GetUtilisateurs()
    {
        var users = await _userManager.Users.ToListAsync();
        var affectations = await _affectations.GetAllAsync();   // rôles par projet, lus une seule fois
        var resultat = new List<object>();
        foreach (var u in users)
            resultat.Add(new {
                email = u.Email,
                roles = await _userManager.GetRolesAsync(u),   // rôles globaux (format inchangé)
                // champ ajouté : rôles affectés par projet
                affectations = affectations.Where(a => a.Membre?.Email == u.Email)
                    .Select(a => new { role = a.NomRole, projetId = a.ProjetId, projetNom = a.Projet?.Nom })
            });
        return Ok(resultat);
    }
    // Recherche d'un rôle par son nom, utilisée partout : espaces autour retirés, puis
    // FindByNameAsync (nom normalisé : insensible à la casse). Repli pour un rôle déjà enregistré
    // avec des espaces autour de son nom (avant la correction de Create).
    private async Task<IdentityRole?> TrouverRole(string? nom)
    {
        var n = (nom ?? string.Empty).Trim();
        if (n.Length == 0) return null;
        return await _roleManager.FindByNameAsync(n)
            ?? (await _roleManager.Roles.ToListAsync())
                .FirstOrDefault(r => string.Equals(r.Name?.Trim(), n, StringComparison.OrdinalIgnoreCase));
    }

    // Création d'un rôle, avec des privilèges optionnels. Tout est validé AVANT de créer quoi que
    // ce soit ; si l'ajout d'un privilège échoue ensuite, le rôle créé est supprimé (création atomique).
    [HttpPost]
    public async Task<IActionResult> Create(RoleCreateDto dto)
    {
        var nom = dto.Nom.Trim();   // plus jamais d'espace au début ou à la fin d'un nom de rôle
        if (nom.Length < 2) return BadRequest("Le nom du rôle doit contenir au moins 2 caractères.");
        if (nom.Equals("Admin", StringComparison.OrdinalIgnoreCase) || nom.Equals("Membre", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Les rôles Admin et Membre existent déjà et sont réservés.");
        if (await TrouverRole(nom) != null)   // doublon, insensible à la casse
            return BadRequest("Ce role existe deja.");
        var privileges = (dto.Privileges ?? new List<string>()).Select(p => p.Trim()).Distinct().ToList();
        var inconnues = privileges.Where(p => !Permissions.Existe(p)).ToList();
        if (inconnues.Count > 0) return BadRequest("Privilège inconnu : " + string.Join(", ", inconnues));

        var role = new IdentityRole(nom);
        var cree = await _roleManager.CreateAsync(role);
        if (!cree.Succeeded) return BadRequest(cree.Errors.Select(e => e.Description));
        try
        {
            foreach (var p in privileges)
            {
                var ajout = await _roleManager.AddClaimAsync(role, new Claim(Permissions.Type, p));
                if (!ajout.Succeeded) throw new InvalidOperationException(string.Join(" ", ajout.Errors.Select(e => e.Description)));
            }
        }
        catch (Exception e)
        {
            await _roleManager.DeleteAsync(role);   // pas de rôle à moitié créé
            return StatusCode(500, "Création du rôle annulée : privilèges non enregistrés. " + e.Message);
        }
        // 201 : le champ « message » existant est conservé, le rôle et ses privilèges sont ajoutés
        return Created($"/api/Roles/{Uri.EscapeDataString(nom)}/privileges",
            new { message = "Role cree", nom = role.Name, privileges });
    }
    // Attribution : Admin et Membre restent globaux (sans projet). Un rôle porteur d'au moins un
    // privilège s'attribue OBLIGATOIREMENT dans un projet dont le membre fait partie. Un rôle sans
    // privilège reste global, ou par projet si un projet est fourni.
    [HttpPost("attribuer")]
    public async Task<IActionResult> Attribuer (UserRoleDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user== null)
        return NotFound("Utilisateur introuvable");
        var role = await TrouverRole(dto.Role);
        if (role == null)
        return NotFound("Role introuvable.");
        var global = role.Name == "Admin" || role.Name == "Membre";
        if (global && dto.ProjetId != null)
            return BadRequest("Les rôles Admin et Membre sont globaux : ne choisissez pas de projet.");
        var aDesPrivileges = !global && (await _permissions.PrivilegesDuRoleAsync(role.Name!)).Count > 0;
        if (aDesPrivileges && dto.ProjetId == null)
            return BadRequest("Choisissez un projet : ce rôle porte des privilèges, il s'attribue par projet.");

        if (dto.ProjetId != null)
        {
            // affectation par projet
            var projetId = dto.ProjetId.Value;
            if (!await _context.Projets.AnyAsync(p => p.Id == projetId))
                return NotFound("Projet introuvable.");
            var membre = await _context.Membres.FirstOrDefaultAsync(m => m.Email == user.Email);
            if (membre == null || !await _permissions.MembreIdDansProjetAsync(membre.Id, projetId))
                return BadRequest("Ce membre n'est pas affecté à ce projet.");
            if (await _affectations.ExisteAsync(membre.Id, projetId, role.Name!))
                return Conflict("Ce rôle est déjà attribué à ce membre dans ce projet.");
            await _affectations.AddAsync(new AffectationRole { MembreId = membre.Id, ProjetId = projetId, NomRole = role.Name! });
            return Ok(new { message = "Role attribue", projetId });
        }
        var result = await _userManager.AddToRoleAsync(user ,role.Name!);   // nom réel du rôle
        if (!result.Succeeded) return BadRequest(result.Errors.Select(e => e.Description));
        return Ok(new { message ="Role attribue"});
    }
    // Retrait : avec un projet, retire l'affectation de ce projet ; sans projet, comportement
    // global inchangé (le front réattribue « Membre » si le compte n'a plus aucun rôle)
    [HttpDelete("retirer")]
    public async Task<IActionResult> Retirer(UserRoleDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null) return NotFound("Utilisateur Introuvable");
        var role = await TrouverRole(dto.Role);   // nom réel du rôle s'il existe
        if (dto.ProjetId != null)
        {
            if (role == null) return NotFound("Role introuvable.");
            var membre = await _context.Membres.FirstOrDefaultAsync(m => m.Email == user.Email);
            var affectation = membre == null ? null
                : await _affectations.TrouverAsync(membre.Id, dto.ProjetId.Value, role.Name!);
            if (affectation == null) return NotFound("Ce membre n'a pas ce rôle dans ce projet.");
            await _affectations.DeleteAsync(affectation);   // perte du privilège immédiate
            return Ok(new { message = "Role retire", projetId = dto.ProjetId });
        }
        var result = await _userManager.RemoveFromRoleAsync(user, role?.Name ?? dto.Role);
        if (!result.Succeeded) return BadRequest(result.Errors.Select(e=> e.Description));
        return Ok(new{message = "Role retire"});
    }

    // ===== Privilèges des rôles (toute la classe est [Authorize(Roles = "Admin")] :
    // gérer les rôles et leurs privilèges n'est jamais délégable) =====

    // catalogue fixe des privilèges délégables
    [HttpGet("privileges")]
    public ActionResult Catalogue()
    {
        return Ok(Permissions.Catalogue.Select(p => new { cle = p.Cle, libelle = p.Libelle, description = p.Description }));
    }

    // clés accordées à ce rôle (claims de rôle de type « permission »)
    [HttpGet("{nomRole}/privileges")]
    public async Task<ActionResult<List<string>>> PrivilegesDuRole(string nomRole)
    {
        var role = await TrouverRole(nomRole);
        if (role == null) return NotFound("Role introuvable.");
        var claims = await _roleManager.GetClaimsAsync(role);
        return Ok(claims.Where(c => c.Type == Permissions.Type).Select(c => c.Value).Distinct().ToList());
    }

    // remplace l'ensemble des privilèges du rôle ; Admin (tous les droits) et Membre (rôle par
    // défaut, sans privilège) ne sont pas modifiables
    [HttpPut("{nomRole}/privileges")]
    public async Task<IActionResult> RemplacerPrivileges(string nomRole, RolePrivilegesDto dto)
    {
        var role = await TrouverRole(nomRole);
        if (role == null) return NotFound("Role introuvable.");
        if (role.Name == "Admin" || role.Name == "Membre")
            return BadRequest("Les privilèges des rôles Admin et Membre ne sont pas modifiables.");
        var inconnues = dto.Privileges.Where(c => !Permissions.Existe(c)).ToList();
        if (inconnues.Count > 0) return BadRequest("Privilège inconnu : " + string.Join(", ", inconnues));

        var voulues = dto.Privileges.Distinct().ToHashSet();
        var actuelles = (await _roleManager.GetClaimsAsync(role)).Where(c => c.Type == Permissions.Type).ToList();
        foreach (var c in actuelles.Where(c => !voulues.Contains(c.Value)))
            await _roleManager.RemoveClaimAsync(role, c);
        foreach (var cle in voulues.Where(v => actuelles.All(c => c.Value != v)))
            await _roleManager.AddClaimAsync(role, new Claim(Permissions.Type, cle));
        return NoContent();
    }
}
