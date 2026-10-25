-- Retire de la grille les tournois ponctuels : séries, qualifications,
-- Day 1 d'événements et Double or Nothing. Ce ne sont pas des rendez-vous
-- réguliers, ils n'ont donc rien à faire dans une liste d'inscription
-- rapide.
--
-- Deux temps, pour ne jamais casser un historique :
--   1. tout ce qui correspond est désactivé ;
--   2. seuls ceux qui n'ont jamais servi sont réellement supprimés.
-- Un modèle déjà joué reste en base, inactif, et ses tournois gardent leur
-- rattachement.

UPDATE "TournamentTemplate"
SET "active" = false
WHERE "name" ILIKE '%double or nothing%'
   OR "name" ILIKE '%qualif%'
   OR "name" ILIKE '%ticket%'
   OR "name" ILIKE '%road to%series%'
   OR "name" ILIKE '%- day %'
   OR "name" ILIKE '%w series%'
   OR "name" ILIKE '%million week%';

DELETE FROM "TournamentTemplate" t
WHERE t."active" = false
  AND NOT EXISTS (
    SELECT 1 FROM "Tournament" e WHERE e."templateId" = t."id"
  )
  AND (
       t."name" ILIKE '%double or nothing%'
    OR t."name" ILIKE '%qualif%'
    OR t."name" ILIKE '%ticket%'
    OR t."name" ILIKE '%road to%series%'
    OR t."name" ILIKE '%- day %'
    OR t."name" ILIKE '%w series%'
    OR t."name" ILIKE '%million week%'
  );
