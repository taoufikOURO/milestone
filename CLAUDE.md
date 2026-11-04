# Milestone

Application de planification des projets de groupe pour une promotion.

## Documentation

- Cahier des charges complet : docs/cahier-des-charges.md (à lire avant toute fonctionnalité)

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS
- Supabase : PostgreSQL, Auth, RLS activé sur toutes les tables
- Supabase CLI en local (`supabase start`)

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

## Règles de travail

- Une fonctionnalité à la fois, validée avant la suivante.
- Ne jamais désactiver la RLS.
- Les actions sensibles sont vérifiées côté serveur.
- Demander avant de modifier le schéma de la base.
- Lancer les tests et le lint avant de dire qu'une tâche est terminée.
