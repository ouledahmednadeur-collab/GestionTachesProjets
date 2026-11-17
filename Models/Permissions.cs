namespace GestionTachesProjets.Models;
// Catalogue FIXE des privilèges délégables à un rôle. Un privilège = une claim de rôle
// (table AspNetRoleClaims d'Identity) de type « permission » : aucune nouvelle table.
// Jamais délégable (toujours réservé au rôle Admin, aucun privilège ne le couvre) : supprimer
// un membre, supprimer un projet ou une tâche, créer ou modifier un projet, gérer les rôles.
public static class Permissions
{
    public const string Type = "permission";
    public const string TachesAffecter = "taches.affecter";
    public const string TachesCreer = "taches.creer";
    public const string TachesStatut = "taches.statut";
    public const string CommentairesModerer = "commentaires.moderer";

    public record Privilege(string Cle, string Libelle, string Description);

    public static readonly IReadOnlyList<Privilege> Catalogue = new[]
    {
        new Privilege(TachesAffecter, "Affecter les tâches", "Affecter une tâche de ses projets à un membre de ce projet."),
        new Privilege(TachesCreer, "Créer des tâches", "Créer des tâches dans ses projets."),
        new Privilege(TachesStatut, "Changer les statuts", "Changer le statut de n'importe quelle tâche de ses projets."),
        new Privilege(CommentairesModerer, "Modérer les commentaires", "Supprimer les commentaires des tâches de ses projets."),
    };

    public static bool Existe(string cle) => Catalogue.Any(p => p.Cle == cle);
}
