using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
namespace GestionTachesProjets.Repositories;
public interface IMessageRepository
{
    Task<Message> AddAsync(Message message);
    Task<Message?> GetByIdAsync(int id);
    Task DeleteAsync(Message message);
    // messages échangés entre deux membres (page 1 = les plus récents, chaque page en ordre chronologique)
    Task<PagedResult<Message>> GetConversationAsync(int membreId, int interlocuteurId, int page, int pageSize);
    // un résumé par interlocuteur, du dernier message le plus récent au plus ancien
    Task<PagedResult<ConversationDto>> GetConversationsAsync(int membreId, int page, int pageSize);
    Task MarquerLusAsync(int membreId, int interlocuteurId);
    Task<int> CompterNonLusAsync(int membreId);
}
