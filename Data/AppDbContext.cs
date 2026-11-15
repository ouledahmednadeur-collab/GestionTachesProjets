using GestionTachesProjets.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore ;
using Microsoft.EntityFrameworkCore ;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
namespace GestionTachesProjets.Data ; 
public class AppDbContext : IdentityDbContext<IdentityUser>
/// classe IdentityDbContext t'heriti men DbContext w hia classe generique heka aaleh najmou n&ottou fiha 
///IdentityUser elli fiha les tables 7adhrin
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
    /// <summary>
    /// hedha constructeur mte3 el classe AppDbcontext 
    /// </summary>

public DbSet<Projet> Projets => Set<Projet>();
/// <summary>
/// houni nestaamlou fi type generique mel classe DbContext bech kol ma
/// nest7a9ou _context.Projets tekhdem
/// </summary>
public DbSet<Membre> Membres => Set<Membre>();
public DbSet<Tache> Taches =>Set<Tache>();
protected override void OnModelCreating(ModelBuilder builder)
/// el classe IdentityDbContext 3andha methode esemha OnModelCreating ki nektbou override nmodifiw
/// el methode heki 
    {
        base.OnModelCreating(builder); // t3ayet lel classe parent base bech t3ayet lel methode 
                                       // OnModelCreating bech testa3mel el objet builder elli ykhallik
                                       // tnajem taamel configuration lel base de donnees 

        // ki nefskhou membre les taches mte3ou yo93dou amma ywalliw mahomch affecte 
        builder.Entity<Tache>() //Prends la table Tache pour la configurer
        .HasOne(t=>t.Membre) //Chaque tâche est associée à un seul membre
        .WithMany() //un membre peut avoir plusieurs tâches (relation 1-à-plusieurs)
        .HasForeignKey(t=>t.MembreId)//La colonne qui fait la liaison dans la table Tache est MembreId (la clé étrangère)
        .OnDelete(DeleteBehavior.SetNull);// comportement en cascade , ke tefsakh membre el id mte3ou twalli nul w les taches yo93dou
        // ma najmouch nefskhou membre deja keteb commentaire 
        builder.Entity<Tache>()
        .HasOne(c=>c.Membre)
        .WithMany()
        .HasForeignKey(c=>c.MembreId)
        .OnDelete(DeleteBehavior.Restrict);

        // messages privés : expéditeur et destinataire sont des membres ; on ne peut pas
        // supprimer un membre qui a des messages (Restrict, comme les autres relations)
        builder.Entity<Message>()
        .HasOne(m=>m.Expediteur)
        .WithMany()
        .HasForeignKey(m=>m.ExpediteurId)
        .OnDelete(DeleteBehavior.Restrict);
        builder.Entity<Message>()
        .HasOne(m=>m.Destinataire)
        .WithMany()
        .HasForeignKey(m=>m.DestinataireId)
        .OnDelete(DeleteBehavior.Restrict);
        // index pour lire vite une conversation dans l'ordre des dates
        builder.Entity<Message>()
        .HasIndex(m=>new { m.ExpediteurId, m.DestinataireId, m.DateEnvoi });
    }
public DbSet<Commentaire> Commentaires=> Set<Commentaire>();
public DbSet<Message> Messages => Set<Message>();
}


