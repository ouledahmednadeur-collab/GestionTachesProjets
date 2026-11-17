using GestionTachesProjets.Data;
using GestionTachesProjets.Models;
using Microsoft.EntityFrameworkCore;
namespace GestionTachesProjets.Repositories;
public class AffectationRoleRepository : IAffectationRoleRepository
{
    private readonly AppDbContext _context;
    public AffectationRoleRepository(AppDbContext context)
    {
        _context = context;
    }
    public async Task<AffectationRole> AddAsync(AffectationRole affectation)
    {
        _context.AffectationsRoles.Add(affectation);
        await _context.SaveChangesAsync();
        return affectation;
    }
    public async Task DeleteAsync(AffectationRole affectation)
    {
        _context.AffectationsRoles.Remove(affectation);
        await _context.SaveChangesAsync();
    }
    public async Task<AffectationRole?> TrouverAsync(int membreId, int projetId, string nomRole) =>
        await _context.AffectationsRoles.FirstOrDefaultAsync(a =>
            a.MembreId == membreId && a.ProjetId == projetId && a.NomRole == nomRole);
    public async Task<bool> ExisteAsync(int membreId, int projetId, string nomRole) =>
        await _context.AffectationsRoles.AnyAsync(a =>
            a.MembreId == membreId && a.ProjetId == projetId && a.NomRole == nomRole);
    public async Task<List<AffectationRole>> GetByMembreAsync(int membreId) =>
        await _context.AffectationsRoles.Include(a => a.Projet).Where(a => a.MembreId == membreId).ToListAsync();
    public async Task<List<AffectationRole>> GetByProjetAsync(int projetId) =>
        await _context.AffectationsRoles.Include(a => a.Membre).Where(a => a.ProjetId == projetId).ToListAsync();
    public async Task<List<AffectationRole>> GetByRoleAsync(string nomRole) =>
        await _context.AffectationsRoles.Include(a => a.Membre).Include(a => a.Projet)
            .Where(a => a.NomRole == nomRole).ToListAsync();
    public async Task<List<AffectationRole>> GetAllAsync() =>
        await _context.AffectationsRoles.Include(a => a.Membre).Include(a => a.Projet).ToListAsync();
}
