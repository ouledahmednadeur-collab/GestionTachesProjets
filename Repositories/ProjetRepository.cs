using GestionTachesProjets.Data;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using Microsoft.EntityFrameworkCore;
namespace GestionTachesProjets.Repositories;
public class ProjetRepository : IProjetRepository
{
    private readonly AppDbContext _context ;
    public ProjetRepository(AppDbContext context)
    {
        _context= context ;
    }
    public async Task<PagedResult<Projet>> GetAllAsync( int page , int pageSize)
    {
        var total = await _context.Projets.CountAsync();
        var items = await _context.Projets
        .OrderBy(p=>p.Id)
        .Skip((page-1)*pageSize)
        .Take(pageSize)
        .ToListAsync();
        return new PagedResult<Projet>
        {
            Page=page ,
            PageSize=pageSize ,
            Total=total ,
            Items=items
        };
    }
    public async Task<Projet?> GetByIdAsync(int id)
    {
        return await _context.Projets.FindAsync(id);
    }
    public async Task<Projet> AddAsync(Projet projet)
    {
        _context.Projets.Add(projet);
        await _context.SaveChangesAsync();
        return projet ;
    }
    public async Task UpdateAsync(Projet projet)
    {
        _context.Projets.Update(projet);
        await _context.SaveChangesAsync();
    }
    public async Task DeleteAsync(Projet projet)
    {
        _context.Projets.Remove(projet);
        await _context.SaveChangesAsync();
    }
}