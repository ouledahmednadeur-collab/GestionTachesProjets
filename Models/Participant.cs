namespace GestionTachesProjets.Models;
// Participant à la messagerie, lu dans le token : un membre (sa fiche Membre) ou un Admin (compte
// sans fiche, identifié par son email). Dans l'API, l'Admin a l'identifiant 0 (« Administrateur »).
public record Participant(int? MembreId, string Email)
{
    public const int AdminId = 0;
    public bool EstAdmin => MembreId == null;
    public int Id => MembreId ?? AdminId;
}
