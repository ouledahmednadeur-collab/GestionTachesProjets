using GestionTachesProjets.Data;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using Microsoft.EntityFrameworkCore;
namespace GestionTachesProjets.Repositories;
public class MembreRepository : IMembreRepository 
{
    private readonly AppDbContext _context ;
    public MembreRepository(AppDbContext context)
    {
        _context=context;
    }
    public async Task<PagedResult<Membre>> GetAllAsync(int page , int pageSize)
    {
        var total = await _context.Membres.CountAsync();
        var items = await _context.Membres 
        .OrderBy(p=>p.Id)
        .Skip((page-1)*pageSize)
        .Take(pageSize)
        .ToListAsync();
        return new PagedResult<Membre>
        {
            Page=page,
            PageSize=pageSize ,
            Total=total ,
            Items=items 
        };
    }
    public async Task<Membre?> GetByIdAsync(int id)
    {
        return await _context.Membres.FindAsync(id);
    }
    public async Task<Membre> AddAsync(Membre membre)
    {
         _context.Membres.Add(membre);
         await _context.SaveChangesAsync();
         return membre ;
    }
    public async Task<Membre> UpdateAsync(Membre membre)
    {
        await _context.SaveChangesAsync();
        return membre ;
    }
    public async Task DeleteAsync(Membre membre)
    {
        _context.Membres.Remove(membre);
        await _context.SaveChangesAsync();
    }
}