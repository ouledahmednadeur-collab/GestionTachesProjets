using GestionTachesProjets.DTOs ;
using GestionTachesProjets.Models;
namespace GestionTachesProjets.Repositories ;
public interface IProjetRepository
{
    Task<PagedResult<Projet>> GetAllAsync(int page,int pageSize);
    Task<Projet?> GetByIdAsync(int id);
    Task<Projet> AddAsync(Projet projet);
    Task UpdateAsync (Projet projet);
    Task DeleteAsync(Projet projet);

}