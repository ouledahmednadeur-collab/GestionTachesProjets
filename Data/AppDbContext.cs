using GestionTachesProjets.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore ;
using Microsoft.EntityFrameworkCore ;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
namespace GestionTachesProjets.Data ; 
public class AppDbContext : IdentityDbContext<IdentityUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
public DbSet<Projet> Projets => Set<Projet>();
public DbSet<Membre> membres => Set<Membre>();
public DbSet<Tache> Taches =>Set<Tache>();
protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        // ki nefskhou membre les tahces mte3ou yo93dou amma ywalliw mahomch affecte 
        builder.Entity<Tache>()
        .HasOne(t=>t.Membre)
        .WithMany()
        .HasForeignKey(t=>t.MembreId)
        .OnDelete(DeleteBehavior.SetNull);
        // ma najmouch nefskhou membre deja keteb commentaire 
        builder.Entity<Tache>()
        .HasOne(c=>c.Membre)
        .WithMany()
        .HasForeignKey(c=>c.MembreId)
        .OnDelete(DeleteBehavior.Restrict);
    }
}


