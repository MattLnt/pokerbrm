/**
 * Applique les migrations Prisma, mais seulement si une base est configurée.
 *
 * Tourne pendant le build Vercel, qui dispose de DATABASE_URL : c'est ce qui
 * crée les tables sans que le mot de passe de la base ait à transiter ailleurs.
 *
 * Sans DATABASE_URL — build de preview, ou développement sur les données
 * d'exemple — on ne fait rien et le build continue. Un échec de migration,
 * lui, fait bien échouer le build : mieux vaut ne pas déployer que déployer
 * une app branchée sur un schéma périmé.
 */

import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("Pas de DATABASE_URL : migrations ignorées, build sur données d'exemple.");
  process.exit(0);
}

console.log("DATABASE_URL présente : application des migrations…");

const res = spawnSync("prisma", ["migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
});

if (res.status !== 0) {
  console.error("Les migrations ont échoué : build interrompu.");
  process.exit(res.status ?? 1);
}
