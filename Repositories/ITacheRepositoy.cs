using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
namespace GestionTachesProjets.Repositories ;
public interface ITacheRepository
{
    Task<PagedResult<Tache>> GetByProjetAsync (int projetId,StatutTache? statut , int page ,int pageSize);
    Task<PagedResult<Tache>> GetByMembreAsync ( int membreId,int page , int pageSize);
    Task<Tache?> GetByIdAsync(int id);
    Task<Tache> AddAsync(Tache tache);
    Task UpdateAsync(Tache tache);
    Task DeleteAsync(Tache tache);
    Task<double> GetAvancementAsync(int projetId);
}