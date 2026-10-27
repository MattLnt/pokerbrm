-- Transferts entre rooms : la gestion de bankroll se fait par room, donc
-- déplacer de l'argent de Winamax vers Betclic est le geste qui fait monter
-- de palier quelque part. Ce n'est ni un dépôt ni un retrait — la bankroll
-- totale ne bouge pas —, d'où deux types à part, toujours écrits par paire
-- et reliés par un même "transferId".

ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'TRANSFER_IN';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'TRANSFER_OUT';

ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "transferId" TEXT;

CREATE INDEX IF NOT EXISTS "Transaction_userId_transferId_idx"
  ON "Transaction" ("userId", "transferId");
