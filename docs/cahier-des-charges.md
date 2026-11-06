# Cahier des charges : Milestone

Version 1.1, 5 novembre 2026

---

## 1. Présentation

Milestone est une application web qui aide les étudiants d'une même promotion à planifier leurs projets de groupe. Plusieurs enseignants peuvent donner des projets en même temps, avec des deadlines différentes. Un étudiant peut donc avoir plusieurs groupes et plusieurs deadlines qui se chevauchent.

L'application ne planifie pas par groupe, mais **par étudiant, sur toute la promotion**. Elle repère les conflits de disponibilité et propose un ordre de travail réaliste.

**Objectif de la v1** : chaque étudiant de la promotion voit, dans un seul endroit, tous ses projets, leur avancement et les deadlines à tenir.

---

## 2. Stack technique

- **Frontend et backend** : Next.js (App Router), TypeScript, Tailwind CSS. Les route handlers et les server actions assurent le backend. Il n'y a pas de service Python en v1.
- **Base de données** : PostgreSQL, géré avec **Prisma** (schéma et migrations).
- **Authentification** : **Auth.js** (NextAuth), avec connexion par email et mot de passe. Auth.js fonctionne avec une base locale comme avec Supabase, contrairement à Supabase Auth.
- **Environnements** :
  - **Développement** : PostgreSQL local. `DATABASE_URL` dans le fichier `.env`.
  - **Production** : Supabase (PostgreSQL). `DATABASE_URL` (connexion poolée) et `DIRECT_URL` (connexion directe, utilisée pour les migrations) dans les variables d'environnement de l'hébergeur.
  - Les migrations se lancent avec `prisma migrate dev` en local et `prisma migrate deploy` en production.
  - Le fichier `.env` n'est jamais versionné. Un fichier `.env.example`, sans secrets, l'est.
- **Envoi d'emails** : Gmail SMTP (nodemailer, variables `SMTP_*` et `MAIL_FROM`), activé par `ENVIRONMENT=production`, pour l'email de validation et de réinitialisation du mot de passe. Console en développement et pendant les tests (voir décision 18).
- **Validation des données** : Zod, côté serveur, pour les formulaires et les actions.
- **Hébergement** : Vercel pour l'application, Supabase pour la base.
- **RLS** : activée sur toutes les tables, sans policy (refus par défaut via l'API Supabase).

---

## 3. Glossaire

| Terme | Définition |
|---|---|
| **Promotion (promo)** | Ensemble d'étudiants d'une même classe. Un étudiant ne peut appartenir qu'à une seule promo à la fois. |
| **Code promo** | Code unique généré à la création de la promo. Seul moyen de rejoindre une promo. |
| **Délégué** | Étudiant qui a créé la promo. Gère la promo (code, passation). N'a aucun pouvoir sur les groupes. |
| **Groupe** | Équivalent d'un projet. Créé par n'importe quel étudiant de la promo. Possède une date de début, une date de fin, des tâches et un calendrier. |
| **Chef de groupe** | Étudiant qui a créé le groupe. Invite les membres, crée les tâches, les assigne et peut supprimer le groupe. |
| **Membre** | Étudiant qui a accepté l'invitation d'un groupe. |
| **Tâche** | Unité de travail d'un groupe, avec une durée en jours et éventuellement des dépendances. |
| **Jour** | Unité de durée de l'application. Il inclut les cours : une tâche de 3 jours signifie « 3 jours avec les cours », pas 72 heures de travail. |

---

## 4. Règles métier

### 4.1 Comptes et authentification

- Inscription avec : **nom d'utilisateur**, **prénom**, **nom**, **adresse email**, **mot de passe**.
- **Nom d'utilisateur unique** dans toute l'application. Vérifié à l'inscription et contraint en base.
- **Mot de passe** : 8 caractères minimum.
- **Email obligatoire** : un email de validation est envoyé. Tant que l'adresse n'est pas validée, l'utilisateur ne peut effectuer aucune action (rejoindre une promo, créer un groupe, etc.). Il voit seulement une page lui demandant de valider son email, avec un bouton pour renvoyer le mail.
- Un étudiant a **un seul compte**.

### 4.2 Promotions

- **Création** : tout utilisateur validé peut créer une promo. Il en devient automatiquement le **délégué**.
- **Code promo** : généré à la création, unique et non devinable. Affiché au délégué pour qu'il le partage à sa classe.
- **Rejoindre** : l'étudiant saisit le code et clique sur « Rejoindre ». Il n'existe aucune liste publique de promotions.
- **Un étudiant ne peut être que dans une seule promo à la fois.** Pour changer de promo, il doit d'abord quitter la précédente.
- **Quitter la promo** : chaque étudiant peut quitter quand il le souhaite.
  - Un **membre** qui quitte la promo perd l'accès à ses groupes de cette promo. Ses tâches sont traitées selon la règle 4.4.
  - Le **délégué** ne peut quitter qu'après avoir nommé un successeur parmi les membres de la promo. Le successeur devient délégué.
  - Un **chef de groupe** ne peut quitter la promo qu'après avoir nommé un successeur dans chacun de ses groupes.
- **Passation** : le délégué choisit un membre, qui reçoit le rôle immédiatement.
- **Suppression de la promo** : par le délégué, après confirmation. Tous les membres quittent la promo et tous ses groupes sont supprimés (tâches, assignations, dépendances, réunions comprises).

### 4.3 Groupes (projets)

- **Création** : tout étudiant de la promo peut créer un groupe. Il en devient automatiquement le **chef**.
- **Informations à saisir** : nom du groupe, date de début, date de fin.
- **Invitations** : le chef invite des étudiants de la promo, par nom d'utilisateur uniquement. L'invité accepte ou refuse. Un étudiant ne rejoint un groupe qu'après acceptation.
- **Un étudiant peut être dans plusieurs groupes** de la même promo. C'est le cœur de l'application.
- **Suppression** : seul le chef du groupe peut supprimer le groupe. La suppression efface toutes les tâches, assignations et dépendances. L'application demande une confirmation explicite avant suppression.
- **Un groupe sans membre** est supprimé automatiquement.

### 4.4 Départs et passations dans un groupe

**Un membre (non chef) quitte le groupe :**
- Ses tâches partagées avec d'autres membres restent assignées à ces autres membres.
- Ses tâches où il était **seul assigné** deviennent « non assignées ». Le chef doit les attribuer à quelqu'un.

**Le chef quitte le groupe :**
- Il doit obligatoirement nommer un successeur parmi les membres, qui devient chef.
- Le successeur reprend les responsabilités du chef, dont l'attribution des tâches devenues non assignées.
- Un chef ne peut pas quitter un groupe dont il est le dernier membre sans le supprimer.

### 4.5 Tâches

- Chaque tâche a : **titre**, **durée en jours**, **assignés** (un ou plusieurs membres), **dépendances** (zéro, une ou plusieurs autres tâches du même groupe).
- La durée est saisie par l'étudiant, en jours, cours inclus. L'application ne demande pas d'heures. C'est un nombre entier compris entre **1 et 1000 jours** ; une durée hors de ces bornes est refusée.
- **Une tâche assignée à une seule personne** : aucune réunion n'est créée.
- **Une tâche assignée à plusieurs personnes** : l'application propose un jour de réunion qui tient compte de la disponibilité de chacun. Le grain est d'un jour, sans emploi du temps importé : la réunion tombe le premier jour, dans la fenêtre de la tâche, où aucun assigné n'est occupé par une autre tâche planifiée.
- **Dépendances** : une tâche ne peut être planifiée qu'une fois toutes ses dépendances terminées. Une dépendance circulaire est refusée.
- **Statut** : à faire, en cours, terminée.

### 4.6 Planification

La planification se fait **par étudiant, sur toute la promotion**. Elle tient compte de toutes les tâches de tous les groupes auxquels l'étudiant appartient.

Règles de priorité lorsque deux projets se chevauchent :
- **Deadlines proches** : la tâche dont la deadline est la plus proche passe en premier.
- **Deadlines similaires** : la charge est répartie le plus équitablement possible entre les tâches et les étudiants.

**Marge de sécurité** : la marge est définie **au niveau du groupe** (`groups.margin_percent`, 20 % par défaut) et s'applique à la durée saisie de chacune de ses tâches ; il n'existe pas de marge par tâche. Seul le chef du groupe la règle, par un nombre entier entre 0 et 100 %. 0 % signifie « pas de marge ». Durée effective = ⌈durée × (100 + marge) / 100⌉, arrondie au jour supérieur (décision 19).

**Deadline d'une tâche** : la date de fin de son groupe. Deux deadlines sont « similaires » lorsqu'elles tombent à la même date ; le départage se fait alors sur la charge restante.

**Charge par étudiant** : un étudiant fait au plus une tâche par jour (les tâches sont mises en file). Une tâche assignée à plusieurs personnes occupe tous ses assignés en parallèle.

**Algorithme v1** :
1. Calculer les dates au plus tôt de chaque tâche, en respectant les dépendances (méthode du chemin critique).
2. Trier les tâches par urgence (deadline la plus proche d'abord, avec une pondération de la charge).
3. Affecter les tâches aux étudiants disponibles.
4. Signaler les conflits : une deadline qui ne peut pas être tenue, ou une tâche sans assigné.

**Affichage des conflits** : dans les calendriers (§5.2, §5.3), un conflit est rattaché au **dernier jour de sa tâche planifiée** (sa fin prévue). Un conflit dont la tâche ne peut pas être planifiée (sans assigné, dépendance bloquée ou circulaire) n'a pas de jour : il est listé à part, dans « Conflits sans date ».

Un solveur (OR-Tools) n'est pas prévu en v1.

### 4.7 Avancement d'un groupe

- Chaque tâche a un statut. L'avancement du groupe est calculé à partir des tâches terminées, **au prorata des jours** de la durée saisie, sans la marge. Une tâche de 3 jours pèse trois fois plus qu'une tâche de 1 jour. Une tâche « en cours » compte pour 0 %.
- Le chef et les membres peuvent changer le statut d'une tâche.
- Seul le chef modifie le titre, la durée, les dépendances et les assignations d'une tâche.

---

## 5. Calendriers

### 5.1 Calendrier de la promotion

- Visible par tous les membres de la promotion.
- Chaque groupe est affiché comme **une barre horizontale**, de la date de début à la date de fin.
- La barre est **remplie** selon l'avancement du groupe (ex. une barre remplie à 40 % = 40 % du projet réalisé).
- Un clic sur la barre ouvre le groupe.
- Les deadlines de chaque groupe sont visibles.

### 5.2 Calendrier d'un groupe

- Visible uniquement par les membres du groupe.
- Affiche les tâches planifiées, leur assigné, les réunions et les deadlines.
- La deadline est un repère (drapeau et nom court du groupe) sur le jour de fin du groupe ; plusieurs deadlines le même jour s'empilent.
- Une tâche qui dépasse la deadline de son groupe est coupée : la partie jusqu'à la deadline garde la couleur habituelle, la partie qui déborde est en rouge d'alerte (§6.1) ; entièrement rouge si elle commence après la deadline.
- Chaque groupe a **son propre calendrier**.

### 5.3 Vue personnelle

- Chaque étudiant voit l'ensemble de ses groupes et de ses tâches, sur un seul calendrier, pour éviter les conflits. C'est la vue sur laquelle l'algorithme de planification s'appuie.
- Chaque repère de deadline indique le groupe concerné ; les dépassements sont affichés comme au §5.2.

---

## 6. Interfaces

### 6.1 Charte graphique

**Palette** (à utiliser partout) :

| Couleur | Usage |
|---|---|
| `#fffcf2` | Fond principal |
| `#ccc5b9` | Bordures, cartes secondaires, fond de barres vides |
| `#403d39` | Texte secondaire, icônes |
| `#252422` | Texte principal, titres, boutons secondaires |
| `#eb5e28` | Boutons principaux, barres d'avancement, accents |

**Exception : couleur d'alerte** (`--color-alert`, `#c1121f`, et sa teinte douce `--color-alert-soft`). La palette ci-dessus n'a pas de rouge, or les dépassements de deadline doivent être immédiatement visibles dans les calendriers. Ce rouge est réservé aux **retards** : partie d'une tâche qui dépasse la deadline de son groupe, et badge « j de retard ». Les repères de deadline restent dans la palette (texte `#252422` sur `#ccc5b9` à 20 %). Il ne sert à aucun autre usage (pas de bouton, de bordure ni d'erreur de formulaire).

**Typographie** : sans-serif moderne, titres en gras et grands, texte courant en taille standard.

**Formes** : coins arrondis, ombres douces, cartes légèrement surélevées.

### 6.2 Landing page

Style inspiré d'une vidéo de référence :
- Fond clair, grand titre centré et en gras, sous-titre court en gris.
- **Barre de navigation** arrondie et flottante en haut, avec le logo, les liens (Fonctionnalités, Comment ça marche) et deux boutons : « Se connecter » et « Créer une promo ».
- **Section principale** : titre d'accroche, sous-titre, bouton d'appel à l'action orange (`#eb5e28`).
- **Éléments flottants** : cartes d'aperçu de l'application (calendrier de promo, barre de groupe) légèrement inclinées, avec ombre douce.
- **Section avis** : carte centrée avec un témoignage et des flèches de navigation.
- **Footer** : présentation courte, liens, et le nom de l'application en très grand en bas de page, en couleur `#eb5e28` atténuée.
- Pas de copie de la marque de la vidéo de référence.

### 6.3 Pages

| Page | Accès | Contenu |
|---|---|---|
| **Landing** | Public | Présentation, boutons vers inscription et connexion. |
| **Inscription** | Public | Formulaire : nom d'utilisateur, prénom, nom, email, mot de passe. |
| **Connexion** | Public | Email et mot de passe. |
| **Validation email** | Connecté, email non validé | Message explicatif et bouton « Renvoyer le mail ». |
| **Accueil** | Connecté, email validé | Promo actuelle, liste des groupes de l'étudiant, invitations en attente, boutons « Créer un groupe » et « Rejoindre une promo » (si aucune promo). |
| **Rejoindre une promo** | Connecté, sans promo | Champ de code et bouton « Rejoindre ». |
| **Créer une promo** | Connecté, sans promo | Nom de la promo. Affiche le code généré après création. |
| **Promo** | Membre de la promo | Calendrier général (section 5.1), code de la promo (visible par le délégué), liste des membres, groupes de la promo. Bouton « Quitter la promo ». |
| **Gestion délégué** | Délégué | Code, membres, passation de délégation, suppression de la promo. |
| **Créer un groupe** | Membre de la promo | Nom, date de début, date de fin. |
| **Groupe** | Membre du groupe | Calendrier du groupe (section 5.2), barre d'avancement, liste des tâches, membres, invitations. |
| **Tâche** | Membre du groupe | Titre, durée en jours, assignés, dépendances, statut. |
| **Mon calendrier** | Membre de la promo | Vue personnelle (section 5.3). |
| **Paramètres du groupe** | Chef du groupe | Modifier le nom et les dates, régler la marge, supprimer le groupe, nommer un successeur. |
| **Profil** | Connecté | Nom, prénom, nom d'utilisateur (non modifiable), email, changement de mot de passe. |

### 6.4 Navigation

- Barre latérale (ou barre du haut sur mobile) : Accueil, Promo, Mon calendrier, Profil.
- Dans un groupe : sous-navigation Calendrier, Tâches, Membres, Paramètres (chef uniquement).
- Responsive : utilisable sur téléphone.

### 6.5 Interactions importantes

- **Action destructive** (supprimer un groupe, quitter la promo en tant que délégué) : fenêtre de confirmation qui précise les conséquences.
- **Invitation** : notification visible sur l'accueil.
- **Tâche non assignée** : badge d'alerte visible sur le groupe et pour le chef.

---

## 7. Modèle de données (résumé)

- **users** : id, username (unique), first_name, last_name, email (unique), password_hash, email_verified_at (vide tant que l'email n'est pas validé).
- **email_tokens** : user_id, token_hash, type (`verify_email` ou `reset_password`), expires_at, used_at.
- **promos** : id, name, code (unique), created_by.
- **promo_members** : promo_id, user_id, role (`delegate` ou `member`). Un user ne peut avoir qu'une ligne active.
- **groups** : id, promo_id, name, start_date, end_date, created_by, margin_percent (défaut 20).
- **group_members** : group_id, user_id, role (`leader` ou `member`).
- **group_invitations** : group_id, invited_user_id, status (`pending`, `accepted`, `declined`).
- **tasks** : id, group_id, title, duration_days, status, created_by.
- **task_assignments** : task_id, user_id.
- **task_dependencies** : task_id, depends_on_task_id.
- **meetings** : id, task_id, starts_at, ends_at.

**Contraintes importantes** :
- Unicité : `users.username`, `users.email`, `promos.code`.
- Un seul rôle `delegate` par promo.
- Un seul `leader` par groupe.
- Un user n'a qu'une promo active à la fois.

---

## 8. Sécurité

- **Les règles d'accès sont appliquées dans le code serveur** (services dédiés), pas dans l'interface. Prisma se connecte à la base avec un rôle qui contourne la RLS de Supabase : la RLS ne doit donc pas être la seule protection.
- Un étudiant ne lit que les données de sa promo et de ses groupes.
- Seul le chef peut modifier, inviter, supprimer un groupe.
- Seul le délégué peut gérer la promo.
- Les actions sensibles (suppression, passation) sont vérifiées côté serveur à chaque appel.
- Email validé obligatoire avant toute action : vérifié côté serveur à chaque requête.
- Mot de passe minimum 8 caractères, vérifié avec Zod. Stocké haché (bcrypt ou argon2), jamais en clair.
- Les tokens de validation et de réinitialisation expirent et ne servent qu'une fois.
- Les secrets (`DATABASE_URL`, clés d'envoi d'emails, secret Auth.js) ne sont jamais dans le code ni dans Git.

---

## 9. Hors périmètre v1

- Import automatique d'emploi du temps.
- Notifications email et push (les notifications restent dans l'application).
- Application mobile native.
- Solveur d'optimisation (OR-Tools).
- Historique d'estimations pour corriger la marge.
- Messagerie interne.

---

## 10. Décisions (4 novembre 2026)

1. **Marge** : 20 % par défaut, réglable par le chef entre 0 et 100 %. Durée effective arrondie au jour supérieur.
2. **Barre d'avancement** : au prorata de la durée saisie, sans la marge. Une tâche en cours compte pour 0 %.
3. **Jours** : calendaires, week-ends inclus, parce que la promo suit les cours tous les jours.
4. **Changement de deadline** : la planification est recalculée à la demande, donc tout de suite. Pas de notification en v1.
5. **Invitation** : par nom d'utilisateur uniquement.
6. **Hébergement** : Vercel + Supabase.
7. **Envoi d'emails** : Brevo. *Remplacée par la décision 18 (5 novembre 2026).*
8. **Auth.js** : retenu à la place de Supabase Auth. Le mot de passe et la validation d'email sont gérés par l'application.
9. **Deadline d'une tâche** : la date de fin du groupe. Deadlines « similaires » = même date.
10. **Suppression de la promo** : confirmation, puis les membres quittent la promo et les groupes sont supprimés.
11. **Chef qui quitte la promo** : il nomme d'abord un successeur dans chacun de ses groupes.
12. **Édition des tâches** : seul le chef modifie le titre, la durée, les dépendances et les assignations. Les membres changent seulement le statut.
13. **Réunions** : grain d'un jour, sans emploi du temps importé.
14. **Charge** : un étudiant fait au plus une tâche par jour. Une tâche multi-assignée occupe tous ses assignés en parallèle.
15. **Vue personnelle** (§5.3) : incluse en v1.
16. **Durée d'une tâche** : entre 1 et 1000 jours (borne technique, bien au-delà de la durée d'un projet).
17. **Conflits dans les calendriers** : rattachés au dernier jour de la tâche planifiée ; sans tâche planifiée, listés dans « Conflits sans date ».

### Décision du 5 novembre 2026

18. **Envoi d'emails : Gmail SMTP à la place de Brevo** (remplace la décision 7). L'envoi passe par SMTP (`smtp.gmail.com`, port 587 en STARTTLS, mot de passe d'application) avec nodemailer. Le transport est choisi par `ENVIRONMENT` : SMTP si la valeur est exactement `production`, console sinon ; les tests imposent toujours la console. `MAIL_FROM` utilise la même adresse que `SMTP_USER`. Le transport Brevo et les variables `BREVO_API_KEY` et `EMAIL_TRANSPORT` sont supprimés. Conséquence : limite Gmail de 500 destinataires par jour ; au-delà, l'utilisateur voit « Le quota d'envoi quotidien est atteint. Réessayez demain. ».

### Décision du 6 novembre 2026

19. **Marge au niveau du groupe uniquement** (précise la décision 1). La marge de sécurité est stockée dans `groups.margin_percent` (défaut 20) et le moteur de planification n'utilise que cette valeur. Il n'existe **aucune marge par tâche**, ni dans l'interface, ni dans la validation, ni dans le moteur. Le chef du groupe la règle dans les paramètres du groupe, par un nombre entier de 0 à 100 %, et aucun autre membre ne peut la modifier ; la validation et le contrôle du rôle sont faits côté serveur à chaque appel. **0 % = pas de marge** : la durée effective est alors égale à la durée saisie. Durée effective = ⌈durée × (100 + marge) / 100⌉. Pas de changement de schéma ni de migration.

---

## 11. Critères d'acceptation

- Un utilisateur non validé ne peut rien faire d'autre que valider son email.
- Un nom d'utilisateur déjà pris est refusé.
- Un mot de passe de moins de 8 caractères est refusé.
- Un étudiant ne peut pas rejoindre une deuxième promo tant qu'il est dans la première.
- Le délégué ne peut pas quitter la promo sans avoir nommé un successeur.
- Le chef ne peut pas quitter le groupe sans avoir nommé un successeur.
- Une tâche sans assigné après le départ d'un membre apparaît comme non assignée.
- Seul le chef peut supprimer le groupe, après confirmation.
- La barre du calendrier de promo se remplit selon l'avancement du groupe.
- Une tâche ne peut pas être planifiée avant ses dépendances.
- Une tâche assignée à plusieurs personnes génère une réunion, pas une tâche assignée à une seule.