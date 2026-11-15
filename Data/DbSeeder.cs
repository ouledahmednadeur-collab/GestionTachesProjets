using GestionTachesProjets.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using static GestionTachesProjets.Models.StatutTache;
namespace GestionTachesProjets.Data ;
public static class Dbseeder
{
    // ===== comptes de démonstration =====
    private const string AdminEmail = "admin@test.com";
    private const string AdminPassword = "Admin123!";
    private const string SuffixeMotDePasse = "1234!";             // mot de passe d'un membre = Prénom + "1234!"
    private static readonly string[] Roles = { "Admin", "Membre" };
    // présence de ce projet = le jeu de données « sécurité » est déjà en place
    private const string ProjetRepere = "Analyse d'un Trojan RAT";

    // ===== membres : le prénom donne le nom affiché, l'email et le mot de passe =====
    private static readonly string[] Prenoms =
    {
        "Ameni", "Hassen", "Hend", "Linda", "Yessine", "Ismail", "Hilmi", "Ghafran", "Ghada", "Wael",
        "Aziz", "Adel", "Ameur", "Mariem", "Mahdi", "Khadija", "Mokhtar", "Anis", "Oussema", "Nadeur",
        "Sami", "Lina", "Fawzi", "Mohsen", "Karim",
    };
    private static string Email(string prenom) => prenom.ToLowerInvariant() + "@test.com";       // Ameni -> ameni@test.com
    private static string MotDePasse(string prenom) => prenom + SuffixeMotDePasse;               // Ameni -> Ameni1234!

    // ===== projets et tâches (Membre = prénom, null : tâche non assignée) =====
    private static readonly (string Nom, string Description, (string Titre, string Description, StatutTache Statut, string? Membre)[] Taches)[] ProjetsDemo =
    {
        (ProjetRepere, "Étude d'un cheval de Troie d'accès à distance dans un laboratoire de machines virtuelles isolées.", new[]
        {
            ("Architecture client/serveur", "Décrire le fonctionnement client/serveur du RAT et ses modules.", Terminee, (string?)"Ameni"),
            ("Analyse du keylogger", "Observer le keylogger dans une machine virtuelle isolée sans accès réseau externe.", Terminee, "Hassen"),
            ("Règles YARA", "Écrire des règles YARA pour détecter le RAT par signatures.", EnCours, "Yessine"),
            ("Trafic C2 sous Wireshark", "Analyser avec Wireshark le trafic de commande et de contrôle capturé en laboratoire.", EnCours, "Sami"),
            ("Extraction des IoC", "Lister les indicateurs de compromission : hachés, domaines et clés de registre.", AFaire, "Nadeur"),
            ("Rapport d'analyse", "Rédiger le rapport d'analyse avec les recommandations de détection.", AFaire, null),
        }),
        ("Pentest d'une application web", "Test d'intrusion autorisé d'une application web de laboratoire et propositions de correctifs.", new[]
        {
            ("Reconnaissance Nmap", "Cartographier les services exposés avec Nmap et énumérer les répertoires.", Terminee, (string?)"Ismail"),
            ("Test d'injection SQL", "Vérifier si les formulaires sont vulnérables à l'injection SQL.", Terminee, "Hilmi"),
            ("Test XSS", "Rechercher les failles XSS réfléchies et stockées.", Terminee, "Lina"),
            ("Test de l'authentification", "Évaluer la gestion des sessions, le verrouillage et la réinitialisation du mot de passe.", EnCours, "Nadeur"),
            ("Rapport de vulnérabilités", "Classer les failles par gravité et proposer un correctif pour chacune.", AFaire, "Ghafran"),
        }),
        ("Phishing et ingénierie sociale", "Détection des e-mails frauduleux et sensibilisation des utilisateurs.", new[]
        {
            ("Analyse des en-têtes d'e-mail", "Analyser les en-têtes SPF, DKIM et Received d'un e-mail suspect.", Terminee, (string?)"Ghada"),
            ("Campagne de sensibilisation", "Simuler une campagne de sensibilisation dans le laboratoire, avec des comptes fictifs.", Terminee, "Wael"),
            ("Guide de bonnes pratiques", "Rédiger un guide pour reconnaître et signaler un e-mail de phishing.", Terminee, "Fawzi"),
            ("Quiz de sensibilisation", "Créer un quiz de dix questions pour vérifier les acquis.", Terminee, "Hend"),
        }),
        ("Sécurité réseau et IDS", "Protection et surveillance du réseau du laboratoire avec un pare-feu et un IDS.", new[]
        {
            ("Configuration du pare-feu", "Définir les règles de filtrage entrant et sortant du laboratoire.", EnCours, (string?)"Aziz"),
            ("Déploiement de Suricata", "Installer et configurer l'IDS Suricata sur le segment surveillé.", EnCours, "Mohsen"),
            ("Règles de détection", "Écrire des règles de détection adaptées au trafic du laboratoire.", AFaire, "Adel"),
            ("Test de scan de ports", "Lancer un scan de ports contrôlé et vérifier que l'IDS lève une alerte.", AFaire, "Nadeur"),
            ("Rapport réseau", "Synthétiser la configuration et les alertes observées.", AFaire, null),
        }),
        ("Cryptographie et mots de passe", "Bonnes pratiques de hachage, de chiffrement et de stockage des mots de passe.", new[]
        {
            ("Comparaison MD5 / SHA-256 / bcrypt", "Comparer la vitesse et la résistance de ces trois fonctions de hachage.", Terminee, (string?)"Ameur"),
            ("Chiffrement AES d'un fichier", "Chiffrer puis déchiffrer un fichier avec AES-256 et documenter la gestion de la clé.", Terminee, "Mariem"),
            ("Force des mots de passe", "Mesurer l'entropie de mots de passe types et en tirer une politique.", EnCours, "Karim"),
            ("Hachage avec sel", "Mettre en place un hachage salé et vérifier que deux mots de passe identiques donnent des hachés différents.", AFaire, "Mahdi"),
            ("Gestion des clés", "Proposer une méthode de stockage et de rotation des clés de chiffrement.", EnCours, "Linda"),
        }),
        ("Forensique numérique et réponse à incident", "Investigation d'un incident simulé et organisation de la réponse.", new[]
        {
            ("Acquisition d'une image disque", "Créer une copie bit à bit du disque et calculer son empreinte.", Terminee, (string?)"Khadija"),
            ("Analyse des journaux système", "Repérer les connexions et événements suspects dans les journaux.", Terminee, "Mokhtar"),
            ("Chronologie de l'incident", "Reconstituer l'enchaînement des événements de l'incident.", EnCours, "Anis"),
            ("Préservation des preuves", "Documenter la chaîne de custody et l'intégrité des preuves.", EnCours, "Ameni"),
            ("Plan de réponse à incident", "Rédiger les étapes de confinement, d'éradication et de rétablissement.", AFaire, "Oussema"),
        }),
    };

    public static async Task SeedAsync (IServiceProvider services)
    {
        var context = services.GetRequiredService<AppDbContext>() ;
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<IdentityUser>>();
        var log = services.GetRequiredService<ILoggerFactory>().CreateLogger("Dbseeder");
        await context.Database.MigrateAsync();

        // 1. remise à zéro si la base n'est pas la base de présentation :
        //    projet repère absent, ou un membre de la liste sans fiche
        var emails = Prenoms.Select(Email).ToList();
        var aJour = await context.Projets.AnyAsync(p => p.Nom == ProjetRepere)
                 && await context.Membres.CountAsync(m => emails.Contains(m.Email)) == emails.Count;
        if (!aJour)
        {
            await using var tx = await context.Database.BeginTransactionAsync();
            context.Commentaires.RemoveRange(context.Commentaires);
            context.Taches.RemoveRange(context.Taches);
            context.Projets.RemoveRange(context.Projets);
            context.Membres.RemoveRange(context.Membres);
            await context.SaveChangesAsync();
            // comptes : on garde uniquement l'admin (suppression via UserManager, jamais en SQL)
            foreach (var u in await userManager.Users.Where(u => u.Email != AdminEmail).ToListAsync())
                await userManager.DeleteAsync(u);
            // rôles : on garde uniquement Admin et Membre
            foreach (var r in await roleManager.Roles.Where(r => !Roles.Contains(r.Name!)).ToListAsync())
                await roleManager.DeleteAsync(r);

            // nouvelles fiches Membre, projets et tâches
            var membres = Prenoms.ToDictionary(p => p, p => new Membre { Nom = p, Email = Email(p) });
            context.Membres.AddRange(membres.Values);
            foreach (var p in ProjetsDemo)
            {
                var projet = new Projet { Nom = p.Nom, Description = p.Description };
                foreach (var t in p.Taches)
                    projet.Taches.Add(new Tache { Titre = t.Titre, Description = t.Description, Statut = t.Statut,
                                                  Membre = t.Membre == null ? null : membres[t.Membre] });
                context.Projets.Add(projet);
            }
            await context.SaveChangesAsync();
            await tx.CommitAsync();
            log.LogInformation("Base de présentation « sécurité » installée.");
        }

        // 2. rôles (à chaque démarrage, sans doublon)
        foreach (var role in Roles)
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));

        // 3. compte admin : créé s'il manque, rôle Admin garanti, mot de passe jamais modifié
        var admin = await userManager.FindByEmailAsync(AdminEmail);
        if (admin == null)
        {
            admin = new IdentityUser { UserName = AdminEmail, Email = AdminEmail, EmailConfirmed = true };
            if (!(await userManager.CreateAsync(admin, AdminPassword)).Succeeded) admin = null;
        }
        if (admin != null && !await userManager.IsInRoleAsync(admin, "Admin"))
            await userManager.AddToRoleAsync(admin, "Admin");

        // 4. inscription de chaque membre (comme /api/Auth/register) : compte + rôle Membre, s'il manque
        foreach (var prenom in Prenoms)
        {
            var email = Email(prenom);
            if (await userManager.FindByEmailAsync(email) != null) continue;
            var user = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };
            var res = await userManager.CreateAsync(user, MotDePasse(prenom));
            if (res.Succeeded) await userManager.AddToRoleAsync(user, "Membre");
            else log.LogWarning("Compte {Email} non créé : {Erreurs}", email, string.Join(" ", res.Errors.Select(e => e.Description)));
        }
    }
}
