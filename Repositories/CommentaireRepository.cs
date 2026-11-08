using GestionTachesProjets.Data;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using Microsoft.EntityFrameworkCore;
using GestionTachesProjets.Repositories;
namespace GestionTachesProjets.Repositories;
public class CommentaireRepository : ICommentaireRepository
{
    private readonly AppDbContext _context;
    public CommentaireRepository(AppDbContext context)
    {
        _context=context;
    }
    public async Task<PagedResult<Commentaire>> GetByTacheAsync(int tacheId , int page , int pageSize)
    {
    var query=  _context.Commentaires.Where(c => c.TacheId == tacheId);
    var total = await query.CountAsync();
    var items= await query
    .OrderBy(c=> c.DateCreation)
    .Skip((page-1)*pageSize)
    .Take(pageSize)
    .ToListAsync();
    return new PagedResult<Commentaire>
    {
        Page=page,
        PageSize=pageSize,
        Total=total,
        Items=items
    };
    } 
    public async Task<Commentaire?> GetByIdAsync(int id)
    {
        return await _context.Commentaires.FindAsync(id);
    }
    public async Task<Commentaire> AddAsync(Commentaire commentaire)
    {
        _context.Commentaires.Add(commentaire);
        await _context.SaveChangesAsync();
        return commentaire ;
    }
    public async Task DeleteAsync(Commentaire commentaire)
    {
        _context.Commentaires.Remove(commentaire);
        await _context.SaveChangesAsync();
    }

}