using System.Security.Claims;
namespace GestionTachesProjets.Services;
// Vérification des privilèges PAR PROJET : droits relus en base à chaque requête (jamais copiés
// dans le token). Un rôle porteur de privilèges n'agit que dans les projets où il est affecté.
public interface IPermissionService
{
    // vrai si l'utilisateur est Admin, OU s'il a dans CE projet une affectation vers un rôle qui
    // porte ce privilège ET qu'il est toujours membre du projet (au moins une tâche)
    Task<bool> AUtilisateurPrivilegeAsync(ClaimsPrincipal user, string privilege, int projetId);
    // clés de privilèges portées par un rôle (claims « permission » du rôle)
    Task<List<string>> PrivilegesDuRoleAsync(string nomRole);
    // droits du connecté, pour GET /api/Auth/privileges (Admin, ou détail par projet)
    Task<object> MesDroitsAsync(ClaimsPrincipal user);
    // étendue : « membre d'un projet » = au moins une tâche affectée dans ce projet
    Task<bool> EstMembreDuProjetAsync(string? email, int projetId);
    Task<bool> MembreIdDansProjetAsync(int membreId, int projetId);
}
