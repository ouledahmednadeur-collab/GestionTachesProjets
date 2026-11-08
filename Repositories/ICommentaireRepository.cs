using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
namespace GestionTachesProjets.Repositories;
public interface ICommentaireRepository
{
    Task<PagedResult<Commentaire>> GetByTacheAsync(int tacheId,int page ,int pageSize);
    Task<Commentaire?> GetByIdAsync(int id);
    Task<Commentaire> AddAsync (Commentaire commentaire);
    Task DeleteAsync(Commentaire commentaire);
}