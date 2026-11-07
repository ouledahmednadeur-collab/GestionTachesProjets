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
            query = query.Where(t=>t.statut ==statut.Value );
        }
        return await PaginerAsync(query,page,pageSize);
    }
    public async Task<PagedResult<Tache>> GetByMembreAsync(int membreId ,int page, int pageSize)
    {
        var query  = _context.Taches.Where(t=>t.MembreId==membreId);
        return await PaginerAsync(query,page,pageSize);
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
        var total= await _context.Taches.CountAsync(t=>t.ProjetId==projetId && t.statut ==StatutTache.Terminee);
        if (total ==0)
        {
            return 0 ;
        }
        var terminee = await _context.Taches.CountAsync(t=> t.ProjetId == projetId && t.statut == StatutTache.Terminee);
        return Math.Round(terminee * 100.0 / total,1);
    }
    private static async Task<PagedResult<Tache>> PaginerAsync(IQueryable<Tache> query ,int page , int PageSize)
    
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