-- Compte bancaire et projets web.
--
-- Le compte bancaire ne recopie pas les retraits poker : ils restent dans
-- "Transaction" et le compte les reflète à la lecture. D'où l'absence de
-- colonne de rattachement ici — une ligne recopiée serait une seconde vérité
-- à tenir à jour.
--
-- "ProjectAccess" ne porte volontairement aucune colonne de secret : la base
-- n'est pas chiffrée côté application, les clés d'API restent ailleurs.

CREATE TYPE "BankFlow" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "ProjectStage" AS ENUM ('IDEE', 'DEVIS_ENVOYE', 'DEVIS_REFUSE', 'EN_COURS', 'TERMINE');
CREATE TYPE "ProjectBilling" AS ENUM ('A_FACTURER', 'FACTURE', 'PAYE');

CREATE TABLE "BankEntry" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "date"      TIMESTAMP(3) NOT NULL,
  "label"     TEXT NOT NULL,
  "amount"    DECIMAL(12,2) NOT NULL,
  "flow"      "BankFlow" NOT NULL,
  "category"  TEXT NOT NULL,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BankEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BankEntry_userId_date_idx" ON "BankEntry" ("userId", "date");

ALTER TABLE "BankEntry" ADD CONSTRAINT "BankEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RecurringCharge" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "label"      TEXT NOT NULL,
  "amount"     DECIMAL(12,2) NOT NULL,
  "category"   TEXT NOT NULL,
  "dayOfMonth" INTEGER,
  "active"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RecurringCharge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecurringCharge_userId_active_idx" ON "RecurringCharge" ("userId", "active");

ALTER TABLE "RecurringCharge" ADD CONSTRAINT "RecurringCharge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Project" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "client"     TEXT,
  "amount"     DECIMAL(12,2) NOT NULL DEFAULT 0,
  "stage"      "ProjectStage" NOT NULL DEFAULT 'IDEE',
  "billing"    "ProjectBilling" NOT NULL DEFAULT 'A_FACTURER',
  "devisAt"    TIMESTAMP(3),
  "invoicedAt" TIMESTAMP(3),
  "paidAt"     TIMESTAMP(3),
  "deadline"   TIMESTAMP(3),
  "url"        TEXT,
  "note"       TEXT,
  "position"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Project_userId_stage_position_idx" ON "Project" ("userId", "stage", "position");

ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectAccess" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "projectId" TEXT,
  "service"   TEXT NOT NULL,
  "account"   TEXT,
  "resource"  TEXT,
  "url"       TEXT,
  "note"      TEXT,
  "position"  INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProjectAccess_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectAccess_userId_projectId_position_idx"
  ON "ProjectAccess" ("userId", "projectId", "position");

ALTER TABLE "ProjectAccess" ADD CONSTRAINT "ProjectAccess_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectAccess" ADD CONSTRAINT "ProjectAccess_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Point de départ du solde bancaire : sans lui, le solde ne serait que la
-- somme de ce qui a été saisi dans l'app.
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "bankOpeningBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "bankOpeningAt" TIMESTAMP(3);
