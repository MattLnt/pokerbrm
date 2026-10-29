-- Agenda : les créneaux planifiés sur les trente jours à venir.
--
-- "date" est un DATE et non un TIMESTAMP : un jour d'agenda n'a pas de
-- fuseau, et un horodatage à minuit glisserait d'un jour selon l'endroit où
-- il est relu.
--
-- "endMinute" n'est pas borné à 1440 : un grind qui finit à 2 h s'écrit
-- 1260 → 1560, sur la journée qui l'a commencé.

CREATE TYPE "PlanKind" AS ENUM ('GRIND', 'ETUDE', 'PROJET');

CREATE TABLE "PlanBlock" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "date"        DATE NOT NULL,
  "kind"        "PlanKind" NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute"   INTEGER NOT NULL,
  "projectId"   TEXT,
  "note"        TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlanBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlanBlock_userId_date_idx" ON "PlanBlock" ("userId", "date");

ALTER TABLE "PlanBlock" ADD CONSTRAINT "PlanBlock_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlanBlock" ADD CONSTRAINT "PlanBlock_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
