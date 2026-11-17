using GestionTachesProjets.Data;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
namespace GestionTachesProjets.Services;
// Construit et enregistre les notifications. Appelé APRÈS la réussite de l'action principale :
// une erreur ici est journalisée mais ne fait jamais échouer l'envoi du message, le changement
// de statut, la création ou l'affectation d'une tâche (aucune exception ne remonte au contrôleur).
public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notifications;
    private readonly AppDbContext _context;                  // lecture seule : membres et projet
    private readonly UserManager<IdentityUser> _userManager;  // emails des comptes Admin
    private readonly ILogger<NotificationService> _log;
    public NotificationService(INotificationRepository notifications, AppDbContext context,
                               UserManager<IdentityUser> userManager, ILogger<NotificationService> log)
    {
        _notifications = notifications;
        _context = context;
        _userManager = userManager;
        _log = log;
    }

    private const int Max = 200;   // longueur maximale du champ Texte
    private static readonly Dictionary<StatutTache, string> Libelles = new()
    {
        [StatutTache.AFaire] = "À faire", [StatutTache.EnCours] = "En cours", [StatutTache.Terminee] = "Terminée"
    };
    // emails comparés et enregistrés en minuscules
    private static string Norm(string? email) => (email ?? string.Empty).Trim().ToLowerInvariant();
    private static string Couper(string texte) => texte.Length <= Max ? texte : texte[..(Max - 1)] + "…";
    // texte construit autour d'un titre : si trop long, c'est le titre qui est raccourci (avec « … »)
    private static string AvecTitre(string titre, Func<string, string> modele)
    {
        var texte = modele(titre);
        if (texte.Length <= Max) return texte;
        var place = Math.Max(1, titre.Length - (texte.Length - Max) - 1);
        return Couper(modele(titre[..place] + "…"));
    }

    // nom de la personne qui agit : identité lue dans le token (email), jamais envoyée par le client
    // (ne lève jamais d'exception : appelé après l'action principale déjà enregistrée)
    public async Task<string> NomAuteurAsync(string? email, bool estAdmin)
    {
        var e = Norm(email);
        try
        {
            var membre = await _context.Membres.FirstOrDefaultAsync(m => m.Email.ToLower() == e);
            if (membre != null) return membre.Nom;
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Nom de l'auteur introuvable");
        }
        if (estAdmin) return "Administrateur";
        return e.Contains('@') ? e[..e.IndexOf('@')] : e;
    }

    private async Task<string> NomProjet(int projetId) =>
        (await _context.Projets.FindAsync(projetId))?.Nom ?? "Projet " + projetId;

    // emails des membres ayant au moins une tâche affectée dans le projet
    private async Task<List<string>> MembresDuProjet(int projetId) =>
        await _context.Taches
            .Where(t => t.ProjetId == projetId && t.MembreId != null)
            .Select(t => t.Membre!.Email)
            .Distinct()
            .ToListAsync();

    // sans doublon, et pas de notification à soi-même (auteur lu dans le token)
    private static List<string> SansAuteur(IEnumerable<string?> emails, string? auteurEmail)
    {
        var auteur = Norm(auteurEmail);
        return emails.Select(Norm).Where(e => e != string.Empty && e != auteur).Distinct().ToList();
    }

    public async Task NouveauMessageAsync(string expediteurNom, int expediteurId, string destinataireEmail)
    {
        try
        {
            // contenu du message JAMAIS copié : seulement le nom de l'expéditeur
            await _notifications.AddRangeAsync(new[] { new Notification
            {
                DestinataireEmail = Norm(destinataireEmail),
                Type = TypeNotification.NouveauMessage,
                Texte = Couper($"Nouveau message de {expediteurNom}"),
                ExpediteurMembreId = expediteurId   // 0 = l'Administrateur (ouvre sa conversation)
            }});
        }
        catch (Exception e)
        {
            _log.LogError(e, "Notification de nouveau message non créée");
        }
    }

    public async Task StatutTacheAsync(Tache tache, StatutTache ancien, string? auteurEmail, string auteurNom)
    {
        try
        {
            // seulement si le statut a réellement changé
            if (ancien == tache.Statut) return;
            // destinataires : membres du projet + tous les comptes Admin, sauf l'auteur, sans doublon
            var admins = (await _userManager.GetUsersInRoleAsync("Admin")).Select(u => u.Email);
            var emails = SansAuteur((await MembresDuProjet(tache.ProjetId)).Concat(admins), auteurEmail);
            if (emails.Count == 0) return;

            var projet = await NomProjet(tache.ProjetId);
            var texte = AvecTitre(tache.Titre, t =>
                $"{auteurNom} a changé le statut de « {t} » ({projet}) : {Libelles[ancien]} → {Libelles[tache.Statut]}");
            await _notifications.AddRangeAsync(emails.Select(e => new Notification
            {
                DestinataireEmail = e, Type = TypeNotification.StatutTache, Texte = texte, TacheId = tache.Id
            }));
        }
        catch (Exception e)
        {
            _log.LogError(e, "Notifications de changement de statut non créées (tâche {TacheId})", tache.Id);
        }
    }

    public async Task TacheAjouteeAsync(Tache tache, string? auteurEmail, string auteurNom)
    {
        try
        {
            // destinataires : membres du projet seulement (pas les admins), sauf l'auteur, sans doublon
            var admins = (await _userManager.GetUsersInRoleAsync("Admin")).Select(u => Norm(u.Email)).ToHashSet();
            var emails = SansAuteur(await MembresDuProjet(tache.ProjetId), auteurEmail)
                .Where(e => !admins.Contains(e)).ToList();
            if (emails.Count == 0) return;

            var projet = await NomProjet(tache.ProjetId);
            var texte = AvecTitre(tache.Titre, t => $"{auteurNom} a ajouté la tâche « {t} » au projet {projet}");
            await _notifications.AddRangeAsync(emails.Select(e => new Notification
            {
                DestinataireEmail = e, Type = TypeNotification.TacheAjoutee, Texte = texte, TacheId = tache.Id
            }));
        }
        catch (Exception e)
        {
            _log.LogError(e, "Notifications de tâche ajoutée non créées (tâche {TacheId})", tache.Id);
        }
    }

    public async Task TacheAffecteeAsync(Tache tache, string? auteurEmail, string auteurNom)
    {
        try
        {
            if (tache.MembreId == null) return;
            var membre = await _context.Membres.FindAsync(tache.MembreId.Value);
            // le membre affecté, même admin s'il a une fiche ; jamais l'auteur de l'affectation
            var emails = SansAuteur(new[] { membre?.Email }, auteurEmail);
            if (emails.Count == 0) return;

            var projet = await NomProjet(tache.ProjetId);
            var texte = AvecTitre(tache.Titre, t => $"{auteurNom} vous a affecté la tâche « {t} » ({projet})");
            await _notifications.AddRangeAsync(emails.Select(e => new Notification
            {
                DestinataireEmail = e, Type = TypeNotification.TacheAjoutee, Texte = texte, TacheId = tache.Id
            }));
        }
        catch (Exception e)
        {
            _log.LogError(e, "Notification d'affectation non créée (tâche {TacheId})", tache.Id);
        }
    }
}
