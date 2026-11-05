# Déploiement de Milestone (Vercel + Supabase)

Procédure de mise en production de la v1. L'application tourne sur Vercel, la base sur Supabase (PostgreSQL uniquement : Supabase Auth n'est pas utilisé).

Règles absolues :

- En production, les migrations passent **uniquement** par `prisma migrate deploy`, avec `DIRECT_URL`.
- Ne **jamais** lancer `prisma migrate dev`, `prisma migrate reset`, `prisma db push` ni `prisma db seed` sur la base de production. Ces commandes peuvent recréer ou vider la base.
- Ne jamais désactiver la RLS.
- Aucune valeur secrète dans Git, dans ce document ou dans `.env.example`.

---

## 1. Variables d'environnement (Vercel → Settings → Environment Variables)

À définir pour l'environnement **Production**. Les valeurs ne figurent nulle part dans le dépôt.

| Variable | Rôle | Remarque |
|---|---|---|
| `DATABASE_URL` | Connexion **poolée** Supabase (Supavisor, port 6543), utilisée par l'application | Mode transaction. Avec l'adaptateur `@prisma/adapter-pg`, vérifier sur la préproduction qu'aucun paramètre supplémentaire n'est requis |
| `DIRECT_URL` | Connexion **directe** Supabase (port 5432), utilisée seulement par `prisma migrate deploy` | `prisma.config.ts` la prend en priorité sur `DATABASE_URL` |
| `AUTH_SECRET` | Secret de signature des JWT Auth.js | Générer avec `npx auth secret`, propre à la production |
| `BREVO_API_KEY` | Clé de l'API transactionnelle Brevo | Clé dédiée à la production |
| `MAIL_FROM` | Expéditeur, ex. `Milestone <no-reply@domaine.fr>` | L'adresse doit être validée dans Brevo |
| `APP_URL` | URL publique, ex. `https://milestone.example.com` | Obligatoire : les liens des emails en dépendent (l'en-tête Host n'est jamais utilisé) |
| `EMAIL_TRANSPORT` | `brevo` | En production, Brevo est utilisé de toute façon ; la variable rend le choix explicite |
| `PLANNING_TIMEZONE` | Fuseau qui définit « aujourd'hui » pour la planification | `Africa/Lome` si vide ; une valeur invalide est refusée |

Ne **pas** définir en production : `TEST_DATABASE_URL`, `EMAIL_OUTBOX_FILE`, `NEXT_DIST_DIR`.

## 2. Build sur Vercel

Le client Prisma est généré dans `generated/prisma`, qui n'est pas versionné. La commande de build Vercel doit donc le générer :

```
pnpm exec prisma generate && pnpm build
```

(Réglage « Build Command » du projet Vercel. Alternative à valider : un script `postinstall: prisma generate` dans `package.json`.)

Vérifier en local avant de déployer : `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`.

`pnpm test:e2e` (Playwright, `e2e/criteres.spec.ts`, un scénario par critère du §11) lance son propre `next dev` sur le port 3100 (dossier `.next-e2e`), sur la base `milestone_test`, avec le transport d'email console : les liens de validation sont lus dans `.e2e/outbox.jsonl`, jamais dans de vrais mails. Navigateur : Chrome installé sur la machine (`channel: "chrome"`), sans téléchargement ; `E2E_BROWSER_CHANNEL` permet d'en choisir un autre (ex. `msedge`).

## 3. Migrations

Depuis un poste de confiance, avec **uniquement** les variables de production nécessaires dans l'environnement du shell (pas dans `.env`) :

```bash
# DIRECT_URL = connexion directe Supabase (port 5432)
DIRECT_URL="…" pnpm exec prisma migrate status   # lecture seule : migrations en attente
DIRECT_URL="…" pnpm exec prisma migrate deploy   # applique les migrations versionnées
```

- `prisma.config.ts` utilise `DIRECT_URL` en priorité : la connexion poolée n'est jamais utilisée pour migrer.
- `migrate deploy` n'applique que les fichiers de `prisma/migrations`, sans base shadow, sans reset et sans seed.
- En cas d'échec, ne pas relancer avec une autre commande : lire l'erreur, corriger la migration en local, puis utiliser `prisma migrate resolve` seulement après analyse.

## 4. Vérification de la RLS

La RLS est activée sans policy sur toutes les tables : l'API Supabase (`anon`, `authenticated`) n'y a aucun accès. Prisma se connecte avec le rôle propriétaire, qui contourne la RLS ; les droits sont appliqués par les services (`lib/services/*`).

Après chaque `migrate deploy`, dans l'éditeur SQL de Supabase (requête en lecture seule) :

```sql
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
```

Attendu : `rls_enabled = true` pour **toutes** les lignes, y compris `_prisma_migrations`. Les 12 tables : `_prisma_migrations`, `email_tokens`, `group_invitations`, `group_members`, `groups`, `meetings`, `promo_members`, `promos`, `task_assignments`, `task_dependencies`, `tasks`, `users`.

Aucune policy ne doit exister :

```sql
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

Attendu : aucune ligne. Le tableau de bord Supabase (Database → Tables) doit aussi afficher « RLS enabled » partout, sans avertissement « RLS disabled ».

Si une table apparaît sans RLS (en particulier `_prisma_migrations`, créée par Prisma lors du premier `migrate deploy`), **ne pas** la corriger à la main en production : le signaler, puis ajouter une migration versionnée qui l'active.

## 5. Comptes de test

Avant l'ouverture aux étudiants, la base de production ne doit contenir aucun compte de test (essais manuels, recette, démonstration).

1. Lister les comptes (lecture seule) :

   ```sql
   SELECT id, username, email, created_at, email_verified_at FROM users ORDER BY created_at;
   ```

2. Identifier les comptes de test (domaines `example.test`, `example.com`, adresses jetables, noms d'utilisateur de recette) et faire valider la liste avant toute suppression.
3. Pour chacun, de préférence depuis l'application : quitter ou supprimer la promo et les groupes de test (règles §4.2 à §4.4), puis supprimer le compte. À défaut, en SQL et dans une transaction, après sauvegarde : `DELETE FROM users WHERE id IN (…);` (les tokens, adhésions, invitations et assignations suivent en cascade ; les promos et groupes créés gardent `created_by` à NULL et doivent être supprimés s'ils sont de test).
4. Vérifier qu'il ne reste ni promo ni groupe orphelin de test : `SELECT id, name FROM promos;` et `SELECT id, name FROM groups;`.

Les tests automatisés (`test:integration`, `test:e2e`) ne touchent jamais la production : ils refusent toute base dont le nom ne se termine pas par `_test`.

## 6. Après le déploiement

- Inscription d'un compte réel : l'email de validation arrive via Brevo, le lien pointe vers `APP_URL`.
- Mot de passe oublié : même vérification.
- Contrôle visuel à 375 px et 1280 px (calendriers, profil), resté en attente depuis les étapes 10 et 11.
- Supprimer ce compte de vérification s'il ne doit pas rester (section 5).
