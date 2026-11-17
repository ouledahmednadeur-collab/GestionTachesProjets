# Gestion de projets et de tâches

API REST ASP.NET Core (.NET 10) avec un front HTML/CSS/JavaScript servi par la même application. Un administrateur crée des projets, des tâches et des membres, puis affecte les tâches ; un membre consulte ses projets et ses tâches, change leur statut et suit l'avancement.

- Auteur : Nadeur Ouled Ahmed
- Sujet n°5 : Gestion de projets et de tâches

## Technologies

ASP.NET Core Web API, Entity Framework Core 10 (Code First) avec SQLite, ASP.NET Core Identity, JWT, Repository Pattern, async/await, Swagger, front en HTML/CSS/JS dans `wwwroot/`.

## Prérequis

- SDK .NET 10 (`dotnet --list-sdks` pour vérifier)
- Git et un navigateur récent

## Installation et lancement

```bash
git clone https://github.com/ouledahmednadeur-collab/GestionTachesProjets.git
cd GestionTachesProjets
dotnet restore
```

Définir la clé de signature JWT (au moins 32 caractères, jamais versionnée) :

```bash
dotnet user-secrets set "Jwt:Key" "remplacer-par-une-cle-longue-d-au-moins-32-caracteres"
```

Lancer l'application :

```bash
dotnet run
```

| Élément | Adresse |
|---|---|
| Front-end | http://localhost:5066/ |
| Swagger | http://localhost:5066/swagger |

La base SQLite (`projettaches.db`) est créée, migrée et remplie automatiquement au démarrage. Pour repartir de zéro : arrêter l'application, supprimer `projettaches.db`, relancer.
Les migrations (`InitialCreate`, puis `AjoutMessages` pour la messagerie, `AjoutNotifications` pour les notifications et `RolesParProjet` pour les rôles par projet) sont appliquées automatiquement, sans commande à lancer.

## Comptes de démonstration

| Email | Rôle | Mot de passe |
|---|---|---|
| admin@test.com | Admin | `Admin123!` |
| nadeur@test.com | Membre | `Nadeur1234!` |

Les autres membres suivent la règle `prénom@test.com` / `Prénom1234!` (par exemple `ameni@test.com` / `Ameni1234!`). Ces mots de passe sont des valeurs de démonstration.
En plus du rôle « Membre », chaque membre a un rôle métier (affichage seulement, sans droit supplémentaire) : Ingénieur sécurité, Pentester, Analyste SOC, Analyste malware, Ingénieur réseau ou Responsable projet.

## Architecture

```
Controllers/   points d'entrée HTTP
Repositories/  interfaces I*Repository et implémentations (accès EF Core)
Data/          AppDbContext et DbSeeder
Models/        Projet, Tache, Membre, Commentaire
DTOs/          objets d'entrée/sortie et PagedResult<T>
wwwroot/       front-end
```

Flux : `Controller -> IRepository -> Repository -> AppDbContext -> SQLite`.

Relations : un projet a plusieurs tâches ; une tâche a au plus un membre et plusieurs commentaires ; un commentaire appartient à une tâche et à un membre. Un compte Identity est relié à sa fiche Membre par l'email.

## Endpoints principaux

| Ressource | Routes | Accès |
|---|---|---|
| Auth | `POST /api/Auth/register`, `POST /api/Auth/login` | Anonyme |
| Projets | `GET /api/Projets` (paginé), `POST`, `PUT /{id}`, `DELETE /{id}` | Admin |
| Projets | `GET /api/Projets/{id}`, `GET /api/projets/{id}/avancement` | Connecté |
| Tâches | `GET /api/projets/{id}/taches?statut=&page=&pageSize=`, `GET /api/Taches/{id}` | Connecté |
| Tâches | `POST /api/Taches` | Admin ou membre avec le privilège taches.creer dans le projet |
| Tâches | `PUT /api/Taches/{id}/affecter`, `DELETE /api/Taches/{id}` | Admin |
| Tâches | `PUT /api/Taches/{id}/statut` | Admin ou membre affecté |
| Tâches | `GET /api/membres/{id}/taches` | Admin ou le membre lui-même |
| Membres | `GET /api/Membres`, `GET /{id}`, `PUT /{id}` | Connecté |
| Membres | `POST /api/Membres` (corps : `nom`, `email`, `password` ; crée aussi le compte de connexion avec le rôle Membre ; 409 si l'email existe déjà, 400 si le mot de passe est refusé ; mot de passe jamais renvoyé), `DELETE /api/Membres/{id}` | Admin |
| Commentaires | `GET` et `POST /api/taches/{id}/commentaires` | Connecté |
| Commentaires | `DELETE /api/Commentaires/{id}` | Admin ou auteur du commentaire |
| Rôles | `GET`, `POST /api/Roles` (corps : `nom` + `privileges` optionnels, création atomique, 400 si doublon sans tenir compte de la casse, nom réservé ou privilège inconnu), `POST /attribuer` et `DELETE /retirer` (corps : `email`, `role`, `projetId` optionnel ; obligatoire pour un rôle porteur de privilèges, interdit pour Admin et Membre ; 400 si le membre n'a aucune tâche dans le projet, 404 projet inconnu, 409 affectation déjà existante), `GET /api/Roles/utilisateurs` (rôles globaux + champ `affectations` par projet) | Admin |
| Privilèges | `GET /api/Roles/privileges` (catalogue), `GET` et `PUT /api/Roles/{nomRole}/privileges` | Admin |
| Privilèges | `GET /api/Auth/privileges` : Admin → `{ admin: true, privileges: [...] }` ; membre → `{ admin: false, projets: { "<id>": { projetNom, roles, privileges: [{ cle, libelle, description }] } } }` (une entrée par projet où il a un rôle) | Connecté, uniquement lui-même |
| Messages | `GET /api/Messages/conversations`, `GET /api/Messages/conversation/{membreId}`, `GET /api/Messages/non-lus` | Membre ou Admin connecté, uniquement ses propres conversations (l'Admin a l'identifiant 0, « Administrateur ») |
| Messages | `POST /api/Messages`, `DELETE /api/Messages/{id}` | Membre ou Admin connecté (expéditeur déduit du token ; `destinataireId: 0` = écrire à l'Administrateur ; suppression par l'auteur seulement) |
| Notifications | `GET /api/Notifications?page=&pageSize=&nonLues=`, `GET /api/Notifications/non-lues`, `PUT /api/Notifications/{id}/lue`, `PUT /api/Notifications/lues`, `DELETE /api/Notifications/{id}` | Connecté, uniquement ses propres notifications |

Codes HTTP : 200/201/204 en succès, 400 données invalides, 401 sans token valide, 403 rôle insuffisant ou ressource d'un autre utilisateur, 404 introuvable, 409 suppression impossible.

## Sécurité

- Identity gère les comptes et les mots de passe hachés ; `POST /api/Auth/login` renvoie un token JWT (60 minutes) qui contient le rôle.
- `[Authorize]` protège les contrôleurs ; `[Authorize(Roles = "Admin")]` réserve les actions sensibles à l'administrateur.
- Un membre ne voit que ses propres tâches et ne change que le statut de ses tâches.
- Messagerie privée : expéditeur déduit du token, lecture limitée aux deux participants, suppression limitée à l'auteur (l'Admin n'a aucun droit particulier sur les messages).
- Privilèges délégables à un rôle (ex. « Superviseur ») : `taches.affecter` (affecter une tâche à un membre du projet), `taches.creer` (créer des tâches), `taches.statut` (changer le statut des tâches de ses projets), `commentaires.moderer` (supprimer les commentaires des tâches de ses projets). Ils sont stockés comme claims de rôle Identity (table AspNetRoleClaims).
- Rôles par projet : un rôle porteur de privilèges s'attribue à un membre DANS un projet (table `AffectationsRoles` : `MembreId`, `ProjetId`, `NomRole`, unique sur les trois, supprimée en cascade avec le membre ou le projet). Règle : un privilège est accordé sur un projet si l'utilisateur est Admin, OU s'il a dans ce projet une affectation vers un rôle qui porte ce privilège ET qu'il est toujours membre du projet (au moins une tâche affectée). Pour une affectation de tâche, le membre destinataire doit aussi être membre du projet. Admin et Membre restent des rôles globaux ; un rôle sans privilège peut rester global.
- Un rôle à privilèges attribué globalement (avant cette version) n'a plus aucun effet : à réaffecter par projet depuis la page Rôles.
- Jamais délégables (toujours `[Authorize(Roles = "Admin")]`) : supprimer un membre, supprimer un projet ou une tâche, créer ou modifier un projet, gérer les rôles et leurs privilèges.
- Les droits sont relus en base à chaque requête (rôles du compte, affectations par projet, claims des rôles) : retirer une affectation ou un privilège est immédiat, même avec un token encore valide.
- Notifications : créées par le serveur uniquement ; chaque requête filtre sur l'email du token (personne, pas même l'Admin, ne voit celles d'un autre ; 404 identique si elle n'existe pas ou n'est pas à soi). Diffusion : nouveau message → le destinataire (sans copier le contenu) ; statut de tâche réellement changé → les membres du projet et les Admins, sauf l'auteur du changement ; tâche ajoutée → les membres du projet (pas les Admins), sauf l'auteur ; tâche affectée → le membre affecté, sauf s'il est l'auteur ; toujours sans doublon. Le texte nomme l'auteur de l'action (nom de sa fiche Membre, sinon « Administrateur »), déduit du token, par exemple « Wael a changé le statut de « … » ».

## Fonctionnalités

- Pagination sur toutes les listes : `?page=1&pageSize=10`, réponse `{ page, pageSize, total, items }`.
- Validation par DataAnnotations (erreur 400 détaillée).
- Avancement d'un projet : tâches terminées / total des tâches, en pourcentage.
- Swagger avec bouton Authorize : se connecter via `/api/Auth/login`, copier le token, cliquer sur Authorize et le coller.

## Test rapide

1. Se connecter en `admin@test.com`, créer un projet puis une tâche affectée à Nadeur.
2. Se déconnecter, se connecter en `nadeur@test.com` : le projet et la tâche apparaissent.
3. Passer la tâche à « Terminée » : l'avancement du projet augmente.
4. Dans Swagger avec le token du membre : `GET /api/Projets` renvoie 403, sans token tout renvoie 401.

## Limites

- Tout utilisateur connecté peut lire n'importe quel projet ou tâche par son Id.
- L'auteur d'un commentaire est envoyé par le client (`membreId`) au lieu d'être déduit du token.
- Pas de tests automatisés.
