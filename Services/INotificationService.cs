using GestionTachesProjets.Models;
namespace GestionTachesProjets.Services;
// création des notifications côté serveur (jamais par le client)
public interface INotificationService
{
    // nom affiché de la personne qui agit (email lu dans le token) : nom de sa fiche Membre,
    // sinon « Administrateur » pour un Admin, sinon la partie de l'email avant le @
    Task<string> NomAuteurAsync(string? email, bool estAdmin);
    // nouveau message : une notification pour le destinataire
    // expéditeur : son nom (« Administrateur » pour l'Admin) et son id (0 pour l'Admin) ;
    // destinataire : son email (membre ou Admin, les notifications sont rangées par email)
    Task NouveauMessageAsync(string expediteurNom, int expediteurId, string destinataireEmail);
    // statut de tâche réellement changé : membres du projet + admins, sauf l'auteur du changement
    Task StatutTacheAsync(Tache tache, StatutTache ancien, string? auteurEmail, string auteurNom);
    // tâche ajoutée : membres du projet (pas les admins), sauf l'auteur de la création
    Task TacheAjouteeAsync(Tache tache, string? auteurEmail, string auteurNom);
    // tâche affectée : le membre affecté, sauf s'il est lui-même l'auteur
    Task TacheAffecteeAsync(Tache tache, string? auteurEmail, string auteurNom);
}
