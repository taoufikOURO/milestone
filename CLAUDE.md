# Milestone

Application de planification des projets de groupe pour une promotion.

## Documentation

- Cahier des charges complet : docs/cahier-des-charges.md (à lire avant toute fonctionnalité)

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS
- Prisma (schéma et migrations) : `prisma migrate dev` en local, `prisma migrate deploy` en production
- Auth.js (NextAuth), email et mot de passe, sessions JWT
- Base : PostgreSQL local en dev, Supabase (PostgreSQL uniquement) en production. Supabase Auth n'est pas utilisé.
- RLS activée sur toutes les tables, sans policy (refus par défaut via l'API Supabase). Prisma contourne la RLS : les droits sont appliqués dans les services serveur.
- Validation : Zod côté serveur
- Emails : Gmail SMTP (nodemailer) si `ENVIRONMENT=production`, console sinon et toujours pendant les tests. Variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`

## Palette

- Fond : #fffcf2
- Bordures et cartes secondaires : #ccc5b9
- Texte secondaire : #403d39
- Texte principal : #252422
- Accent (boutons, barres) : #eb5e28

## Base de données (local)

- Nom : `milestone`
- Propriétaire : `postgres`
- Hôte : `localhost`, port 5432
- Connexion : variable `DATABASE_URL` dans `.env` (ne jamais écrire les identifiants dans ce fichier)
- Production : `DATABASE_URL` (poolée) et `DIRECT_URL` (migrations) dans les variables de l'hébergeur

## Règles de travail

- Une fonctionnalité à la fois, validée avant la suivante.
- Ne jamais désactiver la RLS.
- Les actions sensibles sont vérifiées côté serveur, dans les services (`lib/services/*`), à chaque appel.
- Demander avant de modifier le schéma de la base.
- Lancer les tests et le lint avant de dire qu'une tâche est terminée.
