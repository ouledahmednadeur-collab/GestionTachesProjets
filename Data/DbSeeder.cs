using GestionTachesProjets.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
namespace GestionTachesProjets.Data ;
public static class Dbseeder
{
    public static async Task SeedAsync (IServiceProvider services)
    {
        var context = services.GetRequiredService<AppDbContext>() ;
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<IdentityUser>>();
        await context.Database.MigrateAsync();
        foreach (var role in new[] {"Admin","Membre"})
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }
    var adminEmail ="admin@test.com" ;
    if(await userManager.FindByEmailAsync(adminEmail) == null) 
    {
        var admin = new IdentityUser{UserName =adminEmail ,Email=adminEmail};
        var result = await userManager.CreateAsync(admin , "Admin123!");
        if (result.Succeeded)
                 {
                  await userManager.AddToRoleAsync(admin , "Admin");
                 }
    }
    if (!await context.Projets.AnyAsync())
    {   var p1 = new Projet {Nom ="Site web" , Description="Refonte du site"};
        var p2 = new Projet {Nom ="Application mobile", Description = "Premiere Version"};
        var m1 = new Membre {Nom="Sami" ,Email="sami@test.com"};
        var m2 = new Membre {Nom="Lina", Email="lina@test.com"};
        context.Projets.AddRange(p1,p2);
        context.Membres.AddRange(m1,m2);
        context.Taches.AddRange(
                                new Tache { Titre ="Maquette",Projet =p1 ,Membre=m1,statut =StatutTache.Terminee},
                                new Tache { Titre="Integration", Projet=p1 , Membre=m2 ,statut=StatutTache.EnCours},
                                new Tache {Titre= "Tests" , Projet=p1},
                                new Tache {Titre = "Cahier des charges",Projet=p2 ,Membre=m1});
                                await context.SaveChangesAsync();
                      }
    }
}

