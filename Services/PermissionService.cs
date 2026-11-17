using System.Security.Claims;
using GestionTachesProjets.Data;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
namespace GestionTachesProjets.Services;
// Droits relus en base à chaque requête : rôles Identity du compte (pour savoir s'il est Admin),
// affectations par projet (table AffectationsRoles) puis claims « permission » de chaque rôle.
// Retirer une affectation ou un privilège est donc immédiat, même avec un token encore valide.
// L'identité vient toujours du token (email), jamais du client.
// Un rôle à privilèges attribué GLOBALEMENT (sans projet) ne donne AUCUN privilège.
public class PermissionService : IPermissionService
{
    private readonly UserManager<IdentityUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly AppDbContext _context;   // lecture seule : membres et appartenance aux projets
    private readonly IAffectationRoleRepository _affectations;
    public PermissionService(UserManager<IdentityUser> userManager, RoleManager<IdentityRole> roleManager,
        AppDbContext context, IAffectationRoleRepository affectations)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _context = context;
        _affectations = affectations;
    }

    private static string? Email(ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.Email) ?? user.Identity?.Name;

    // Admin d'après les rôles actuels en base (pas ceux du token)
    private async Task<bool> EstAdmin(ClaimsPrincipal user)
    {
        var compte = await _userManager.FindByEmailAsync(Email(user) ?? string.Empty);
        return compte != null && await _userManager.IsInRoleAsync(compte, "Admin");
    }

    // fiche Membre du connecté (null pour un compte sans fiche, ex. l'Admin)
    private async Task<Membre?> MembreConnecte(ClaimsPrincipal user)
    {
        var email = Email(user);
        return email == null ? null : await _context.Membres.FirstOrDefaultAsync(m => m.Email == email);
    }

    public async Task<List<string>> PrivilegesDuRoleAsync(string nomRole)
    {
        var role = await _roleManager.FindByNameAsync(nomRole);
        if (role == null) return new List<string>();
        return (await _roleManager.GetClaimsAsync(role))
            .Where(c => c.Type == Permissions.Type && Permissions.Existe(c.Value))
            .Select(c => c.Value).Distinct().ToList();
    }

    public async Task<bool> AUtilisateurPrivilegeAsync(ClaimsPrincipal user, string privilege, int projetId)
    {
        // l'Admin a tous les privilèges, sur tous les projets
        if (await EstAdmin(user)) return true;
        var membre = await MembreConnecte(user);
        // il faut être toujours membre du projet (au moins une tâche affectée)
        if (membre == null || !await MembreIdDansProjetAsync(membre.Id, projetId)) return false;
        // une affectation DANS CE PROJET vers un rôle qui porte ce privilège
        foreach (var a in await _affectations.GetByMembreAsync(membre.Id))
            if (a.ProjetId == projetId && (await PrivilegesDuRoleAsync(a.NomRole)).Contains(privilege))
                return true;
        return false;
    }

    // Admin : { admin: true, privileges: [catalogue] }.
    // Membre : { admin: false, projets: { "<id>": { projetNom, roles, privileges } } }, une entrée
    // par projet où il a au moins une affectation ET dont il est toujours membre.
    public async Task<object> MesDroitsAsync(ClaimsPrincipal user)
    {
        static object Lisible(Permissions.Privilege p) => new { cle = p.Cle, libelle = p.Libelle, description = p.Description };
        if (await EstAdmin(user))
            return new { admin = true, privileges = Permissions.Catalogue.Select(Lisible).ToList() };

        var projets = new Dictionary<string, object>();
        var membre = await MembreConnecte(user);
        if (membre != null)
        {
            foreach (var groupe in (await _affectations.GetByMembreAsync(membre.Id)).GroupBy(a => a.ProjetId))
            {
                if (!await MembreIdDansProjetAsync(membre.Id, groupe.Key)) continue;
                var roles = groupe.Select(a => a.NomRole).Distinct().ToList();
                var cles = new HashSet<string>();   // privilèges dédupliqués
                foreach (var r in roles) cles.UnionWith(await PrivilegesDuRoleAsync(r));
                projets[groupe.Key.ToString()] = new
                {
                    projetNom = groupe.First().Projet?.Nom,
                    roles,
                    privileges = Permissions.Catalogue.Where(p => cles.Contains(p.Cle)).Select(Lisible).ToList()
                };
            }
        }
        return new { admin = false, projets };
    }

    // étendue : un privilège ne s'applique que dans les projets dont on est membre
    public async Task<bool> EstMembreDuProjetAsync(string? email, int projetId)
    {
        var membre = await _context.Membres.FirstOrDefaultAsync(m => m.Email == email);
        return membre != null && await MembreIdDansProjetAsync(membre.Id, projetId);
    }

    public async Task<bool> MembreIdDansProjetAsync(int membreId, int projetId) =>
        await _context.Taches.AnyAsync(t => t.ProjetId == projetId && t.MembreId == membreId);
}
