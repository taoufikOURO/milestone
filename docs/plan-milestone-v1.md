# Plan d'implémentation — Milestone v1 (avec état d'avancement)

## État d'avancement

Mis à jour le 4 novembre 2026. Les étapes sont validées une par une avant la suivante.

| Étape | Sujet | État |
|---|---|---|
| 0 | Décisions | Terminée et commitée |
| 1 | Fondations outillage | Terminée et commitée |
| 2 | Schéma de données et migration initiale | Terminée et commitée |
| 3 | Authentification et validation d'email | Terminée et commitée |
| 4 | Coquille de l'application et composants UI | Terminée et commitée |
| 5 | Promotions | Terminée et commitée |
| 6 | Groupes, invitations, départs | Terminée et commitée |
| 7 | Tâches et avancement | Terminée et commitée |
| 8 | Calendrier de la promotion | Terminée et commitée |
| 9 | Moteur de planification | Terminée et commitée |
| 10 | Calendrier de groupe, Mon calendrier, réunions | Terminée et commitée |
| 11 | Profil | Terminée sans commit (validée par lint, typecheck, tests unitaires et d'intégration) |
| 12 | Landing page | À faire |
| 13 | Durcissement et mise en production | À faire |

## Points en attente

- **Vérification navigateur à 375 px et 1280 px** : le calendrier mensuel (`/mon-calendrier`, `/groupes/[id]/calendrier`) n'a pas été contrôlé dans un navigateur.
- **Modification du profil à vérifier dans le navigateur** : `/profil` (prénom et nom, changement de mot de passe, session conservée via `signIn`) n'est testée que par les tests automatisés.
- **Table `meetings` non utilisée en v1** : les réunions sont calculées à la demande et jamais écrites en base. La table existe (§7) mais reste vide.
- **Limite de durée de 1000 jours** : fixée à l'étape 7 pour tenir dans la colonne, absente du cahier des charges. À valider.
- **Conflits rattachés au dernier jour de la tâche** : la projection `planning-view.ts` ne donne pas de jour par conflit. Interprétation retenue à l'étape 10 ; les conflits sans tâche planifiée sont listés dans « Conflits sans date ». Un vrai jour par conflit exigerait de l'ajouter à la projection.

## Écarts acceptés (étapes 9 et 10)

**Étape 9 — moteur de planification**

1. **Tâche en cours** : elle démarre aujourd'hui et n'attend plus ses dépendances, même si le groupe commence plus tard.
2. **Aval d'un cycle** : les tâches qui dépendent d'un cycle reçoivent `blocked_dependency` (en citant les tâches du cycle), et non `dependency_cycle`.
3. **Racines de blocage** : si une tâche intermédiaire est elle-même sans assigné, `blockedBy` cite aussi ce qui la bloque (par exemple `[root, mid]`).
4. **Erreurs sur entrée incohérente** : `planPromo` lève une erreur sur un groupe inconnu, une dépendance absente ou d'un autre groupe, ou un identifiant de tâche en double.
5. **« Aujourd'hui » en Africa/Lome** : `PLANNING_TIMEZONE = "Africa/Lome"` dans `lib/config.ts`. Le calcul de « aujourd'hui » à partir du fuseau est fait par le service (étape 10).

**Étape 10 — calendriers et réunions**

6. **Réunions calculées sans écriture en base** : elles sont projetées à la demande depuis le planning (voir « Points en attente »).

Aucun de ces écarts ne modifie le schéma ni les migrations.

---


## Contexte

Le dépôt est un squelette `create-next-app` (Next 16.4, React 19.3, Tailwind v4, pnpm, ESLint). Pas de Prisma, pas d'auth, pas de framework de test, pas de dossier `supabase/`. `.env.example` contient un `DATABASE_URL` PostgreSQL local. Pas d'`AGENTS.md`.

Objectif v1 (cahier §1) : chaque étudiant voit au même endroit tous ses projets, leur avancement et les deadlines à tenir.

**Contradiction bloquante relevée** : `CLAUDE.md` annonce *Supabase Auth + RLS + Supabase CLI en local*. Le cahier (§2, §8, §10.8) annonce *Prisma + Auth.js + PostgreSQL local*, et précise que Prisma contourne la RLS. L'état du dépôt (`DATABASE_URL` local, pas de `supabase/`) correspond au cahier. **Le plan ci-dessous suit le cahier**, avec la RLS activée sans policy en production (refus par défaut via l'API Supabase, Prisma accède avec son rôle serveur). Il faut une confirmation avant l'étape 1, puis mettre `CLAUDE.md` à jour.

## Principes transverses

- Couche **services** (`lib/services/*`) : seule à toucher Prisma, chaque fonction reçoit l'utilisateur courant et vérifie les droits (§8). Les server actions/route handlers ne font que valider (Zod) puis appeler un service.
- `lib/auth/guards.ts` : `requireUser()`, `requireVerifiedUser()` (relecture de `email_verified_at` en base à chaque appel, pas seulement dans le JWT), `requirePromoMember()`, `requireGroupLeader()`…
- Logique pure isolée et testée unitairement : génération de code, détection de cycles, avancement, planification.
- Chaque étape se termine par `pnpm lint`, `pnpm typecheck`, `pnpm test`, puis une validation par toi avant de passer à la suite.
- Toute migration de schéma t'est soumise avant d'être appliquée.

---

## Étape 0 — Décisions (aucun code)
Trancher les points listés en fin de document (au minimum : stack, jours calendaires/ouvrés, réunions). Mettre à jour `CLAUDE.md` et `docs/cahier-des-charges.md` en conséquence.

## Étape 1 — Fondations outillage
- **Fichiers** : `package.json` (scripts `typecheck`, `test`, `test:e2e`, `db:*`), `prisma/schema.prisma` (datasource seule), `prisma.config.ts`, `lib/db.ts` (singleton Prisma), `vitest.config.ts`, `app/globals.css` (palette en `@theme` Tailwind v4, suppression du dark mode par défaut), `app/layout.tsx` (police, `lang="fr"`), `.env.example` (`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, clé email), `README.md`.
- **Dépendances** : `prisma`, `@prisma/client`, `zod`, `vitest`, `@playwright/test` (plus tard).
- **Risques** : compatibilité Prisma ↔ Next 16/Turbopack (adapter driver, `serverExternalPackages`) ; `pnpm-workspace.yaml` bloque les scripts de build (`allowBuilds`) et il faudra autoriser `prisma`/`@prisma/engines` (et plus tard argon2/bcrypt).
- **Validation** : `pnpm dev` démarre, `prisma db pull`/`migrate status` se connecte à `milestone`, un test Vitest trivial passe, lint/typecheck OK.

## Étape 2 — Schéma de données + migration initiale (soumis à validation avant application)
- **Fichiers** : `prisma/schema.prisma`, `prisma/migrations/0001_init/migration.sql` (complété à la main), `prisma/seed.ts`.
- **Contenu** : les 11 tables du §7, enums (`PromoRole`, `GroupRole`, `InvitationStatus`, `TaskStatus`, `EmailTokenType`), `onDelete: Cascade` groupe → tâches/assignations/dépendances/invitations/réunions.
- **Contraintes en SQL brut** (Prisma ne sait pas les exprimer) :
  - index unique partiel : un seul `delegate` par promo, un seul `leader` par groupe ;
  - `promo_members.user_id` unique (une seule promo à la fois) ;
  - `CHECK` : `duration_days > 0`, `end_date >= start_date`, `margin_percent` entre 0 et 100, `task_id <> depends_on_task_id` ;
  - unicité `(group_id, invited_user_id)` pour les invitations `pending` ;
  - `ENABLE ROW LEVEL SECURITY` sur toutes les tables (aucune policy, donc refus par défaut pour `anon`/`authenticated` côté Supabase).
- **Risques** : drift Prisma sur les index partiels (à documenter, ne pas les recréer dans le schéma) ; incohérence du cahier `profiles.username` vs `users.username` (je retiens `users`) ; une RLS sans policy ne doit pas gêner Prisma en local (rôle propriétaire, à vérifier).
- **Validation** : `prisma migrate dev` passe sur une base vide ; tests d'intégration sur une base `milestone_test` : double délégué refusé, double chef refusé, deuxième promo refusée, auto-dépendance refusée.

## Étape 3 — Authentification et validation d'email
- **Fichiers** : `auth.ts` (Auth.js v5, Credentials, session JWT), `app/api/auth/[...nextauth]/route.ts`, `proxy.ts` (ex-`middleware.ts` sous Next 16 : redirections uniquement, pas de contrôle de sécurité), `lib/auth/password.ts` (argon2id ou bcrypt), `lib/auth/tokens.ts` (token aléatoire, stocké haché, expiration, usage unique), `lib/auth/guards.ts`, `lib/email/` (interface + transport console en dev, transport réel en prod), `lib/validation/auth.ts` (Zod), pages `app/(public)/inscription`, `connexion`, `app/verifier-email` (+ « Renvoyer le mail »), `app/verifier-email/[token]`, `mot-de-passe-oublie`, `reinitialiser/[token]`.
- **Risques** : le provider Credentials impose des sessions JWT, donc un `email_verified_at` périmé dans le token (d'où la relecture en base dans les guards) ; énumération d'utilisateurs (messages génériques en connexion et en réinitialisation) ; spam du renvoi de mail (limite de fréquence) ; course sur le username unique (on s'appuie sur la contrainte en base et on traduit l'erreur P2002).
- **Validation** : critères §11 n°1 à 3 (tests d'intégration et e2e) ; un token expiré ou déjà utilisé est rejeté ; le mot de passe est stocké haché.

## Étape 4 — Coquille de l'application et composants UI
- **Fichiers** : `app/(app)/layout.tsx` (garde `requireVerifiedUser`), `components/nav/Sidebar.tsx` + barre du haut mobile, `components/ui/{Button,Card,Input,ConfirmDialog,Badge,ProgressBar}.tsx`, `app/(app)/accueil/page.tsx` (vide pour l'instant).
- **Risques** : mélange Server/Client Components (dialogues et formulaires côté client, données côté serveur) ; responsive dès le départ.
- **Validation** : navigation Accueil / Promo / Mon calendrier / Profil utilisable sur desktop et en 375 px de large ; un utilisateur non validé est renvoyé vers `/verifier-email`.

## Étape 5 — Promotions
- **Fichiers** : `lib/services/promo.ts`, `lib/promo-code.ts` (CSPRNG, alphabet sans caractères ambigus, ~10 caractères), `app/(app)/promo/{creer,rejoindre}/page.tsx`, `app/(app)/promo/page.tsx` (membres, groupes, code visible du délégué), `app/(app)/promo/gestion/page.tsx`, actions associées.
- **Règles** : création → délégué ; rejoindre par code ; quitter (membre) ; le délégué doit d'abord faire une passation ; quitter la promo fait quitter tous les groupes de cette promo selon §4.4.
- **Risques** : un chef de groupe qui quitte la promo (successeur requis ? voir questions) ; concurrence sur « rejoindre » (gérée par la contrainte unique) ; collision de code (on régénère).
- **Validation** : critères §11 n°4 et 5 ; un non-membre ne voit rien de la promo (test de service).

## Étape 6 — Groupes, invitations, départs
- **Fichiers** : `lib/services/group.ts`, `lib/services/invitation.ts`, `app/(app)/groupes/creer/page.tsx`, `app/(app)/groupes/[id]/{layout,page,membres/page,parametres/page}.tsx`, encart des invitations sur l'accueil.
- **Règles** : invitation par username d'un membre de la même promo ; accepter/refuser ; départ d'un membre (tâches où il était seul assigné → non assignées) ; départ du chef avec successeur obligatoire ; suppression par le chef avec confirmation ; groupe vide supprimé automatiquement (dans la même transaction que le départ).
- **Risques** : les règles §4.4 doivent tenir dans une seule transaction ; vérifier les droits sur chaque action (IDs manipulés dans l'URL).
- **Validation** : critères §11 n°6, 7 et 8 ; un non-chef qui appelle l'action de suppression reçoit un refus.

## Étape 7 — Tâches et avancement
- **Fichiers** : `lib/services/task.ts`, `lib/domain/dependencies.ts` (détection de cycle par DFS, fonction pure), `lib/domain/progress.ts`, `app/(app)/groupes/[id]/taches/{page,[taskId]/page}.tsx`, badge « non assignée ».
- **Risques** : cycles introduits en concurrence (revérifier dans la transaction) ; dépendance vers une tâche d'un autre groupe (refusée) ; droits d'édition (qui peut modifier une tâche : chef seulement, statut pour tous).
- **Validation** : tests unitaires sur les cycles et l'avancement au prorata ; changement de statut par un membre ; tâche non assignée visible.

## Étape 8 — Calendrier de la promotion
- **Fichiers** : `components/calendar/PromoTimeline.tsx` (grille CSS maison, sans bibliothèque), `lib/services/calendar.ts`, intégration à `app/(app)/promo/page.tsx`.
- **Risques** : lisibilité sur mobile (défilement horizontal limité à la frise) ; fuseaux horaires (stocker des dates `DATE`, pas des `timestamp`).
- **Validation** : critère §11 n°9 ; un clic sur une barre ouvre le groupe ; les deadlines sont visibles.

## Étape 9 — Moteur de planification (logique pure)
- **Fichiers** : `lib/planning/{cpm.ts,prioritize.ts,assign.ts,conflicts.ts,index.ts}`, `lib/planning/__tests__/*`.
- **Approche** : entrée = toutes les tâches de tous les groupes de la promo, avec la deadline du groupe (`end_date`) et la marge du groupe. 1) durée effective = `ceil(durée × (1 + marge))` ; 2) dates au plus tôt (CPM, tri topologique) ; 3) tri par deadline puis par marge restante ; 4) placement jour par jour par étudiant (un étudiant porte au plus une charge d'un jour à la fois, répartie si plusieurs tâches) ; 5) conflits : deadline intenable, tâche sans assigné. Calcul à la demande, sans persistance en v1 (pas de changement de schéma).
- **Risques** : le plus gros chantier ; la règle « deadlines similaires » n'est pas définie (seuil à fixer) ; jours calendaires ou ouvrés ; tâches multi-assignées (tous les assignés occupés en parallèle ?).
- **Validation** : jeu de tests de scénarios (chevauchement de deux groupes, chaîne de dépendances, deadline intenable, tâche non assignée) ; critère §11 n°10.

## Étape 10 — Calendrier de groupe, Mon calendrier, réunions
- **Fichiers** : `components/calendar/{GroupCalendar,PersonalCalendar}.tsx`, `lib/services/meeting.ts`, `app/(app)/groupes/[id]/calendrier/page.tsx`, `app/(app)/mon-calendrier/page.tsx`.
- **Réunions** : une tâche multi-assignée génère une réunion placée sur un créneau libre commun issu du planning ; une tâche mono-assignée n'en génère aucune ; régénération quand les assignés changent.
- **Risques** : sans emploi du temps importé (hors périmètre), la « disponibilité » se réduit à « pas occupé par une autre tâche planifiée », avec un grain journalier : la granularité de la réunion est à trancher.
- **Validation** : critère §11 n°11 ; un membre ne voit que les calendriers de ses groupes.

## Étape 11 — Profil
- **Fichiers** : `app/(app)/profil/page.tsx`, `lib/services/user.ts`.
- **Validation** : username non modifiable (refus côté serveur aussi) ; changement de mot de passe avec l'ancien mot de passe.

## Étape 12 — Landing page
- **Fichiers** : `app/(public)/page.tsx`, `components/landing/*`, `public/` (visuels).
- **Risques** : ne rien reprendre de la marque de la vidéo de référence ; les témoignages de la section avis doivent être réels ou présentés clairement comme des exemples.
- **Validation** : rendu desktop et mobile, liens vers l'inscription et la connexion.

## Étape 13 — Durcissement et mise en production
- Audit de chaque server action (guard + Zod), e2e Playwright couvrant les 11 critères du §11, déploiement (`prisma migrate deploy` avec `DIRECT_URL`), vérification de la RLS activée sur Supabase.

---

## Vérification globale
- `pnpm lint && pnpm typecheck && pnpm test` à chaque étape ; `pnpm test:e2e` à partir de l'étape 3.
- Tests d'intégration sur une base `milestone_test` dédiée (réinitialisée entre les suites).
- À la fin : les 11 critères d'acceptation du §11 couverts chacun par au moins un test nommé.

---

## Décisions validées (remplacent les questions ci-dessous)

1. **Stack** : Prisma + Auth.js + PostgreSQL local (dev), Supabase (prod). Mise à jour de `CLAUDE.md` : on retire Supabase Auth et `supabase start`, et la RLS devient « activée sur toutes les tables, sans policy ». La règle « ne jamais désactiver la RLS » est conservée.
2. **Jours** : calendaires, week-ends inclus.
3. **Marge** : entre 0 et 100 %, durée effective = `ceil(durée × (1 + marge/100))`.
4. **Avancement** : au prorata de la durée saisie, sans la marge. Une tâche « en cours » compte pour 0 %.
5. **Deadline d'une tâche** : la date de fin du groupe.
6. **Email** : Brevo (API transactionnelle via `fetch`, sans SDK). Je relève le nom de la variable dans `.env` sans lire sa valeur, puis je l'ajoute vide à `.env.example`. En dev, on garde l'option du transport console.
7. **Suppression de la promo** : confirmation, puis tous les membres quittent la promo et tous ses groupes sont supprimés, dans une seule transaction.
8. **Chef qui quitte la promo** : il doit d'abord nommer un successeur dans chacun de ses groupes, sinon le départ est refusé (vérification côté serveur).
9. **Édition des tâches** : seul le chef modifie le titre, la durée, les dépendances et les assignations. Les membres changent seulement le statut.
10. **Réunions** : grain d'un jour, sans emploi du temps importé. La réunion tombe le premier jour où tous les assignés sont libres dans le planning, dans la fenêtre de la tâche.

**Propositions les plus simples retenues (à noter dans le cahier)** :
- Invitation par nom d'utilisateur uniquement.
- Hébergement : Vercel + Supabase.
- Changement de deadline : planning recalculé à la demande, sans notification en v1, donc sans table supplémentaire.
- « Deadlines similaires » = même date de fin. Le départage se fait sur la charge restante.
- Vue personnelle (§5.3) : validée et incluse en v1.
- Un étudiant fait au plus une tâche par jour (mise en file). Une tâche multi-assignée occupe tous ses assignés en parallèle.
- `users.username` (et non `profiles.username`).

**Étape 0 révisée** : mettre à jour `CLAUDE.md` (stack, RLS, commande de base locale, Brevo) et `docs/cahier-des-charges.md` (section 10 transformée en « Décisions », plus les propositions ci-dessus), puis te soumettre ces modifications avant l'étape 1.

---

## (Historique) Points qui étaient ouverts

### Section 10 du cahier
1. **Marge de 20 %** réglable par le chef : bornes (0–100 % ?) et arrondi de la durée (je propose l'arrondi au jour supérieur).
2. **Avancement au prorata des jours** : sur la durée saisie ou la durée avec marge ? Une tâche « en cours » compte-t-elle à 0 % ou partiellement ?
3. **Jours calendaires ou ouvrés** : cela change le CPM, les calendriers et la détection des conflits. Bloquant pour l'étape 9.
4. **Changement de deadline** : le recalcul est immédiat si le planning est calculé à la demande. En revanche, la « notification au groupe » suppose une table de notifications qui n'existe pas dans le §7, donc un changement de schéma.
5. **Invitation par email** : une invitation par email vers un compte inexistant obligerait à gérer des invitations en attente d'inscription. Je propose le username uniquement en v1.
6. **Hébergement** : Vercel + Supabase ou autre ?
7. **Service d'email** : Resend, Brevo ou autre ? Il me faut un compte et un domaine d'envoi pour la production (en dev, transport console).
8. **Auth.js à la place de Supabase Auth** : contredit `CLAUDE.md` (voir ci-dessous).

### Autres ambiguïtés relevées dans le cahier et `CLAUDE.md`
- **Stack** : `CLAUDE.md` (Supabase Auth, RLS, `supabase start`) contre le cahier (Prisma, Auth.js, PostgreSQL local). Bloquant pour l'étape 1.
- **Disponibilité pour les réunions** : sans emploi du temps (hors périmètre), sur quoi repose la disponibilité ? Et quel grain : un jour ou un créneau horaire ?
- **Deadline d'une tâche** : il n'y a pas de deadline par tâche, je propose la date de fin du groupe. Faut-il plutôt la date de fin du groupe moins les tâches dépendantes (CPM arrière) ?
- **« Deadlines similaires »** : quel écart en jours ?
- **Suppression de la promo** : elle figure sur la page « Gestion délégué » mais aucune règle ne la décrit (sort des groupes, confirmation).
- **Un chef de groupe qui quitte la promo** : doit-il d'abord nommer un successeur dans chacun de ses groupes ?
- **Édition des tâches** : seul le chef crée et assigne. Un membre peut-il modifier le titre, la durée ou les dépendances, ou seulement le statut ?
- **Vue personnelle (§5.3)** marquée « à valider », alors que l'algorithme s'appuie dessus.
- **Membres d'une tâche** : un étudiant assigné à plusieurs tâches le même jour, ses tâches sont-elles réparties sur la journée ou mises en file ?
