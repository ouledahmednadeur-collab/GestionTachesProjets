using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
namespace GestionTachesProjets.Repositories;
// toutes les lectures et écritures portent sur un destinataire précis (email en minuscules)
public interface INotificationRepository
{
    Task AddRangeAsync(IEnumerable<Notification> notifications);
    Task<PagedResult<Notification>> GetByDestinataireAsync(string email, bool nonLuesSeulement, int page, int pageSize);
    Task<int> CompterNonLuesAsync(string email);
    Task<Notification?> GetByIdAsync(int id);
    Task MarquerLueAsync(Notification notification);
    Task MarquerToutesLuesAsync(string email);
    Task DeleteAsync(Notification notification);
}
