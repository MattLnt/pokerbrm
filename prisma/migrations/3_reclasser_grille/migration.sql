-- Reclasse les données existantes avec les nouveaux formats, applique les
-- durées de niveau lues dans les résumés Winamax, et étiquette les tournois
-- ponctuels au lieu de les faire disparaître.
--
-- Séparée de la migration précédente : Postgres refuse d'utiliser une valeur
-- d'enum dans la transaction qui l'ajoute.

-- 1. Tournois déjà importés : Mystery et Space KO sont des KO particuliers,
--    ils étaient tous rangés en KO.
UPDATE "Tournament" SET "format" = 'SPACE_KO'
 WHERE "name" ILIKE '%space%ko%' AND "format" <> 'SPIN';
UPDATE "Tournament" SET "format" = 'MYSTERY'
 WHERE "name" ILIKE '%mystery%' AND "format" NOT IN ('SPIN', 'SPACE_KO');

-- 2. Règles de buy-in : le Spin sort, Mystery et Space KO entrent.
DELETE FROM "BankrollRule" WHERE "format" = 'SPIN';
INSERT INTO "BankrollRule" ("id", "userId", "format", "buyInsRequired")
SELECT gen_random_uuid()::text, u."id", f."format"::"TournamentFormat", 150
  FROM "User" u
 CROSS JOIN (VALUES ('MYSTERY'), ('SPACE_KO')) AS f("format")
 WHERE NOT EXISTS (
   SELECT 1 FROM "BankrollRule" r
    WHERE r."userId" = u."id" AND r."format" = f."format"::"TournamentFormat"
 );

-- 3. Grille : format, durée de niveau et étiquette, modèle par modèle.
UPDATE "TournamentTemplate" SET "format" = 'CLASSIC', "levelMinutes" = 8, "tag" = NULL
 WHERE "name" = 'Monster Stack' AND "buyIn" = 4.5 AND "bounty" = 0;
UPDATE "TournamentTemplate" SET "format" = 'MYSTERY', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'MYSTERY KO' AND "buyIn" = 3 AND "bounty" = 1.5;
UPDATE "TournamentTemplate" SET "format" = 'CLASSIC', "levelMinutes" = 8, "tag" = NULL
 WHERE "name" = 'Monster Stack' AND "buyIn" = 9 AND "bounty" = 0;
UPDATE "TournamentTemplate" SET "format" = 'MYSTERY', "levelMinutes" = 7, "tag" = NULL
 WHERE "name" = 'CRYSTAL MYSTERY' AND "buyIn" = 3 AND "bounty" = 1.5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 5, "tag" = NULL
 WHERE "name" = 'Kill The Fish' AND "buyIn" = 0.9 AND "bounty" = 0.9;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 7, "tag" = NULL
 WHERE "name" = 'SAMOURAI' AND "buyIn" = 2.25 AND "bounty" = 2.25;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 5, "tag" = NULL
 WHERE "name" = 'GUERILLA' AND "buyIn" = 2.25 AND "bounty" = 2.25;
UPDATE "TournamentTemplate" SET "format" = 'CLASSIC', "levelMinutes" = 8, "tag" = NULL
 WHERE "name" = 'Monster Stack' AND "buyIn" = 1.8 AND "bounty" = 0;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'BIG BANG' AND "buyIn" = 2.25 AND "bounty" = 2.25;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 5, "tag" = NULL
 WHERE "name" = 'LES LOULOUS' AND "buyIn" = 3 AND "bounty" = 1.5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'STELLARIS' AND "buyIn" = 2 AND "bounty" = 2.5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 4, "tag" = NULL
 WHERE "name" = 'ROCKET' AND "buyIn" = 2 AND "bounty" = 2.5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 5, "tag" = NULL
 WHERE "name" = 'HENNI SHOW' AND "buyIn" = 2.25 AND "bounty" = 2.25;
UPDATE "TournamentTemplate" SET "format" = 'CLASSIC', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'Hold''em [180 Max]' AND "buyIn" = 4.5 AND "bounty" = 0;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'LA FIEVRE' AND "buyIn" = 4.5 AND "bounty" = 4.5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'MILKY WAY' AND "buyIn" = 2 AND "bounty" = 2.5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 5, "tag" = NULL
 WHERE "name" = 'QUANTUM' AND "buyIn" = 2 AND "bounty" = 2.5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'ASTEROID' AND "buyIn" = 2 AND "bounty" = 2.5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'ATOM' AND "buyIn" = 2 AND "bounty" = 2.5;
UPDATE "TournamentTemplate" SET "format" = 'MYSTERY', "levelMinutes" = 8, "tag" = NULL
 WHERE "name" = 'SILVER MYSTERY' AND "buyIn" = 6 AND "bounty" = 3;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 7, "tag" = NULL
 WHERE "name" = 'SPACECRAFT' AND "buyIn" = 4 AND "bounty" = 5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 8, "tag" = NULL
 WHERE "name" = 'CYBER' AND "buyIn" = 4 AND "bounty" = 5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 5, "tag" = NULL
 WHERE "name" = 'NINJA' AND "buyIn" = 4.5 AND "bounty" = 4.5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 5, "tag" = NULL
 WHERE "name" = 'BOWLING' AND "buyIn" = 2.25 AND "bounty" = 2.25;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 7, "tag" = NULL
 WHERE "name" = 'DIGESTIF' AND "buyIn" = 4 AND "bounty" = 5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'DESPERADO' AND "buyIn" = 2.25 AND "bounty" = 2.25;
UPDATE "TournamentTemplate" SET "format" = 'MYSTERY', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'MAJOR MYSTERY' AND "buyIn" = 6 AND "bounty" = 3;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'SUPERNOVA' AND "buyIn" = 4 AND "bounty" = 5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 5, "tag" = NULL
 WHERE "name" = 'TORNADO' AND "buyIn" = 4.5 AND "bounty" = 4.5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'METEOR' AND "buyIn" = 4 AND "bounty" = 5;
UPDATE "TournamentTemplate" SET "format" = 'MYSTERY', "levelMinutes" = 3, "tag" = NULL
 WHERE "name" = 'THUNDER MYSTERY' AND "buyIn" = 3 AND "bounty" = 1.5;
UPDATE "TournamentTemplate" SET "format" = 'MYSTERY', "levelMinutes" = 7, "tag" = NULL
 WHERE "name" = 'MYSTERY KO' AND "buyIn" = 1.2 AND "bounty" = 0.6;
UPDATE "TournamentTemplate" SET "format" = 'MYSTERY', "levelMinutes" = 7, "tag" = NULL
 WHERE "name" = 'MYSTERY KO' AND "buyIn" = 6 AND "bounty" = 3;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 3, "tag" = NULL
 WHERE "name" = 'CYGNUS' AND "buyIn" = 2 AND "bounty" = 2.5;
UPDATE "TournamentTemplate" SET "format" = 'SPACE_KO', "levelMinutes" = 9, "tag" = 'Event'
 WHERE "name" = 'MILLION WEEK SPACE KO 10 € - DAY 1' AND "buyIn" = 4 AND "bounty" = 5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 6, "tag" = 'Event'
 WHERE "name" = 'MILKY WAY - ROAD TO WINAMAX SERIES 50 €' AND "buyIn" = 2.5 AND "bounty" = 2;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 4, "tag" = NULL
 WHERE "name" = 'COSMIC' AND "buyIn" = 4 AND "bounty" = 5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 8, "tag" = NULL
 WHERE "name" = 'THUNDER' AND "buyIn" = 4 AND "bounty" = 5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 3, "tag" = 'Event'
 WHERE "name" = 'SUNDAY ONE TIME TRIDENT 10 € - DAY 1' AND "buyIn" = 4 AND "bounty" = 5;
UPDATE "TournamentTemplate" SET "format" = 'MYSTERY', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'SUNDAY MYSTERY' AND "buyIn" = 6 AND "bounty" = 3;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 3, "tag" = NULL
 WHERE "name" = 'SNIPER' AND "buyIn" = 2.25 AND "bounty" = 2.25;
UPDATE "TournamentTemplate" SET "format" = 'SPACE_KO', "levelMinutes" = 3, "tag" = 'Event'
 WHERE "name" = 'SUNDAY ONE TIME SPACE KO 5 € - DAY 1' AND "buyIn" = 2 AND "bounty" = 2.5;
UPDATE "TournamentTemplate" SET "format" = 'SPACE_KO', "levelMinutes" = 3, "tag" = NULL
 WHERE "name" = 'TRIDENT SPACE KO' AND "buyIn" = 2 AND "bounty" = 2.5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 6, "tag" = 'Event'
 WHERE "name" = 'ATOM - ROAD TO WINAMAX SERIES 50 €' AND "buyIn" = 2.5 AND "bounty" = 2;
UPDATE "TournamentTemplate" SET "format" = 'MYSTERY', "levelMinutes" = 3, "tag" = NULL
 WHERE "name" = 'MOONLIGHT MYSTERY' AND "buyIn" = 6 AND "bounty" = 3;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 11, "tag" = 'Event'
 WHERE "name" = '#5 - W SERIES - HIGH FIVE - DAY 1' AND "buyIn" = 2 AND "bounty" = 2.5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 8, "tag" = NULL
 WHERE "name" = 'TEA TIME' AND "buyIn" = 9 AND "bounty" = 9;
UPDATE "TournamentTemplate" SET "format" = 'SPACE_KO', "levelMinutes" = 6, "tag" = NULL
 WHERE "name" = 'SUNDAY SURPRISE SPACE KO' AND "buyIn" = 4 AND "bounty" = 5;
UPDATE "TournamentTemplate" SET "format" = 'KO', "levelMinutes" = 8, "tag" = NULL
 WHERE "name" = 'PULSAR' AND "buyIn" = 8 AND "bounty" = 10;

-- 4. Les tournois événements reviennent dans la grille, étiquetés et
--    désactivés : ils ne polluent pas la liste d'inscription quotidienne,
--    un seul basculement suffit à les rendre disponibles pendant une série.
INSERT INTO "TournamentTemplate" ("id", "userId", "siteId", "name", "buyIn", "fee", "bounty", "format", "speed", "levelMinutes", "tag", "usualHour", "position", "active", "createdAt")
SELECT gen_random_uuid()::text, u."id", s."id", 'MILLION WEEK SPACE KO 10 € - DAY 1', 4, 1, 5, 'SPACE_KO', 'NORMAL', 9, 'Event', 16, 900, false, NOW()
  FROM "User" u JOIN "Site" s ON s."userId" = u."id" AND s."slug" = 'winamax'
 WHERE NOT EXISTS (
   SELECT 1 FROM "TournamentTemplate" t
    WHERE t."userId" = u."id" AND t."name" = 'MILLION WEEK SPACE KO 10 € - DAY 1' AND t."buyIn" = 4 AND t."bounty" = 5
 );
INSERT INTO "TournamentTemplate" ("id", "userId", "siteId", "name", "buyIn", "fee", "bounty", "format", "speed", "levelMinutes", "tag", "usualHour", "position", "active", "createdAt")
SELECT gen_random_uuid()::text, u."id", s."id", 'MILKY WAY - ROAD TO WINAMAX SERIES 50 €', 2.5, 0.5, 2, 'KO', 'NORMAL', 6, 'Event', 15, 900, false, NOW()
  FROM "User" u JOIN "Site" s ON s."userId" = u."id" AND s."slug" = 'winamax'
 WHERE NOT EXISTS (
   SELECT 1 FROM "TournamentTemplate" t
    WHERE t."userId" = u."id" AND t."name" = 'MILKY WAY - ROAD TO WINAMAX SERIES 50 €' AND t."buyIn" = 2.5 AND t."bounty" = 2
 );
INSERT INTO "TournamentTemplate" ("id", "userId", "siteId", "name", "buyIn", "fee", "bounty", "format", "speed", "levelMinutes", "tag", "usualHour", "position", "active", "createdAt")
SELECT gen_random_uuid()::text, u."id", s."id", 'SUNDAY ONE TIME TRIDENT 10 € - DAY 1', 4, 1, 5, 'KO', 'TURBO', 3, 'Event', 15, 900, false, NOW()
  FROM "User" u JOIN "Site" s ON s."userId" = u."id" AND s."slug" = 'winamax'
 WHERE NOT EXISTS (
   SELECT 1 FROM "TournamentTemplate" t
    WHERE t."userId" = u."id" AND t."name" = 'SUNDAY ONE TIME TRIDENT 10 € - DAY 1' AND t."buyIn" = 4 AND t."bounty" = 5
 );
INSERT INTO "TournamentTemplate" ("id", "userId", "siteId", "name", "buyIn", "fee", "bounty", "format", "speed", "levelMinutes", "tag", "usualHour", "position", "active", "createdAt")
SELECT gen_random_uuid()::text, u."id", s."id", 'SUNDAY ONE TIME SPACE KO 5 € - DAY 1', 2, 0.5, 2.5, 'SPACE_KO', 'TURBO', 3, 'Event', 15, 900, false, NOW()
  FROM "User" u JOIN "Site" s ON s."userId" = u."id" AND s."slug" = 'winamax'
 WHERE NOT EXISTS (
   SELECT 1 FROM "TournamentTemplate" t
    WHERE t."userId" = u."id" AND t."name" = 'SUNDAY ONE TIME SPACE KO 5 € - DAY 1' AND t."buyIn" = 2 AND t."bounty" = 2.5
 );
INSERT INTO "TournamentTemplate" ("id", "userId", "siteId", "name", "buyIn", "fee", "bounty", "format", "speed", "levelMinutes", "tag", "usualHour", "position", "active", "createdAt")
SELECT gen_random_uuid()::text, u."id", s."id", 'ATOM - ROAD TO WINAMAX SERIES 50 €', 2.5, 0.5, 2, 'KO', 'NORMAL', 6, 'Event', 18, 900, false, NOW()
  FROM "User" u JOIN "Site" s ON s."userId" = u."id" AND s."slug" = 'winamax'
 WHERE NOT EXISTS (
   SELECT 1 FROM "TournamentTemplate" t
    WHERE t."userId" = u."id" AND t."name" = 'ATOM - ROAD TO WINAMAX SERIES 50 €' AND t."buyIn" = 2.5 AND t."bounty" = 2
 );
INSERT INTO "TournamentTemplate" ("id", "userId", "siteId", "name", "buyIn", "fee", "bounty", "format", "speed", "levelMinutes", "tag", "usualHour", "position", "active", "createdAt")
SELECT gen_random_uuid()::text, u."id", s."id", '#5 - W SERIES - HIGH FIVE - DAY 1', 2, 0.5, 2.5, 'KO', 'NORMAL', 11, 'Event', 14, 900, false, NOW()
  FROM "User" u JOIN "Site" s ON s."userId" = u."id" AND s."slug" = 'winamax'
 WHERE NOT EXISTS (
   SELECT 1 FROM "TournamentTemplate" t
    WHERE t."userId" = u."id" AND t."name" = '#5 - W SERIES - HIGH FIVE - DAY 1' AND t."buyIn" = 2 AND t."bounty" = 2.5
 );
