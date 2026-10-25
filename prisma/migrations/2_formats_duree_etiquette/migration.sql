-- Nouveaux formats, durée de niveau et étiquette.
--
-- Postgres refuse d'utiliser une valeur d'enum dans la transaction qui
-- l'ajoute : cette migration se contente de déclarer MYSTERY et SPACE_KO et
-- d'ajouter les colonnes. Le reclassement des données existantes se fait
-- dans la migration suivante.

ALTER TYPE "TournamentFormat" ADD VALUE IF NOT EXISTS 'MYSTERY';
ALTER TYPE "TournamentFormat" ADD VALUE IF NOT EXISTS 'SPACE_KO';

ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "levelMinutes" INTEGER;

ALTER TABLE "TournamentTemplate" ADD COLUMN IF NOT EXISTS "levelMinutes" INTEGER;
ALTER TABLE "TournamentTemplate" ADD COLUMN IF NOT EXISTS "tag" TEXT;
