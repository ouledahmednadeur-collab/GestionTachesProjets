using GestionTachesProjets.Data;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using GestionTachesProjets.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
namespace GestionTachesProjets.Controllers;
// Messagerie privée entre membres, et entre un membre et l'Admin (identifiant 0 dans l'API).
// Confidentialité : aucune route ne lit les messages d'autres personnes, pas même pour l'Admin
// (l'Admin ne voit que SES conversations) ; aucune route ne renvoie une liste globale.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageRepository _messages;
    private readonly IMembreRepository _membres;
    private readonly AppDbContext _context;
    private readonly INotificationService _notifications;
    private readonly UserManager<IdentityUser> _userManager;   // pour trouver le compte Admin destinataire
    public MessagesController(IMessageRepository messages, IMembreRepository membres, AppDbContext context,
                              INotificationService notifications, UserManager<IdentityUser> userManager)
    {
        _messages = messages;
        _membres = membres;
        _context = context;
        _notifications = notifications;
        _userManager = userManager;
    }

    // Participant connecté : son identité vient TOUJOURS du token (email), jamais du client.
    // Admin : participant sans fiche (id 0) ; membre : sa fiche Membre ; sinon null (403).
    private async Task<Participant?> MembreConnecte()
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
        if (email == null) return null;
        if (User.IsInRole("Admin")) return new Participant(null, email);
        var membre = await _context.Membres.FirstOrDefaultAsync(m => m.Email == email);
        return membre == null ? null : new Participant(membre.Id, membre.Email);
    }
    // « l'Administrateur » vu par un membre : le premier compte du rôle Admin (par email)
    private async Task<string?> EmailAdmin() =>
        (await _userManager.GetUsersInRoleAsync("Admin")).Select(u => u.Email).Where(e => e != null).OrderBy(e => e).FirstOrDefault();
    private ObjectResult SansFiche() => StatusCode(403, "Compte sans fiche membre");

[HttpGet("conversations")]
    public async Task<ActionResult<PagedResult<ConversationDto>>> Conversations(int page = 1, int pageSize = 10)
    {
        var moi = await MembreConnecte();
        if (moi == null) return SansFiche();
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 50) pageSize = 10;
        // seulement les conversations dont le membre connecté est participant
        return Ok(await _messages.GetConversationsAsync(moi, page, pageSize));
    }

[HttpGet("conversation/{membreId}")]
    public async Task<ActionResult<PagedResult<MessageDto>>> Conversation(int membreId, int page = 1, int pageSize = 20)
    {
        var moi = await MembreConnecte();
        if (moi == null) return SansFiche();
        if (membreId == moi.Id) return BadRequest("Pas de conversation avec soi-même");
        // 0 = l'Administrateur ; sinon une fiche Membre existante
        if (membreId != Participant.AdminId && await _membres.GetByIdAsync(membreId) == null) return NotFound("Membre introuvable");
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 50) pageSize = 20;
        // jamais de lecture hors participants : la requête porte toujours sur le couple (moi, membreId)
        await _messages.MarquerLusAsync(moi, membreId);
        var r = await _messages.GetConversationAsync(moi, membreId, page, pageSize);
        return Ok(new PagedResult<MessageDto>
        {
            Page = r.Page, PageSize = r.PageSize, Total = r.Total,
            Items = r.Items.Select(ToDto).ToList()
        });
    }

[HttpPost]
    public async Task<ActionResult<MessageDto>> Envoyer(EnvoyerMessageDto dto)
    {
        // l'expéditeur vient du token : le client n'envoie que le destinataire et le contenu
        var moi = await MembreConnecte();
        if (moi == null) return SansFiche();
        if (dto.DestinataireId == moi.Id) return BadRequest("Impossible de s'envoyer un message à soi-même");
        var message = new Message
        {
            ExpediteurId = moi.MembreId,   // null pour l'Admin
            Contenu = dto.Contenu.Trim(),
            Expediteur = moi.EstAdmin ? null : await _membres.GetByIdAsync(moi.Id)
        };
        string destinataireEmail;
        if (dto.DestinataireId == Participant.AdminId)
        {
            // membre -> l'Administrateur (un Admin n'écrit pas à un autre Admin : cas refusé ci-dessus)
            var admin = await EmailAdmin();
            if (admin == null) return NotFound("Destinataire introuvable");
            message.AdminEmail = admin;   // DestinataireId reste null
            destinataireEmail = admin;
        }
        else
        {
            var destinataire = await _membres.GetByIdAsync(dto.DestinataireId);
            if (destinataire == null) return NotFound("Destinataire introuvable");
            message.DestinataireId = destinataire.Id;
            message.Destinataire = destinataire;
            if (moi.EstAdmin) message.AdminEmail = moi.Email;   // Admin -> membre
            destinataireEmail = destinataire.Email;
        }
        await _messages.AddAsync(message);
        // notification au destinataire, après l'enregistrement du message (contenu jamais copié ;
        // une erreur de notification n'annule pas l'envoi)
        await _notifications.NouveauMessageAsync(message.Expediteur?.Nom ?? "Administrateur", moi.Id, destinataireEmail);
        return Created($"/api/Messages/conversation/{dto.DestinataireId}", ToDto(message));
    }

[HttpDelete("{id}")]
    public async Task<IActionResult> Supprimer(int id)
    {
        var moi = await MembreConnecte();
        if (moi == null) return SansFiche();
        var message = await _messages.GetByIdAsync(id);
        if (message == null) return NotFound();
        // seulement l'auteur peut supprimer son message (même l'Admin ne supprime pas celui d'un autre)
        var auteur = message.ExpediteurId == moi.MembreId
            && (!moi.EstAdmin || message.AdminEmail == moi.Email);   // Admin : seulement les siens
        if (!auteur) return Forbid();
        await _messages.DeleteAsync(message);
        return NoContent();
    }

[HttpGet("non-lus")]
    public async Task<ActionResult> NonLus()
    {
        var moi = await MembreConnecte();
        if (moi == null) return SansFiche();
        return Ok(new { nonLus = await _messages.CompterNonLusAsync(moi) });
    }

    private static MessageDto ToDto(Message m) => new MessageDto
    {
        Id = m.Id,
        // côté Admin : id 0 et nom « Administrateur »
        ExpediteurId = m.ExpediteurId ?? Participant.AdminId,
        ExpediteurNom = m.ExpediteurId == null ? "Administrateur" : m.Expediteur?.Nom ?? string.Empty,
        DestinataireId = m.DestinataireId ?? Participant.AdminId,
        DestinataireNom = m.DestinataireId == null ? "Administrateur" : m.Destinataire?.Nom ?? string.Empty,
        Contenu = m.Contenu,
        DateEnvoi = m.DateEnvoi,
        Lu = m.Lu
    };
}
