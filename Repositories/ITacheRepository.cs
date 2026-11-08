using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
namespace GestionTachesProjets.Repositories ;
public interface ITacheRepository
{
    Task<PagedResult<Tache>> GetByProjetAsync (int projetId,StatutTache? statut , int page ,int pageSize);
    /// <summary>
    /// houni lezem tefhem elli Task kima el methode w dima marbouta b await 
    /// await testanna el methode GetByProjetAsync lin tkammel el Task bech 
    /// menba3ad traja3 el resultat mte3 el task hedhi nemchiw leb3id choiya 
    /// meghir ma Tekteb await el methode GetProjetAsync etraja3lek el Task kemla 
    /// mouch elli l9atou el Task heki n7ebek feye9 weld okhti :3 
    /// </summary>
    /// PagesResult : fi DTOs aamelna el classe personnalisee PagedResult elli hia classe
    /// bech etaba3na , w hawki est7a9ineha fi pagination hedhi 
    /// 
    
    Task<PagedResult<Tache>> GetByMembreAsync ( int membreId,int page , int pageSize);

    Task<Tache?> GetByIdAsync(int id);
    Task<Tache> AddAsync(Tache tache);
    Task UpdateAsync(Tache tache);
    Task DeleteAsync(Tache tache);
    Task<double> GetAvancementAsync(int projetId);
}