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

## Comptes de démonstration

| Email | Rôle | Mot de passe |
|---|---|---|
| admin@test.com | Admin | `Admin123!` |
| nadeur@test.com | Membre | `Nadeur1234!` |

Les autres membres suivent la règle `prénom@test.com` / `Prénom1234!` (par exemple `ameni@test.com` / `Ameni1234!`). Ces mots de passe sont des valeurs de démonstration.

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
| Tâches | `GET /api/projets/{id}/taches?statut=&page=&pageSize=`, `GET /api/Taches/{id}`, `POST /api/Taches` | Connecté |
| Tâches | `PUT /api/Taches/{id}/affecter`, `DELETE /api/Taches/{id}` | Admin |
| Tâches | `PUT /api/Taches/{id}/statut` | Admin ou membre affecté |
| Tâches | `GET /api/membres/{id}/taches` | Admin ou le membre lui-même |
| Membres | `GET /api/Membres`, `GET /{id}`, `POST`, `PUT /{id}` | Connecté |
| Membres | `DELETE /api/Membres/{id}` | Admin |
| Commentaires | `GET` et `POST /api/taches/{id}/commentaires` | Connecté |
| Commentaires | `DELETE /api/Commentaires/{id}` | Admin ou auteur du commentaire |
| Rôles | `GET`, `POST /api/Roles`, `POST /attribuer`, `DELETE /retirer` | Admin |

Codes HTTP : 200/201/204 en succès, 400 données invalides, 401 sans token valide, 403 rôle insuffisant ou ressource d'un autre utilisateur, 404 introuvable, 409 suppression impossible.

## Sécurité

- Identity gère les comptes et les mots de passe hachés ; `POST /api/Auth/login` renvoie un token JWT (60 minutes) qui contient le rôle.
- `[Authorize]` protège les contrôleurs ; `[Authorize(Roles = "Admin")]` réserve les actions sensibles à l'administrateur.
- Un membre ne voit que ses propres tâches et ne change que le statut de ses tâches.

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
