using GestionTachesProjets.Data;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using Microsoft.EntityFrameworkCore;
namespace GestionTachesProjets.Repositories;
public class MessageRepository : IMessageRepository
{
    private readonly AppDbContext _context;
    public MessageRepository(AppDbContext context)
    {
        _context = context;
    }
    public async Task<Message> AddAsync(Message message)
    {
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();
        return message;
    }
    public async Task<Message?> GetByIdAsync(int id)
    {
        return await _context.Messages.FindAsync(id);
    }
    public async Task DeleteAsync(Message message)
    {
        _context.Messages.Remove(message);
        await _context.SaveChangesAsync();
    }
    // seulement les messages dont les deux participants sont membreId et interlocuteurId
    public async Task<PagedResult<Message>> GetConversationAsync(int membreId, int interlocuteurId, int page, int pageSize)
    {
        var query = _context.Messages.Where(m =>
            (m.ExpediteurId == membreId && m.DestinataireId == interlocuteurId) ||
            (m.ExpediteurId == interlocuteurId && m.DestinataireId == membreId));
        var total = await query.CountAsync();
        // page 1 = les plus récents (pour « Charger les messages précédents »),
        // puis remis en ordre chronologique dans la page
        var items = await query
            .Include(m => m.Expediteur)
            .Include(m => m.Destinataire)
            .OrderByDescending(m => m.DateEnvoi).ThenByDescending(m => m.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        items.Reverse();
        return new PagedResult<Message> { Page = page, PageSize = pageSize, Total = total, Items = items };
    }
    // une ligne par interlocuteur : date du dernier message et nombre de messages reçus non lus
    public async Task<PagedResult<ConversationDto>> GetConversationsAsync(int membreId, int page, int pageSize)
    {
        var query = _context.Messages
            .Where(m => m.ExpediteurId == membreId || m.DestinataireId == membreId)
            .GroupBy(m => m.ExpediteurId == membreId ? m.DestinataireId : m.ExpediteurId)
            .Select(g => new
            {
                InterlocuteurId = g.Key,
                Dernier = g.Max(m => m.DateEnvoi),
                NonLus = g.Count(m => m.DestinataireId == membreId && !m.Lu)
            });
        var total = await query.CountAsync();
        var lignes = await query
            .OrderByDescending(x => x.Dernier)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        var items = new List<ConversationDto>();
        foreach (var l in lignes)
        {
            var membre = await _context.Membres.FindAsync(l.InterlocuteurId);
            var dernier = await _context.Messages
                .Where(m => (m.ExpediteurId == membreId && m.DestinataireId == l.InterlocuteurId) ||
                            (m.ExpediteurId == l.InterlocuteurId && m.DestinataireId == membreId))
                .OrderByDescending(m => m.DateEnvoi).ThenByDescending(m => m.Id)
                .FirstAsync();
            items.Add(new ConversationDto
            {
                InterlocuteurId = l.InterlocuteurId,
                Nom = membre?.Nom ?? string.Empty,
                Email = membre?.Email ?? string.Empty,
                Extrait = dernier.Contenu.Length > 80 ? dernier.Contenu[..80] + "…" : dernier.Contenu,
                DateDernierMessage = dernier.DateEnvoi,
                NonLus = l.NonLus
            });
        }
        return new PagedResult<ConversationDto> { Page = page, PageSize = pageSize, Total = total, Items = items };
    }
    // marque comme lus les messages REÇUS de cet interlocuteur
    public async Task MarquerLusAsync(int membreId, int interlocuteurId)
    {
        var maintenant = DateTime.UtcNow;
        await _context.Messages
            .Where(m => m.ExpediteurId == interlocuteurId && m.DestinataireId == membreId && !m.Lu)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.Lu, true).SetProperty(m => m.DateLecture, maintenant));
    }
    public async Task<int> CompterNonLusAsync(int membreId)
    {
        return await _context.Messages.CountAsync(m => m.DestinataireId == membreId && !m.Lu);
    }
}
