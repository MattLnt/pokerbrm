-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('CLASSIC', 'KO', 'SPIN');

-- CreateEnum
CREATE TYPE "TournamentSpeed" AS ENUM ('NORMAL', 'SEMITURBO', 'TURBO', 'HYPER');

-- CreateEnum
CREATE TYPE "TournamentSource" AS ENUM ('IMPORT', 'MANUAL');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'RAKEBACK', 'BONUS', 'TICKET', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "StudySessionType" AS ENUM ('THEORIE', 'DRILL', 'REVUE_MAINS', 'REVUE_BDD');

-- CreateEnum
CREATE TYPE "TaggedHandStatus" AS ENUM ('A_REVOIR', 'REVUE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "lastImportAt" TIMESTAMP(3),

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "buyIn" DECIMAL(12,2) NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL,
    "bounty" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reEntries" INTEGER NOT NULL DEFAULT 0,
    "entrants" INTEGER,
    "finishPosition" INTEGER,
    "prize" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bountiesWon" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "netResult" DECIMAL(12,2) NOT NULL,
    "format" "TournamentFormat" NOT NULL DEFAULT 'CLASSIC',
    "speed" "TournamentSpeed" NOT NULL DEFAULT 'NORMAL',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "importBatchId" TEXT,
    "source" "TournamentSource" NOT NULL DEFAULT 'IMPORT',
    "inProgress" BOOLEAN NOT NULL DEFAULT false,
    "sessionId" TEXT,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buyIn" DECIMAL(12,2) NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL,
    "bounty" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "format" "TournamentFormat" NOT NULL DEFAULT 'CLASSIC',
    "speed" "TournamentSpeed" NOT NULL DEFAULT 'NORMAL',
    "usualHour" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankrollRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" "TournamentFormat" NOT NULL,
    "buyInsRequired" INTEGER NOT NULL,

    CONSTRAINT "BankrollRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankrollLevel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetAbi" DECIMAL(12,2) NOT NULL,
    "bankrollRequired" DECIMAL(12,2) NOT NULL,
    "stopLoss" DECIMAL(12,2) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BankrollLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Range" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "position" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "vsPosition" TEXT NOT NULL DEFAULT '',
    "stackDepth" TEXT NOT NULL,
    "cells" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Range_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyTheme" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "block" TEXT,
    "weekFrom" INTEGER,
    "weekTo" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "objectives" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "themeId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "type" "StudySessionType" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaggedHand" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spot" TEXT NOT NULL,
    "stackDepth" TEXT,
    "description" TEXT,
    "handHistory" TEXT,
    "link" TEXT,
    "status" "TaggedHandStatus" NOT NULL DEFAULT 'A_REVOIR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaggedHand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrillAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rangeId" TEXT NOT NULL,
    "hand" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "easiness" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetition" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrillAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weeklyStudyDays" INTEGER NOT NULL DEFAULT 5,
    "dailyStudyMinutes" INTEGER NOT NULL DEFAULT 75,
    "importStaleDays" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Site_userId_slug_key" ON "Site"("userId", "slug");

-- CreateIndex
CREATE INDEX "Tournament_userId_playedAt_idx" ON "Tournament"("userId", "playedAt");

-- CreateIndex
CREATE INDEX "Tournament_userId_format_idx" ON "Tournament"("userId", "format");

-- CreateIndex
CREATE INDEX "Tournament_userId_sessionId_idx" ON "Tournament"("userId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_siteId_externalId_key" ON "Tournament"("siteId", "externalId");

-- CreateIndex
CREATE INDEX "TournamentTemplate_userId_active_position_idx" ON "TournamentTemplate"("userId", "active", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTemplate_userId_siteId_name_buyIn_bounty_key" ON "TournamentTemplate"("userId", "siteId", "name", "buyIn", "bounty");

-- CreateIndex
CREATE INDEX "Session_userId_startedAt_idx" ON "Session"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BankrollRule_userId_format_key" ON "BankrollRule"("userId", "format");

-- CreateIndex
CREATE INDEX "BankrollLevel_userId_position_idx" ON "BankrollLevel"("userId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Range_userId_position_action_vsPosition_stackDepth_key" ON "Range"("userId", "position", "action", "vsPosition", "stackDepth");

-- CreateIndex
CREATE INDEX "StudyTheme_userId_position_idx" ON "StudyTheme"("userId", "position");

-- CreateIndex
CREATE INDEX "StudySession_userId_date_idx" ON "StudySession"("userId", "date");

-- CreateIndex
CREATE INDEX "TaggedHand_userId_status_idx" ON "TaggedHand"("userId", "status");

-- CreateIndex
CREATE INDEX "DrillAttempt_userId_dueAt_idx" ON "DrillAttempt"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "DrillAttempt_userId_rangeId_idx" ON "DrillAttempt"("userId", "rangeId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TournamentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTemplate" ADD CONSTRAINT "TournamentTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTemplate" ADD CONSTRAINT "TournamentTemplate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankrollRule" ADD CONSTRAINT "BankrollRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankrollLevel" ADD CONSTRAINT "BankrollLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Range" ADD CONSTRAINT "Range_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyTheme" ADD CONSTRAINT "StudyTheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "StudyTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaggedHand" ADD CONSTRAINT "TaggedHand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillAttempt" ADD CONSTRAINT "DrillAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrillAttempt" ADD CONSTRAINT "DrillAttempt_rangeId_fkey" FOREIGN KEY ("rangeId") REFERENCES "Range"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
