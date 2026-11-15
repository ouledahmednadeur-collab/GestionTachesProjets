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

    // ===== rôles =====
    // Admin et Membre : rôles d'accès. Les rôles métier ne servent qu'à l'affichage :
    // aucun [Authorize(Roles = ...)] ne les utilise (seul « Admin » donne des droits en plus).
    private static readonly string[] RolesMetier =
        { "Ingénieur sécurité", "Pentester", "Analyste SOC", "Analyste malware", "Ingénieur réseau", "Responsable projet" };
    private static readonly string[] Roles = new[] { "Admin", "Membre" }.Concat(RolesMetier).ToArray();

    // présence de ce projet = la version actuelle du jeu de données est déjà en place
    // (version précédente repérée par « Analyse d'un Trojan RAT » : remplacée une fois au démarrage)
    private const string ProjetRepere = "CTF interne du laboratoire";

    // ===== membres : le prénom donne le nom affiché, l'email, le mot de passe ; + un rôle métier =====
    private static readonly (string Prenom, string Metier)[] MembresDemo =
    {
        ("Ameni", "Ingénieur sécurité"), ("Hassen", "Analyste malware"), ("Hend", "Responsable projet"),
        ("Linda", "Ingénieur sécurité"), ("Yessine", "Analyste malware"), ("Ismail", "Pentester"),
        ("Hilmi", "Pentester"), ("Ghafran", "Pentester"), ("Ghada", "Responsable projet"),
        ("Wael", "Responsable projet"), ("Aziz", "Ingénieur réseau"), ("Adel", "Analyste SOC"),
        ("Ameur", "Ingénieur sécurité"), ("Mariem", "Ingénieur sécurité"), ("Mahdi", "Analyste SOC"),
        ("Khadija", "Analyste malware"), ("Mokhtar", "Analyste malware"), ("Anis", "Ingénieur réseau"),
        ("Oussema", "Responsable projet"), ("Nadeur", "Pentester"), ("Sami", "Analyste SOC"),
        ("Lina", "Pentester"), ("Fawzi", "Ingénieur réseau"), ("Mohsen", "Analyste SOC"),
        ("Karim", "Ingénieur sécurité"),
    };
    private static string Email(string prenom) => prenom.ToLowerInvariant() + "@test.com";       // Ameni -> ameni@test.com
    private static string MotDePasse(string prenom) => prenom + SuffixeMotDePasse;               // Ameni -> Ameni1234!

    // ===== projets, tâches et commentaires =====
    // Contenu volontairement non opérationnel : objectifs, constats et recommandations,
    // toujours en laboratoire, avec machines et comptes fictifs.
    private sealed record TacheDemo(string Titre, string Description, StatutTache Statut, string? Membre,
                                    (string Auteur, string Texte)[] Commentaires);
    private sealed record ProjetDemo(string Nom, string Description, TacheDemo[] Taches);

    // T(titre, description, statut, membre affecté ou null, puis commentaires (auteur, texte) dans l'ordre)
    private static TacheDemo T(string titre, string description, StatutTache statut, string? membre,
                               params (string, string)[] commentaires)
        => new(titre, description, statut, membre, commentaires);

    private static readonly ProjetDemo[] ProjetsDemo =
    {
        new("Analyse d'un Trojan RAT",
            "Étude d'un cheval de Troie d'accès à distance dans un laboratoire de machines virtuelles isolées, orientée détection.", new[]
        {
            T("Préparation du laboratoire isolé", "Préparer les machines virtuelles du laboratoire, sans accès réseau externe, avec des instantanés de restauration.", Terminee, "Yessine",
                ("Yessine", "Laboratoire prêt, instantanés créés avant chaque exécution."),
                ("Ghada", "Merci, je valide l'isolement réseau.")),
            T("Architecture client/serveur", "Décrire le fonctionnement client/serveur du RAT et ses modules à partir des observations en laboratoire.", Terminee, "Hassen",
                ("Hassen", "Schéma des modules ajouté au rapport."),
                ("Ghada", "Clair et complet, rien à ajouter.")),
            T("Analyse du keylogger", "Observer le module keylogger dans une machine virtuelle isolée et documenter les traces laissées.", Terminee, "Khadija",
                ("Khadija", "Traces documentées : fichiers temporaires et clé de démarrage."),
                ("Hassen", "Je les reprends dans la liste des IoC.")),
            T("Trafic de commande et de contrôle", "Caractériser les échanges capturés en laboratoire avec le serveur fictif.", Terminee, "Sami",
                ("Sami", "Échanges caractérisés, une connexion toutes les 60 secondes."),
                ("Ghada", "Utile pour la détection, merci.")),
            T("Règles YARA", "Écrire des règles YARA de détection à partir des caractéristiques observées.", EnCours, "Yessine",
                ("Yessine", "Première version des règles en test sur le corpus du laboratoire."),
                ("Sami", "Deux faux positifs sur des outils légitimes, à affiner."),
                ("Yessine", "Bien noté, je resserre les conditions.")),
            T("Extraction des IoC", "Lister les indicateurs de compromission observés (empreintes, clés de registre, noms de fichiers) pour la détection.", AFaire, "Mokhtar"),
            T("Rapport d'analyse", "Rédiger le rapport final avec les recommandations de détection et de remédiation.", AFaire, null),
        }),
        new("Pentest d'une application web",
            "Test d'intrusion autorisé d'une application web fictive du laboratoire, avec des comptes de test, et propositions de correctifs.", new[]
        {
            T("Cadrage et autorisation", "Définir le périmètre du test sur l'application fictive et faire valider l'autorisation écrite.", Terminee, "Wael",
                ("Wael", "Périmètre validé : application de test uniquement, comptes fictifs fournis.")),
            T("Reconnaissance", "Cartographier les services exposés de l'application de test et documenter les pages accessibles.", Terminee, "Ismail",
                ("Ismail", "Reconnaissance terminée, rapport déposé."),
                ("Wael", "Merci, on passe aux tests applicatifs.")),
            T("Tests d'injection", "Vérifier que les formulaires valident correctement les entrées et résistent aux injections SQL.", Terminee, "Hilmi",
                ("Hilmi", "Un formulaire de recherche ne filtre pas les entrées, détail dans le rapport."),
                ("Karim", "Correctif proposé : requêtes paramétrées."),
                ("Hilmi", "Retesté après correctif : la faille n'est plus présente.")),
            T("Tests XSS", "Rechercher les failles XSS réfléchies et stockées sur les pages de l'application de test.", Terminee, "Lina",
                ("Lina", "Une faille stockée trouvée dans les commentaires de l'application de test."),
                ("Karim", "Correctif : encodage des sorties, à retester."),
                ("Lina", "Retest effectué, la faille est corrigée.")),
            T("Contrôle d'accès", "Vérifier qu'un compte fictif standard ne peut pas accéder aux fonctions d'administration.", Terminee, "Ghafran",
                ("Ghafran", "Une page d'administration était accessible sans rôle, signalée."),
                ("Wael", "Priorité haute, correctif demandé à l'équipe de développement.")),
            T("Gestion des sessions", "Évaluer l'expiration des sessions, le verrouillage de compte et la réinitialisation du mot de passe.", EnCours, "Nadeur",
                ("Nadeur", "Verrouillage après échecs répétés : conforme. Reste l'expiration des sessions."),
                ("Wael", "OK, rapport attendu en fin de semaine.")),
            T("Remédiation", "Accompagner les correctifs et vérifier qu'ils corrigent les failles sans régression.", EnCours, "Karim"),
            T("Rapport de vulnérabilités", "Classer les failles par gravité et proposer une recommandation pour chacune.", AFaire, "Ghafran"),
        }),
        new("Phishing et ingénierie sociale",
            "Simulation d'une campagne de phishing avec des comptes fictifs du laboratoire, détection et sensibilisation.", new[]
        {
            T("Scénario de la campagne", "Définir le scénario de la simulation, avec des comptes fictifs du laboratoire uniquement.", Terminee, "Hend",
                ("Hend", "Scénario validé avec l'équipe, aucun compte réel concerné.")),
            T("Analyse des en-têtes d'e-mail", "Analyser les en-têtes SPF, DKIM et Received d'e-mails de test pour repérer les incohérences.", Terminee, "Mahdi"),
            T("Simulation sur comptes fictifs", "Simuler la campagne dans le laboratoire et mesurer le taux de signalement par les comptes fictifs.", Terminee, "Lina",
                ("Lina", "Simulation terminée : 7 signalements sur 20 comptes fictifs."),
                ("Hend", "Bon point de départ, on vise mieux après la sensibilisation.")),
            T("Détection côté messagerie", "Proposer des règles de filtrage et d'alerte pour les messages suspects.", Terminee, "Sami",
                ("Sami", "Règles proposées et validées sur les messages de test."),
                ("Hend", "Parfait, merci.")),
            T("Guide de bonnes pratiques", "Rédiger un guide pour reconnaître et signaler un e-mail de phishing.", Terminee, "Wael"),
            T("Quiz de sensibilisation", "Créer un quiz de dix questions pour vérifier les acquis.", EnCours, "Hend",
                ("Hend", "Quiz en relecture, publication prévue demain.")),
        }),
        new("Sécurité réseau et IDS",
            "Protection et surveillance du réseau du laboratoire avec un pare-feu et un IDS, après attaque simulée.", new[]
        {
            T("Segmentation du réseau de test", "Séparer les segments du laboratoire et documenter les flux autorisés.", Terminee, "Aziz",
                ("Aziz", "Plan de segmentation appliqué et documenté."),
                ("Oussema", "Validé, merci.")),
            T("Configuration du pare-feu", "Définir les règles de filtrage entrant et sortant du laboratoire.", Terminee, "Fawzi"),
            T("Déploiement de l'IDS", "Installer et configurer l'IDS Suricata sur le segment surveillé du laboratoire.", EnCours, "Mohsen",
                ("Mohsen", "Sondes installées, réglage des seuils en cours."),
                ("Adel", "Je prépare les règles pendant ce temps.")),
            T("Règles de détection", "Écrire des règles de détection adaptées au trafic du laboratoire.", EnCours, "Adel",
                ("Adel", "Douze règles écrites, trois encore trop bruyantes.")),
            T("Scan de ports contrôlé", "Lancer un scan de ports autorisé dans le laboratoire et vérifier que l'IDS lève une alerte.", EnCours, "Nadeur",
                ("Nadeur", "Premier scan fait : alerte levée en moins d'une minute."),
                ("Mohsen", "Parfait, je note le délai dans le tableau de bord.")),
            T("Tableau de bord SOC", "Centraliser les alertes du laboratoire dans un tableau de bord lisible.", AFaire, "Mohsen"),
            T("Rapport réseau", "Synthétiser la configuration et les alertes observées.", AFaire, null),
        }),
        new("Cryptographie et mots de passe",
            "Bonnes pratiques de hachage, de chiffrement et de stockage des mots de passe, testées sur des données fictives.", new[]
        {
            T("Comparaison MD5 / SHA-256 / bcrypt", "Comparer la vitesse et la résistance de ces trois fonctions de hachage.", Terminee, "Ameur",
                ("Ameur", "Résultats ajoutés : bcrypt est nettement plus lent, c'est voulu."),
                ("Hend", "Merci, à intégrer à la politique.")),
            T("Chiffrement AES d'un fichier", "Chiffrer puis déchiffrer un fichier de test avec AES-256 et documenter la gestion de la clé.", Terminee, "Mariem"),
            T("Force des mots de passe", "Mesurer l'entropie de mots de passe types et en tirer une politique.", EnCours, "Karim",
                ("Karim", "Politique proposée : 12 caractères minimum et liste de mots interdits.")),
            T("Gestion des clés", "Proposer une méthode de stockage et de rotation des clés de chiffrement.", EnCours, "Linda",
                ("Linda", "Proposition : coffre de clés et rotation trimestrielle."),
                ("Hend", "À présenter à la prochaine réunion.")),
            T("Hachage avec sel", "Vérifier que deux mots de passe identiques donnent des hachés différents grâce au sel.", AFaire, "Ameni"),
            T("Politique de mots de passe", "Rédiger la politique finale validée par l'équipe.", AFaire, "Hend"),
        }),
        new("Forensique numérique et réponse à incident",
            "Investigation d'un incident simulé sur une image disque fictive et organisation de la réponse.", new[]
        {
            T("Acquisition d'une image disque", "Créer une copie bit à bit d'une image disque fictive et calculer son empreinte.", Terminee, "Khadija",
                ("Khadija", "Image acquise, empreintes SHA-256 vérifiées deux fois."),
                ("Oussema", "Parfait, chaîne de preuve à jour.")),
            T("Analyse des journaux système", "Repérer les connexions et événements suspects dans les journaux de la machine de test.", Terminee, "Mokhtar"),
            T("Analyse de la mémoire", "Examiner la capture mémoire de la machine de test pour identifier les processus inhabituels.", Terminee, "Khadija",
                ("Khadija", "Un processus inhabituel identifié, lié à l'incident simulé."),
                ("Oussema", "Ajouté à la chronologie.")),
            T("Analyse du trafic réseau", "Corréler les captures réseau du laboratoire avec la chronologie.", Terminee, "Anis"),
            T("Chronologie de l'incident", "Reconstituer l'enchaînement des événements de l'incident simulé.", Terminee, "Sami",
                ("Sami", "Chronologie consolidée et validée."),
                ("Mokhtar", "J'y ai ajouté les événements des journaux système.")),
            T("Préservation des preuves", "Documenter la chaîne de traçabilité et l'intégrité des preuves.", EnCours, "Oussema"),
            T("Plan de réponse à incident", "Rédiger les étapes de confinement, d'éradication et de rétablissement.", AFaire, "Oussema"),
        }),
        new("Red team sur un réseau de test",
            "Exercice red team autorisé sur un réseau de laboratoire, avec machines et comptes fictifs, pour évaluer la détection.", new[]
        {
            T("Règles d'engagement", "Fixer le périmètre, les horaires et les limites de l'exercice dans le laboratoire.", Terminee, "Wael",
                ("Wael", "Règles d'engagement signées par l'équipe bleue.")),
            T("Reconnaissance du réseau de test", "Inventorier les machines fictives et les services du réseau de laboratoire.", Terminee, "Ismail",
                ("Ismail", "Inventaire terminé : 14 machines fictives recensées."),
                ("Wael", "Bien, on passe à la phase suivante.")),
            T("Accès initial simulé", "Évaluer les points d'entrée du réseau de test et documenter ceux qui sont exploitables.", EnCours, "Hilmi"),
            T("Mouvement latéral", "Vérifier la séparation entre les segments du laboratoire et noter les passages possibles.", EnCours, "Anis",
                ("Anis", "Un segment de test communique encore avec l'administration, à vérifier."),
                ("Aziz", "Je regarde la règle de pare-feu concernée.")),
            T("Évaluation de la détection", "Comparer les actions de l'équipe rouge avec les alertes reçues par le SOC.", EnCours, "Adel",
                ("Adel", "Quatre actions sur sept ont déclenché une alerte."),
                ("Wael", "On détaillera les trois manquantes à la restitution.")),
            T("Persistance simulée", "Lister les mécanismes de persistance testés et vérifier qu'ils sont détectés.", AFaire, "Ghafran"),
            T("Restitution à l'équipe bleue", "Présenter les résultats et les axes d'amélioration de la détection.", AFaire, "Wael"),
            T("Rapport red team", "Rédiger le rapport avec les constats et les recommandations.", AFaire, null),
        }),
        new("Analyse d'un ransomware neutralisé",
            "Étude d'un échantillon de rançongiciel neutralisé dans un laboratoire isolé, centrée sur la détection et la restauration.", new[]
        {
            T("Préparation de l'échantillon neutralisé", "Vérifier que l'échantillon fourni est neutralisé et le stocker dans le laboratoire isolé.", Terminee, "Hassen",
                ("Hassen", "Échantillon vérifié et stocké dans le coffre du laboratoire."),
                ("Ghada", "Merci, accès limité à l'équipe malware.")),
            T("Comportement sur fichiers de test", "Observer en machine virtuelle l'effet de l'échantillon sur des fichiers de test.", EnCours, "Yessine",
                ("Yessine", "Observation en cours, instantané restauré après chaque essai.")),
            T("Signatures de détection", "Écrire des signatures de détection à partir du comportement observé.", EnCours, "Mokhtar",
                ("Mokhtar", "Première signature prête, test en cours sur le corpus du laboratoire.")),
            T("Détection par le SOC", "Vérifier que les alertes remontent dans le tableau de bord du SOC.", AFaire, "Mahdi"),
            T("Plan de sauvegarde", "Proposer une stratégie de sauvegarde hors ligne et de restauration.", AFaire, "Linda"),
            T("Test de restauration", "Restaurer les fichiers de test depuis la sauvegarde et mesurer le temps nécessaire.", AFaire, "Fawzi"),
            T("Note de synthèse", "Résumer les enseignements pour l'équipe et la direction.", AFaire, "Ghada"),
        }),
        new("Test d'intrusion Wi-Fi en laboratoire",
            "Évaluation de la sécurité d'un point d'accès Wi-Fi de laboratoire et de ses réglages, sur un réseau de test.", new[]
        {
            T("Inventaire du point d'accès de test", "Relever la configuration du point d'accès du laboratoire (chiffrement, réseau invité).", Terminee, "Fawzi"),
            T("Évaluation du chiffrement", "Vérifier que le réseau de test utilise un chiffrement à jour et une phrase de passe robuste.", Terminee, "Nadeur",
                ("Nadeur", "Le réseau de test utilisait encore WPA2 avec une phrase courte, signalé."),
                ("Hend", "Recommandation : WPA3 et une phrase de passe plus longue.")),
            T("Réseau invité", "Vérifier que le réseau invité est isolé du réseau interne du laboratoire.", Terminee, "Aziz"),
            T("Point d'accès non autorisé", "Vérifier que la détection repère un point d'accès non autorisé dans le laboratoire.", EnCours, "Sami",
                ("Sami", "Alerte reçue, mais avec dix minutes de délai."),
                ("Hend", "À améliorer avant la restitution.")),
            T("Durcissement", "Appliquer les réglages recommandés au point d'accès de test.", EnCours, "Fawzi"),
            T("Rapport Wi-Fi", "Rédiger les constats et les recommandations.", AFaire, "Hend"),
        }),
        new("Élévation de privilèges dans un Active Directory de test",
            "Audit d'un domaine Active Directory de laboratoire avec comptes fictifs, centré sur les droits excessifs.", new[]
        {
            T("Mise en place du domaine de test", "Préparer un domaine de laboratoire avec des comptes et des groupes fictifs.", Terminee, "Aziz"),
            T("Audit des comptes à privilèges", "Recenser les comptes fictifs membres de groupes sensibles.", Terminee, "Ghafran",
                ("Ghafran", "Trois comptes de service fictifs ont trop de droits."),
                ("Wael", "À corriger en priorité.")),
            T("Mots de passe des comptes de service", "Vérifier la robustesse et la rotation des mots de passe des comptes de service fictifs.", Terminee, "Karim"),
            T("Délégations et ACL", "Repérer les délégations et les droits mal configurés dans le domaine de test.", EnCours, "Lina",
                ("Lina", "Analyse des droits à moitié faite, rapport intermédiaire déposé.")),
            T("Chemins d'escalade", "Cartographier les chemins qui mènent d'un compte standard fictif à un compte administrateur.", EnCours, "Ismail",
                ("Ismail", "Deux chemins trouvés via des groupes imbriqués."),
                ("Ameni", "Je prépare les correctifs correspondants.")),
            T("Journalisation AD", "Activer et vérifier les journaux d'audit utiles au SOC.", EnCours, "Adel"),
            T("Correctifs", "Retirer les droits excessifs et documenter les changements.", AFaire, "Ameni"),
            T("Retest", "Vérifier après correctifs que les chemins d'escalade sont fermés.", AFaire, "Ghafran"),
        }),
        new("Reverse engineering d'un binaire d'entraînement",
            "Analyse statique et dynamique d'un binaire conçu pour l'entraînement, sans code malveillant réel.", new[]
        {
            T("Analyse statique", "Identifier les sections, les chaînes et les fonctions principales du binaire d'entraînement.", Terminee, "Yessine",
                ("Yessine", "Fonctions principales identifiées et commentées."),
                ("Ghada", "Bon travail, le schéma est très lisible.")),
            T("Analyse dynamique", "Observer l'exécution du binaire en machine virtuelle et noter les appels système.", Terminee, "Hassen"),
            T("Logique de vérification", "Comprendre la routine de vérification du mot de passe d'entraînement.", Terminee, "Khadija",
                ("Khadija", "Routine comprise, explication ajoutée au wiki interne.")),
            T("Protections du binaire", "Relever les protections de compilation présentes et absentes.", Terminee, "Mariem"),
            T("Fiche pédagogique", "Rédiger une fiche d'exercice pour les nouveaux membres.", EnCours, "Ghada",
                ("Ghada", "Brouillon partagé, relectures bienvenues."),
                ("Yessine", "Relu, quelques précisions ajoutées.")),
            T("Version corrigée", "Proposer une version du binaire avec une vérification plus robuste.", AFaire, "Ameur"),
        }),
        new(ProjetRepere,
            "Compétition interne de type Capture The Flag sur une plateforme de laboratoire, avec des défis fictifs.", new[]
        {
            T("Cahier des charges du CTF", "Définir les catégories de défis, le barème et les règles.", Terminee, "Oussema",
                ("Oussema", "Catégories retenues : web, réseau, forensique et reverse."),
                ("Wael", "D'accord pour moi.")),
            T("Plateforme de laboratoire", "Préparer la plateforme isolée qui héberge les défis.", Terminee, "Anis"),
            T("Défis forensique", "Préparer des images et des journaux fictifs à analyser.", Terminee, "Mokhtar"),
            T("Défis web", "Concevoir des défis web sur une application fictive volontairement vulnérable.", EnCours, "Lina",
                ("Lina", "Trois défis prêts, deux en relecture."),
                ("Hilmi", "Je teste les deux restants demain.")),
            T("Défis reverse", "Préparer deux binaires d'entraînement de difficulté croissante.", AFaire, "Yessine"),
            T("Tableau des scores", "Mettre en place l'affichage des scores et vérifier l'équité du barème.", AFaire, "Mahdi"),
            T("Bilan du CTF", "Recueillir les retours des participants et proposer des améliorations.", AFaire, "Oussema"),
        }),
    };

    public static async Task SeedAsync (IServiceProvider services)
    {
        var context = services.GetRequiredService<AppDbContext>() ;
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<IdentityUser>>();
        var log = services.GetRequiredService<ILoggerFactory>().CreateLogger("Dbseeder");
        await context.Database.MigrateAsync();

        // 1. remise à zéro si la base n'est pas la version actuelle du jeu de présentation :
        //    projet repère absent, ou un membre de la liste sans fiche
        var emails = MembresDemo.Select(m => Email(m.Prenom)).ToList();
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
            // rôles : on garde uniquement Admin, Membre et les rôles métier
            foreach (var r in await roleManager.Roles.Where(r => !Roles.Contains(r.Name!)).ToListAsync())
                await roleManager.DeleteAsync(r);

            // nouvelles fiches Membre, projets, tâches et commentaires
            var membres = MembresDemo.ToDictionary(m => m.Prenom, m => new Membre { Nom = m.Prenom, Email = Email(m.Prenom) });
            context.Membres.AddRange(membres.Values);
            var maintenant = DateTime.UtcNow;
            var n = 0;   // numéro de tâche : répartit les dates des commentaires sur les derniers jours
            foreach (var p in ProjetsDemo)
            {
                var projet = new Projet { Nom = p.Nom, Description = p.Description };
                foreach (var t in p.Taches)
                {
                    var tache = new Tache { Titre = t.Titre, Description = t.Description, Statut = t.Statut,
                                            Membre = t.Membre == null ? null : membres[t.Membre] };
                    // commentaires du plus ancien au plus récent, sur environ deux semaines
                    var depart = 2 + n++ % 9;
                    for (var k = 0; k < t.Commentaires.Length; k++)
                        tache.Commentaires.Add(new Commentaire
                        {
                            Contenu = t.Commentaires[k].Texte,
                            Membre = membres[t.Commentaires[k].Auteur],
                            DateCreation = maintenant.Date.AddDays(-(depart + t.Commentaires.Length - 1 - k))
                                           .AddHours(8 + (n * 3 + k * 2) % 9).AddMinutes((n * 17 + k * 23) % 60)
                        });
                    projet.Taches.Add(tache);
                }
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

        // 4. inscription de chaque membre (comme /api/Auth/register) : compte + rôle Membre + rôle métier,
        //    seulement s'il manque (un rôle changé ensuite par l'admin n'est pas écrasé au redémarrage)
        foreach (var (prenom, metier) in MembresDemo)
        {
            var email = Email(prenom);
            if (await userManager.FindByEmailAsync(email) != null) continue;
            var user = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };
            var res = await userManager.CreateAsync(user, MotDePasse(prenom));
            if (res.Succeeded) await userManager.AddToRolesAsync(user, new[] { "Membre", metier });
            else log.LogWarning("Compte {Email} non créé : {Erreurs}", email, string.Join(" ", res.Errors.Select(e => e.Description)));
        }
    }
}
