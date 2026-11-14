using System.Numerics;
using GestionTachesProjets.Data ;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SQLitePCL;
namespace GestionTachesProjets.Repositories ;
public class TacheRepository : ITacheRepository
{
    private readonly AppDbContext _context ;
    public TacheRepository (AppDbContext context)
    {
        _context= context ;
    }
    public async Task<PagedResult<Tache>> GetByProjetAsync ( int projetId , StatutTache? statut , int page , int pageSize )
    {
        var query = _context.Taches.Where(t =>t.ProjetId == projetId);
        if (statut.HasValue)
        {
            query = query.Where(t=>t.Statut ==statut.Value );
        }
        return await PaginerAsync(query,page,pageSize);
        // pagination fi methode okhra mouc houni 
    }
    public async Task<PagedResult<Tache>> GetByMembreAsync(int membreId ,int page, int pageSize)
    {
        var query  = _context.Taches.Where(t=>t.MembreId==membreId);
        return await PaginerAsync(query,page,pageSize);
        // hedhi el pagination bech tsir fi methode okhra Paginer kima elli 9balha 
        // pour ne pas duppliquer le code
    }
    public async Task<Tache?> GetByIdAsync(int id)
    { 
        return await _context.Taches.FindAsync(id);
    }
    public async Task<Tache> AddAsync(Tache tache)
    {
        _context.Taches.Add(tache) ;
        await _context.SaveChangesAsync();
        return tache ; 
    }
    public async Task UpdateAsync(Tache tache)
    {
        _context.Taches.Update(tache);
        await _context.SaveChangesAsync();
    }
    public async Task DeleteAsync(Tache tache)
    {
        _context.Taches.Remove(tache);
        await _context.SaveChangesAsync();

    }
    public async Task<double> GetAvancementAsync(int projetId)
    {
        var total= await _context.Taches.CountAsync(t=>t.ProjetId==projetId );
        if (total ==0)
        {
            return 0 ;
        }
        var terminee = await _context.Taches.CountAsync(t=> t.ProjetId == projetId && t.Statut == StatutTache.Terminee);
        return Math.Round(terminee * 100.0 / total,1);
        // houni bech tehseb les taches f projet  statut mte3hom terminee donc jointure mabin 
        // projet w tache w countAsync() 
        // benesba el Math.Round mawjouda fi bibliotheque de classe de base de .NET (BCL)
        // el bibliotheque hedhi yet3aytelha en arriere plan ki yetkteb
        //  <ImlicitUsings>enable</ImplicitUsings> fi .csproj 
        // w yetsna3 fel dossier lmadfoun obj fichier fih des appel okhrin yetlansew 
        // fi ay fichier tesn3ou fel projet bech direct testaamelhom meghir ma soutek
        // ybe7 wenti t3ayet hahaha fekra 
    }
    private static async Task<PagedResult<Tache>> PaginerAsync(IQueryable<Tache> query ,int page , int PageSize)
    // marhbe bik houni methode privee ma3andhech interface testa3melha ken el classe hedhi
    // houni PaginerAsync t3aytelha el methode GetbyMembreId w GetByProjetId 
    // houni bech ma naamlouch pagination dupplique fard fichier khater les mem lignes de code
    // bech yet3awdou benesba lel hkeya hedhi tnajem tir aala el kol il suffit naamlou class n3aytoulha 
    {
        var total = await query.CountAsync();
        var items = await query .OrderBy(t=> t.Id)
                                .Skip((page -1)*PageSize)
                                .Take(PageSize)
                                .ToListAsync();
        return new PagedResult<Tache>
        {
            Page=page,
            PageSize = PageSize,
            Total=total,
            Items=items 
        };
    }
}