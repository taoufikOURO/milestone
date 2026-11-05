# Milestone

Application web de planification des projets de groupe pour une promotion d'étudiants.

## 1. Présentation

Milestone aide les étudiants d'une même promotion à planifier leurs projets de groupe. Plusieurs enseignants peuvent donner des projets en même temps, avec des deadlines différentes : un étudiant se retrouve alors dans plusieurs groupes, avec des projets qui se chevauchent, et personne ne voit la charge réelle qui pèse sur lui.

Le problème que Milestone résout est ce **chevauchement de projets entre plusieurs enseignants**. L'application ne planifie pas par groupe mais **par étudiant, sur toute la promotion** : elle repère les conflits de disponibilité (deadline intenable, tâche sans assigné, dépendance bloquante) et propose un ordre de travail réaliste.

L'objectif de la v1 : chaque étudiant voit, au même endroit, tous ses projets, leur avancement et les deadlines à tenir. Le public visé est une promotion d'étudiants ; un étudiant crée sa promo (il en devient le délégué), partage un code, et la classe organise ses groupes à l'intérieur.

## 2. Fonctionnalités

**Comptes**
- Inscription avec nom d'utilisateur (unique), prénom, nom, email et mot de passe (8 caractères minimum).
- Validation de l'adresse email par un lien à usage unique, avec renvoi possible du mail.
- Connexion par email et mot de passe, déconnexion.
- Mot de passe oublié et réinitialisation par un lien à usage unique.

**Promotions**
- Création d'une promo (le créateur devient délégué) ; un code unique est généré.
- Rejoindre une promo en saisissant son code (il n'existe aucune liste publique).
- Quitter la promo, avec successeur obligatoire pour un délégué ou un chef de groupe.
- Passation de la délégation à un autre membre.
- Suppression de la promo par le délégué, après confirmation.

**Groupes**
- Création d'un groupe (nom, date de début, date de fin) par tout membre de la promo ; le créateur devient chef.
- Modification du nom, des dates et de la marge de sécurité (0 à 100 %) par le chef.
- Départ d'un membre, passation du rôle de chef, suppression du groupe par le chef (avec confirmation).
- Suppression automatique d'un groupe qui n'a plus de membre.

**Invitations**
- Le chef invite un étudiant de la promo par son nom d'utilisateur, et peut annuler une invitation en attente.
- L'invité accepte ou refuse depuis son accueil.

**Tâches et dépendances**
- Le chef crée des tâches (titre, durée de 1 à 1000 jours), les assigne à un ou plusieurs membres et les modifie ou supprime.
- Le chef définit les dépendances entre tâches d'un même groupe ; les dépendances circulaires sont refusées.
- Chaque membre peut changer le statut d'une tâche (à faire, en cours, terminée).
- L'avancement du groupe est calculé au prorata des jours des tâches terminées, sans la marge.
- Les tâches sans assigné sont signalées par un badge.

**Planification**
- Calcul à la demande d'un plan pour toute la promo : dates au plus tôt selon les dépendances, tri par urgence, placement par étudiant.
- Détection des conflits : deadline impossible à tenir, tâche sans assigné, tâche bloquée par une dépendance.
- Proposition d'un jour de réunion pour les tâches assignées à plusieurs personnes.

**Calendriers**
- Calendrier de la promo : une barre par groupe, remplie selon l'avancement, cliquable.
- Calendrier d'un groupe : tâches planifiées, réunions, deadlines, conflits (visible des seuls membres).
- « Mon calendrier » : vue mensuelle personnelle de tous les groupes de l'étudiant.

**Profil**
- Modification du prénom et du nom, changement de mot de passe (avec l'ancien) ; le nom d'utilisateur n'est pas modifiable.

## 3. Parcours utilisateur

1. **Inscription** (`/inscription`) : le compte est créé, un email de validation est envoyé.
2. **Validation de l'email** : tant que l'adresse n'est pas validée, le compte ne peut rien faire d'autre que valider son email (page `/verifier-email`, avec bouton de renvoi). Cette règle est revérifiée côté serveur à chaque action.
3. **Connexion** (`/connexion`), puis arrivée sur l'accueil (`/accueil`).
4. **Promo** : créer une promo (on en devient délégué) ou en rejoindre une avec son code. Un étudiant n'est que dans une promo à la fois ; pour en changer, il quitte la précédente.
5. **Groupe** : tout membre de la promo peut créer un groupe et en devient chef.
6. **Invitations** : le chef invite des membres de la promo par nom d'utilisateur ; ils acceptent ou refusent depuis leur accueil. On ne rejoint un groupe qu'après acceptation.
7. **Tâches** : seul le chef d'un groupe crée les tâches et les assigne (titre, durée, assignés, dépendances). Les membres changent seulement le statut.
8. **Calendriers** : calendrier de la promo, calendrier du groupe, puis « Mon calendrier » pour la vue personnelle de tous ses groupes.

Le délégué gère la promo (code, passation, suppression) mais **n'a aucun pouvoir sur les groupes** : il n'y accède que s'il en est membre ou chef comme tout autre étudiant.

## 4. Règles métier

Le détail complet est dans [docs/cahier-des-charges.md](docs/cahier-des-charges.md). En résumé :

- **Départ de la promo** : un membre peut partir quand il veut ; un délégué doit d'abord nommer un successeur ; un chef de groupe doit d'abord nommer un successeur dans chacun de ses groupes.
- **Départ d'un groupe** : un membre qui part laisse ses tâches partagées à leurs autres assignés ; celles où il était seul assigné deviennent « non assignées » (le chef doit les réattribuer). Un chef doit nommer un successeur, ou supprimer le groupe s'il en est le dernier membre.
- **Passation** : le délégué (ou le chef) choisit un membre, qui reçoit le rôle immédiatement.
- **Suppression** : un groupe supprimé efface ses tâches, assignations, dépendances et invitations. Supprimer la promo fait quitter tous les membres et supprime tous ses groupes.
- **Planification** : la deadline d'une tâche est la date de fin de son groupe ; la tâche la plus proche de sa deadline passe en premier, puis la longueur de la chaîne de dépendances restante départage. Un étudiant fait au plus une tâche par jour ; une tâche multi-assignée occupe tous ses assignés en parallèle. Les jours sont calendaires (week-ends inclus).
- **Durée effective** : durée saisie × (1 + marge), arrondie au jour supérieur. La marge vaut 20 % par défaut, réglable par le chef de 0 à 100 %.
- **Conflits signalés** : deadline dépassée (`deadline_missed`), tâche non assignée (`unassigned`), dépendance bloquante (`blocked_dependency`, ainsi que `dependency_cycle` par sécurité). Un conflit est rattaché au dernier jour de la tâche planifiée ; sans tâche planifiable, il est listé dans « Conflits sans date ».

## 5. Stack technique

| Outil | Version | Rôle |
|---|---|---|
| Next.js (App Router) | 16.4.4 | Framework full-stack : pages, server actions et route handlers. |
| React | 19.3.0 | Interface utilisateur. |
| TypeScript | ^5 | Typage de tout le code. |
| Tailwind CSS | ^4 | Mise en forme, avec la palette du projet. |
| Prisma | 7.10.1 | Schéma, migrations et accès à la base (avec `@prisma/adapter-pg`). |
| PostgreSQL | — | Base de données (locale en développement, Supabase en production, sans Supabase Auth). |
| Auth.js (`next-auth`) | 5.0.0-beta.32 | Connexion email et mot de passe, sessions JWT. |
| `@node-rs/argon2` | 2.2.2 | Hachage des mots de passe (argon2id). |
| Zod | ^4.6.7 | Validation des entrées côté serveur. |
| Brevo | — | Envoi des emails transactionnels via son API HTTP (pas de SDK). |
| Vitest | ^5.1.0 | Tests unitaires et d'intégration. |
| Playwright | ^1.64.1 | Tests end-to-end dans un vrai navigateur. |
| motion | ^14.9.0 | Animations de l'interface. |
| lucide-react | ^1.67.0 | Icônes. |
| ESLint | ^9 | Lint (`eslint-config-next`). |

Gestionnaire de paquets : pnpm 12.6.0 (champ `packageManager`).

## 6. Architecture

| Dossier | Contenu |
|---|---|
| `app/` | Pages et routes (App Router). `(public)` : landing, inscription, connexion, mot de passe oublié, réinitialisation. `(app)` : accueil, promo, groupes, tâches, calendriers, profil. `verifier-email/`, `session-expiree/`, `api/auth/`. |
| `components/` | Composants React par domaine : `ui`, `auth`, `calendar`, `group`, `promo`, `task`, `profile`, `landing`, `nav`, `motion`, `providers`. |
| `lib/services/` | Logique métier et **seul endroit qui accède à Prisma** pour les données. Chaque fonction reçoit l'utilisateur courant et vérifie ses droits à chaque appel. |
| `lib/actions/` | Server actions : elles lisent le formulaire, valident avec Zod (schémas de `lib/validation/`) puis appellent un service. |
| `lib/validation/` | Schémas Zod. |
| `lib/domain/` | Fonctions pures, sans base de données : détection de cycles, avancement, frise, grille mensuelle. |
| `lib/planning/` | Moteur de planification : fonctions pures et déterministes (CPM, priorité, placement, conflits, réunions). L'horloge n'y est jamais lue : « aujourd'hui » est fourni par l'appelant. |
| `lib/auth/` | Mots de passe, tokens, limite de fréquence des emails, sessions, gardes d'accès (`requireUser`, `requireVerifiedUser`). |
| `lib/email/` | Transports d'email : console (développement) et Brevo, gabarits. |
| `prisma/` | `schema.prisma`, migrations versionnées, seed (volontairement vide). |
| `generated/prisma/` | Client Prisma généré (non versionné). |
| `tests/`, `scripts/` | Aides pour les tests d'intégration (base de test) et script de migration de la base de test. |
| `e2e/` | Tests Playwright (un scénario par critère d'acceptation). |
| `docs/` | Documentation du projet. |

Règles d'architecture :
- Seules les fonctions de `lib/services/` touchent à Prisma pour lire et écrire les données. Exceptions limitées : `lib/auth/guards.ts` relit l'utilisateur en base pour les gardes, et `lib/auth/tokens.ts` reçoit un client en paramètre.
- Les actions de `lib/actions/` valident avec Zod puis appellent un service ; elles ne contiennent pas de règle métier. (L'inscription fait sa validation Zod dans le service `registerUser`.)
- `lib/domain/` et `lib/planning/` sont des fonctions pures, sans accès à la base.
- Les droits ne reposent jamais sur l'interface : ils sont revérifiés côté serveur. `proxy.ts` ne fait que des redirections.

## 7. Installation locale

**Prérequis**
- Node.js (le code utilise `process.loadEnvFile`, donc Node 20.12 ou plus ; testé avec Node 24).
- pnpm 12.6.0.
- PostgreSQL en local (port 5432). Le dépôt ne fournit pas de configuration Docker ; si vous préférez, un PostgreSQL lancé dans Docker convient tant que les URL du `.env` pointent dessus.

**Étapes**

1. Installer les dépendances : `pnpm install`.
2. Créer deux bases PostgreSQL : `milestone` (développement) et `milestone_test` (tests). Le nom de la base de test doit se terminer par `_test`.
3. Copier `.env.example` en `.env`, puis renseigner au minimum `DATABASE_URL`, `TEST_DATABASE_URL` (base différente, terminée par `_test`) et `AUTH_SECRET` (générer avec `npx auth secret`). Le fichier `.env` n'est jamais versionné ; ne mettez aucun identifiant dans ce README ni dans `CLAUDE.md`.
4. Générer le client Prisma : `pnpm db:generate`.
5. Appliquer les migrations sur la base de développement : `pnpm db:migrate`.
6. Appliquer les migrations sur la base de test : `pnpm db:test:migrate`.
7. Lancer l'application : `pnpm dev` (http://localhost:3000).

**Emails en développement** : sans configuration, le transport est « console » : les emails (liens de validation, de réinitialisation) sont écrits dans la console du serveur `pnpm dev`, aucun mail n'est envoyé. `EMAIL_TRANSPORT=brevo` permet d'utiliser Brevo en local (il faut alors `BREVO_API_KEY` et `MAIL_FROM`).

## 8. Scripts

| Script | Rôle |
|---|---|
| `pnpm dev` | Serveur de développement Next.js. |
| `pnpm build` | `prisma generate` puis build de production Next.js. |
| `pnpm start` | Serveur de production (après `build`). |
| `pnpm lint` | ESLint. |
| `pnpm typecheck` | Vérification TypeScript (`tsc --noEmit`). |
| `pnpm test` | Tests unitaires (Vitest, sans base de données). |
| `pnpm test:integration` | Tests d'intégration (Vitest, sur la base de test). |
| `pnpm test:e2e` | Tests end-to-end (Playwright). |
| `pnpm db:migrate` | `prisma migrate dev` : crée et applique les migrations en local. |
| `pnpm db:generate` | `prisma generate` : génère le client Prisma. |
| `pnpm db:test:migrate` | Applique les migrations sur la base `TEST_DATABASE_URL` (`prisma migrate deploy`). |

## 9. Tests

Avant de considérer une tâche terminée : `pnpm lint`, `pnpm typecheck` et les tests ci-dessous.

1. **Unitaires** : `pnpm test`. Fichiers `__tests__/*.test.ts` : planification, domaine, mots de passe, tokens, validation, routes… Aucune base de données.
2. **Intégration** : `pnpm test:integration`. Fichiers `__tests__/*.int.test.ts` (services, contraintes de la base). Ils tournent sur la base `TEST_DATABASE_URL` (`milestone_test`), préparée par `pnpm db:test:migrate`. Les suites s'exécutent en série car elles partagent la base.
3. **End-to-end** : `pnpm test:e2e`. Playwright (`e2e/criteres.spec.ts`) joue un scénario par critère d'acceptation du cahier des charges (§11, 11 critères). Il lance son propre `next dev` sur le port 3100 avec la base de test et le transport d'email console. Il utilise le Chrome installé sur la machine ; `E2E_BROWSER_CHANNEL` permet d'en choisir un autre (ex. `msedge`).
4. **Build** : `pnpm build` vérifie que l'application compile pour la production.

**Garde-fous sur la base de test**
- `TEST_DATABASE_URL` est la variable qui désigne la base de test. Elle doit différer de `DATABASE_URL`.
- Les tests d'intégration et end-to-end **vident les tables** de cette base.
- Ils **refusent de tourner** si le nom de la base ne se termine pas par `_test`, ou si l'URL est identique à `DATABASE_URL`.

## 10. Déploiement

La procédure complète (Vercel, Supabase, migrations, vérification de la RLS) est dans [docs/deploiement.md](docs/deploiement.md). Variables d'environnement (valeurs à ne jamais versionner) :

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `BREVO_API_KEY`
- `MAIL_FROM`
- `APP_URL`
- `EMAIL_TRANSPORT`
- `PLANNING_TIMEZONE`

`TEST_DATABASE_URL` est réservée au développement et aux tests : ne pas la définir en production.

## 11. Sécurité

- Mots de passe hachés en **argon2id**, jamais stockés en clair.
- Tokens de validation d'email et de réinitialisation : aléatoires, **stockés hachés**, à **usage unique** et à durée limitée ; seul le dernier lien émis fonctionne.
- **RLS activée sur toutes les tables**, sans policy (refus par défaut via l'API Supabase). Elle ne doit jamais être désactivée.
- **Droits vérifiés côté serveur**, dans les services, à chaque appel ; l'interface n'est jamais la seule protection. L'email validé est revérifié en base à chaque action.
- **Messages d'erreur neutres** là où une réponse précise aiderait à deviner des informations (identifiants de connexion, code de promo, groupe d'autrui).
- Limite de fréquence sur l'envoi des emails, validation des entrées avec Zod, liens d'email construits à partir de `APP_URL`.
- Les secrets ne sont ni dans le code ni dans Git.

## 12. Limites connues de la v1

- **Import d'emploi du temps** : absent. La disponibilité se limite à « pas occupé par une autre tâche planifiée », au grain d'un jour.
- **Notifications par email de changement de deadline** : absentes. Le plan est recalculé à la demande, sans notification.
- **Application mobile** : aucune ; l'interface web est responsive.
- **Solveur d'optimisation** : aucun (pas d'OR-Tools) ; l'algorithme est heuristique.
- **Persistance des réunions** : les réunions sont calculées à chaque lecture et jamais écrites en base ; la table `meetings` existe mais reste vide.
- **Fuseau horaire par promo** : un seul fuseau pour toute l'application, défini par `PLANNING_TIMEZONE` (`Africa/Lome` par défaut).

## 13. Glossaire

| Terme | Définition |
|---|---|
| **Promo** | Ensemble d'étudiants d'une même classe ; un étudiant n'est que dans une promo à la fois. On la rejoint avec son code. |
| **Délégué** | Étudiant qui a créé la promo. Gère le code, la passation et la suppression ; aucun pouvoir sur les groupes. |
| **Groupe** | Équivalent d'un projet : dates de début et de fin, tâches, calendrier. |
| **Chef de groupe** | Créateur du groupe. Invite, crée et assigne les tâches, règle la marge, peut supprimer le groupe. |
| **Membre** | Étudiant qui a accepté l'invitation à un groupe. |
| **Tâche** | Unité de travail d'un groupe : titre, durée en jours, assignés, dépendances, statut. |
| **Dépendance** | Lien entre deux tâches d'un même groupe : une tâche ne peut être planifiée qu'après la fin de celles dont elle dépend. |
| **Jour** | Unité de durée : jour calendaire, cours inclus (3 jours = « 3 jours avec les cours »), week-ends compris. |
| **Marge** | Pourcentage de sécurité (20 % par défaut, 0 à 100 %) ajouté à chaque durée saisie pour obtenir la durée effective. |

## 14. Documentation

- [CLAUDE.md](CLAUDE.md) : instructions de projet pour l'assistant IA (stack, palette, base locale, règles de travail).
- [AGENTS.md](AGENTS.md) : consignes lues par les outils d'agents compatibles avec ce format (par exemple OpenCode) : elles rappellent de consulter la documentation de la version de Next.js installée avant d'écrire du code (bloc géré par `next dev`).
- [docs/cahier-des-charges.md](docs/cahier-des-charges.md) : cahier des charges complet (règles métier, pages, modèle de données, sécurité, décisions, critères d'acceptation).
- [docs/plan-milestone-v1.md](docs/plan-milestone-v1.md) : plan d'implémentation en étapes, avec état d'avancement, points en attente et écarts acceptés.
- [docs/deploiement.md](docs/deploiement.md) : procédure de mise en production (Vercel, Supabase, migrations, RLS, comptes de test).
