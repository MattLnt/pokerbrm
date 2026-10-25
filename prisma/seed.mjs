/**
 * Amorce la base : utilisateur unique, sites, règles de buy-in, paliers et
 * programme d'étude. Idempotent — on peut le relancer sans créer de doublons.
 *
 *   npm run db:seed
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL manquante — renseigne-la dans .env d'abord.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const SITES = [
  { slug: "winamax", name: "Winamax" },
  { slug: "pokerstars", name: "PokerStars" },
  { slug: "pmu", name: "PMU" },
];

const RULES = [
  { format: "CLASSIC", buyInsRequired: 200 },
  { format: "KO", buyInsRequired: 150 },
  { format: "SPIN", buyInsRequired: 100 },
];

// Paliers d'exemple : à remplacer par les vrais (cf. PROJET-APP-POKER.md §10).
const LEVELS = [
  { targetAbi: 25, bankrollRequired: 5000, stopLoss: 3500, position: 0 },
  { targetAbi: 50, bankrollRequired: 10000, stopLoss: 6500, position: 1 },
  { targetAbi: 100, bankrollRequired: 20000, stopLoss: 13000, position: 2 },
];

const THEMES = [
  {
    title: "RFI par position et par tapis",
    block: "Préflop par profondeur",
    weekFrom: 1,
    weekTo: 2,
    objectives: [
      { label: "Écrire les RFI 60bb+ de UTG à BTN", done: false },
      { label: "Écrire les RFI 25bb", done: false },
      { label: "Drill 200 mains RFI", done: false },
    ],
  },
  {
    title: "Défense BB vs open",
    block: "Préflop par profondeur",
    weekFrom: 3,
    weekTo: 4,
    objectives: [
      { label: "Ranges de call BB vs BTN", done: false },
      { label: "Ranges de 3bet BB vs CO", done: false },
    ],
  },
  {
    title: "Stratégie SB et 3bet vs flat",
    block: "Préflop par profondeur",
    weekFrom: 3,
    weekTo: 4,
    objectives: [{ label: "Construire la SB complète", done: false }],
  },
  {
    title: "Push/fold et resteal sous 20bb",
    block: "Préflop par profondeur",
    weekFrom: 4,
    weekTo: 4,
    objectives: [{ label: "Tables de push par position", done: false }],
  },
  {
    title: "C-bet BTN/CO vs BB par texture",
    block: "Postflop pots simples",
    weekFrom: 5,
    weekTo: 6,
    objectives: [],
  },
  {
    title: "Défense BB vs c-bet et jeu du turn",
    block: "Postflop pots simples",
    weekFrom: 7,
    weekTo: 8,
    objectives: [],
  },
  {
    title: "Pots 3bet et décisions rivière",
    block: "Pots 3bet et rivière",
    weekFrom: 9,
    weekTo: 10,
    objectives: [],
  },
  {
    title: "ICM : bulle, ITM, table finale",
    block: "ICM",
    weekFrom: 11,
    weekTo: 12,
    objectives: [],
  },
];

const email = process.env.APP_USER_EMAIL ?? "moi@pokerbrm.local";

async function main() {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Joueur" },
  });
  console.log(`Utilisateur : ${user.email}`);

  for (const s of SITES) {
    await prisma.site.upsert({
      where: { userId_slug: { userId: user.id, slug: s.slug } },
      update: { name: s.name },
      create: { userId: user.id, ...s },
    });
  }
  console.log(`${SITES.length} sites`);

  for (const r of RULES) {
    await prisma.bankrollRule.upsert({
      where: { userId_format: { userId: user.id, format: r.format } },
      update: { buyInsRequired: r.buyInsRequired },
      create: { userId: user.id, ...r },
    });
  }
  console.log(`${RULES.length} règles de buy-in`);

  // Pas de clé unique naturelle sur les paliers : on repart de zéro.
  await prisma.bankrollLevel.deleteMany({ where: { userId: user.id } });
  await prisma.bankrollLevel.createMany({
    data: LEVELS.map((l) => ({ ...l, userId: user.id })),
  });
  console.log(`${LEVELS.length} paliers`);

  const existingThemes = await prisma.studyTheme.count({
    where: { userId: user.id },
  });
  if (existingThemes === 0) {
    await prisma.studyTheme.createMany({
      data: THEMES.map((t, i) => ({ ...t, userId: user.id, position: i })),
    });
    console.log(`${THEMES.length} thèmes d'étude`);
  } else {
    console.log(`${existingThemes} thèmes déjà en base — inchangés`);
  }

  await prisma.settings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
