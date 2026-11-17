using GestionTachesProjets.Data;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using Microsoft.EntityFrameworkCore;
namespace GestionTachesProjets.Repositories;
public class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _context;
    public NotificationRepository(AppDbContext context)
    {
        _context = context;
    }
    public async Task AddRangeAsync(IEnumerable<Notification> notifications)
    {
        _context.Notifications.AddRange(notifications);
        await _context.SaveChangesAsync();
    }
    // les plus récentes d'abord ; filtre optionnel sur les non lues
    public async Task<PagedResult<Notification>> GetByDestinataireAsync(string email, bool nonLuesSeulement, int page, int pageSize)
    {
        var query = _context.Notifications.Where(n => n.DestinataireEmail == email);
        if (nonLuesSeulement) query = query.Where(n => !n.Lue);
        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(n => n.DateCreation).ThenByDescending(n => n.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return new PagedResult<Notification> { Page = page, PageSize = pageSize, Total = total, Items = items };
    }
    public async Task<int> CompterNonLuesAsync(string email)
    {
        return await _context.Notifications.CountAsync(n => n.DestinataireEmail == email && !n.Lue);
    }
    public async Task<Notification?> GetByIdAsync(int id)
    {
        return await _context.Notifications.FindAsync(id);
    }
    public async Task MarquerLueAsync(Notification notification)
    {
        notification.Lue = true;
        await _context.SaveChangesAsync();
    }
    public async Task MarquerToutesLuesAsync(string email)
    {
        await _context.Notifications
            .Where(n => n.DestinataireEmail == email && !n.Lue)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.Lue, true));
    }
    public async Task DeleteAsync(Notification notification)
    {
        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();
    }
}
