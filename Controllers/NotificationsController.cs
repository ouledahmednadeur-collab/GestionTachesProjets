using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
namespace GestionTachesProjets.Controllers;
// Notifications de l'utilisateur connecté. Jamais les notifications d'un autre : chaque requête
// filtre sur l'email du token, y compris pour l'Admin. Aucune création par le client.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationRepository _notifications;
    public NotificationsController(INotificationRepository notifications)
    {
        _notifications = notifications;
    }

    // destinataire lu dans le token (email du compte), en minuscules comme à l'enregistrement
    private string MonEmail() =>
        (User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? string.Empty).Trim().ToLowerInvariant();

    // ma notification, ou null si elle n'existe pas OU n'est pas à moi (même 404 dans les deux cas,
    // pour ne pas révéler l'existence de la notification d'un autre)
    private async Task<Notification?> LaMienne(int id)
    {
        var n = await _notifications.GetByIdAsync(id);
        return n != null && n.DestinataireEmail == MonEmail() ? n : null;
    }

[HttpGet]
    public async Task<ActionResult<PagedResult<NotificationDto>>> GetMesNotifications(int page = 1, int pageSize = 10, bool nonLues = false)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 50) pageSize = 10;
        // jamais les notifications d'un autre : filtre sur l'email du token
        var r = await _notifications.GetByDestinataireAsync(MonEmail(), nonLues, page, pageSize);
        return Ok(new PagedResult<NotificationDto>
        {
            Page = r.Page, PageSize = r.PageSize, Total = r.Total,
            Items = r.Items.Select(ToDto).ToList()
        });
    }

[HttpGet("non-lues")]
    public async Task<ActionResult> NonLues()
    {
        return Ok(new { nonLues = await _notifications.CompterNonLuesAsync(MonEmail()) });
    }

[HttpPut("{id}/lue")]
    public async Task<IActionResult> MarquerLue(int id)
    {
        var n = await LaMienne(id);
        if (n == null) return NotFound();
        await _notifications.MarquerLueAsync(n);
        return NoContent();
    }

[HttpPut("lues")]
    public async Task<IActionResult> MarquerToutesLues()
    {
        await _notifications.MarquerToutesLuesAsync(MonEmail());
        return NoContent();
    }

[HttpDelete("{id}")]
    public async Task<IActionResult> Supprimer(int id)
    {
        var n = await LaMienne(id);
        if (n == null) return NotFound();
        await _notifications.DeleteAsync(n);
        return NoContent();
    }

    private static NotificationDto ToDto(Notification n) => new NotificationDto
    {
        Id = n.Id,
        Type = n.Type,
        Texte = n.Texte,
        TacheId = n.TacheId,
        ExpediteurMembreId = n.ExpediteurMembreId,
        Lue = n.Lue,
        DateCreation = n.DateCreation
    };
}
