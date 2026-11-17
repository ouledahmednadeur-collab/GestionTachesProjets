using GestionTachesProjets.Models;
namespace GestionTachesProjets.Repositories;
// affectations de rôles par projet (membre, projet, nom du rôle)
public interface IAffectationRoleRepository
{
    Task<AffectationRole> AddAsync(AffectationRole affectation);
    Task DeleteAsync(AffectationRole affectation);
    Task<AffectationRole?> TrouverAsync(int membreId, int projetId, string nomRole);
    Task<bool> ExisteAsync(int membreId, int projetId, string nomRole);
    Task<List<AffectationRole>> GetByMembreAsync(int membreId);
    Task<List<AffectationRole>> GetByProjetAsync(int projetId);
    Task<List<AffectationRole>> GetByRoleAsync(string nomRole);
    Task<List<AffectationRole>> GetAllAsync();
}
