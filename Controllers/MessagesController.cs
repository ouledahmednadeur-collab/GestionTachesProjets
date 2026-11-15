using GestionTachesProjets.Data;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
namespace GestionTachesProjets.Controllers;
// Messagerie privée entre membres.
// Confidentialité : aucune route ne lit les messages d'autres personnes, pas même pour l'Admin
// (l'Admin n'a aucun droit particulier ici) ; aucune route ne renvoie une liste globale.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageRepository _messages;
    private readonly IMembreRepository _membres;
    private readonly AppDbContext _context;
    public MessagesController(IMessageRepository messages, IMembreRepository membres, AppDbContext context)
    {
        _messages = messages;
        _membres = membres;
        _context = context;
    }

    // Membre connecté : son identité vient TOUJOURS du token (email), jamais du client.
    private async Task<Membre?> MembreConnecte()
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;
        return await _context.Membres.FirstOrDefaultAsync(m => m.Email == email);
    }
    private ObjectResult SansFiche() => StatusCode(403, "Compte sans fiche membre");

[HttpGet("conversations")]
    public async Task<ActionResult<PagedResult<ConversationDto>>> Conversations(int page = 1, int pageSize = 10)
    {
        var moi = await MembreConnecte();
        if (moi == null) return SansFiche();
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 50) pageSize = 10;
        // seulement les conversations dont le membre connecté est participant
        return Ok(await _messages.GetConversationsAsync(moi.Id, page, pageSize));
    }

[HttpGet("conversation/{membreId}")]
    public async Task<ActionResult<PagedResult<MessageDto>>> Conversation(int membreId, int page = 1, int pageSize = 20)
    {
        var moi = await MembreConnecte();
        if (moi == null) return SansFiche();
        if (await _membres.GetByIdAsync(membreId) == null) return NotFound("Membre introuvable");
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 50) pageSize = 20;
        // jamais de lecture hors participants : la requête porte toujours sur le couple (moi, membreId)
        await _messages.MarquerLusAsync(moi.Id, membreId);
        var r = await _messages.GetConversationAsync(moi.Id, membreId, page, pageSize);
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
        var destinataire = await _membres.GetByIdAsync(dto.DestinataireId);
        if (destinataire == null) return NotFound("Destinataire introuvable");
        var message = new Message
        {
            ExpediteurId = moi.Id,
            DestinataireId = destinataire.Id,
            Contenu = dto.Contenu.Trim(),
            Expediteur = moi,
            Destinataire = destinataire
        };
        await _messages.AddAsync(message);
        return Created($"/api/Messages/conversation/{destinataire.Id}", ToDto(message));
    }

[HttpDelete("{id}")]
    public async Task<IActionResult> Supprimer(int id)
    {
        var moi = await MembreConnecte();
        if (moi == null) return SansFiche();
        var message = await _messages.GetByIdAsync(id);
        if (message == null) return NotFound();
        // seulement l'auteur peut supprimer son message (même l'Admin ne supprime pas celui d'un autre)
        if (message.ExpediteurId != moi.Id) return Forbid();
        await _messages.DeleteAsync(message);
        return NoContent();
    }

[HttpGet("non-lus")]
    public async Task<ActionResult> NonLus()
    {
        var moi = await MembreConnecte();
        if (moi == null) return SansFiche();
        return Ok(new { nonLus = await _messages.CompterNonLusAsync(moi.Id) });
    }

    private static MessageDto ToDto(Message m) => new MessageDto
    {
        Id = m.Id,
        ExpediteurId = m.ExpediteurId,
        ExpediteurNom = m.Expediteur?.Nom ?? string.Empty,
        DestinataireId = m.DestinataireId,
        DestinataireNom = m.Destinataire?.Nom ?? string.Empty,
        Contenu = m.Contenu,
        DateEnvoi = m.DateEnvoi,
        Lu = m.Lu
    };
}
