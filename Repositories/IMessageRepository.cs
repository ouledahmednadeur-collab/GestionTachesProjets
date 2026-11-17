using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
namespace GestionTachesProjets.Repositories;
public interface IMessageRepository
{
    Task<Message> AddAsync(Message message);
    Task<Message?> GetByIdAsync(int id);
    Task DeleteAsync(Message message);
    // moi = participant connecté (membre ou Admin) ; interlocuteurId 0 = l'Administrateur
    // messages échangés entre moi et l'interlocuteur (page 1 = les plus récents, chaque page en ordre chronologique)
    Task<PagedResult<Message>> GetConversationAsync(Participant moi, int interlocuteurId, int page, int pageSize);
    // un résumé par interlocuteur, du dernier message le plus récent au plus ancien
    Task<PagedResult<ConversationDto>> GetConversationsAsync(Participant moi, int page, int pageSize);
    Task MarquerLusAsync(Participant moi, int interlocuteurId);
    Task<int> CompterNonLusAsync(Participant moi);
}
