-- Invalidation des sessions JWT après un changement de mot de passe.
-- Toute session dont authTime (instant de connexion, en ms, stocké dans le JWT)
-- est antérieur à password_changed_at est refusée par le callback jwt et par
-- les guards. NULL = mot de passe jamais changé : aucune session à invalider,
-- donc les comptes et sessions existants ne sont pas affectés.
-- La RLS reste activée sur "users" (ajout de colonne sans effet sur elle).

-- AlterTable
ALTER TABLE "users" ADD COLUMN "password_changed_at" TIMESTAMPTZ(3);

COMMENT ON COLUMN "users"."password_changed_at" IS
  'Dernier changement de mot de passe. Les sessions ouvertes avant sont refusées.';
