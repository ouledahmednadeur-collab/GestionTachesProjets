using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
namespace GestionTachesProjets.Repositories ;
public interface IMembreRepository
{
    Task <PagedResult<Membre>> GetAllAsync(int page , int pageSize);
    Task<Membre?> GetByIdAsync(int id);
    Task<Membre> AddAsync(Membre membre);
    Task<Membre> UpdateAsync(Membre membre);
    Task  DeleteAsync(Membre membre);
}