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
    // Tous MES messages : ceux où ma fiche est expéditeur ou destinataire, ou, pour un Admin,
    // ceux qui portent son email (AdminEmail). Jamais ceux des autres, pas même pour l'Admin.
    private IQueryable<Message> DeMoi(Participant moi) => moi.EstAdmin
        ? _context.Messages.Where(m => m.AdminEmail == moi.Email)
        : _context.Messages.Where(m => m.ExpediteurId == moi.MembreId || m.DestinataireId == moi.MembreId);

    // Messages entre moi et un interlocuteur (0 = l'Administrateur).
    private IQueryable<Message> Entre(Participant moi, int autreId)
    {
        if (moi.EstAdmin)   // Admin <-> un membre
            return DeMoi(moi).Where(m => m.ExpediteurId == autreId || m.DestinataireId == autreId);
        if (autreId == Participant.AdminId)   // membre <-> l'Administrateur
            return DeMoi(moi).Where(m => m.AdminEmail != null);
        return DeMoi(moi).Where(m => m.AdminEmail == null   // membre <-> membre
            && (m.ExpediteurId == autreId || m.DestinataireId == autreId));
    }

    public async Task<PagedResult<Message>> GetConversationAsync(Participant moi, int interlocuteurId, int page, int pageSize)
    {
        var query = Entre(moi, interlocuteurId);
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
    // (reçu = je suis le destinataire : DestinataireId == ma fiche, ou null pour l'Admin)
    public async Task<PagedResult<ConversationDto>> GetConversationsAsync(Participant moi, int page, int pageSize)
    {
        var mesMessages = DeMoi(moi);
        // clé de l'interlocuteur : l'autre fiche Membre, ou 0 si l'autre est l'Admin
        var parInterlocuteur = moi.EstAdmin
            ? mesMessages.GroupBy(m => (m.ExpediteurId ?? m.DestinataireId) ?? 0)
            : mesMessages.GroupBy(m => m.AdminEmail != null ? 0
                : (m.ExpediteurId == moi.MembreId ? m.DestinataireId : m.ExpediteurId) ?? 0);
        var query = parInterlocuteur.Select(g => new
            {
                InterlocuteurId = g.Key,
                Dernier = g.Max(m => m.DateEnvoi),
                NonLus = g.Count(m => m.DestinataireId == moi.MembreId && !m.Lu)
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
            var admin = l.InterlocuteurId == Participant.AdminId;
            var membre = admin ? null : await _context.Membres.FindAsync(l.InterlocuteurId);
            var dernier = await Entre(moi, l.InterlocuteurId)
                .OrderByDescending(m => m.DateEnvoi).ThenByDescending(m => m.Id)
                .FirstAsync();
            items.Add(new ConversationDto
            {
                InterlocuteurId = l.InterlocuteurId,
                Nom = admin ? "Administrateur" : membre?.Nom ?? string.Empty,
                Email = admin ? string.Empty : membre?.Email ?? string.Empty,
                EstAdmin = admin,
                Extrait = dernier.Contenu.Length > 80 ? dernier.Contenu[..80] + "…" : dernier.Contenu,
                DateDernierMessage = dernier.DateEnvoi,
                NonLus = l.NonLus
            });
        }
        return new PagedResult<ConversationDto> { Page = page, PageSize = pageSize, Total = total, Items = items };
    }
    // marque comme lus les messages REÇUS de cet interlocuteur
    public async Task MarquerLusAsync(Participant moi, int interlocuteurId)
    {
        var maintenant = DateTime.UtcNow;
        await Entre(moi, interlocuteurId)
            .Where(m => m.DestinataireId == moi.MembreId && !m.Lu)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.Lu, true).SetProperty(m => m.DateLecture, maintenant));
    }
    public async Task<int> CompterNonLusAsync(Participant moi)
    {
        return await DeMoi(moi).CountAsync(m => m.DestinataireId == moi.MembreId && !m.Lu);
    }
}
