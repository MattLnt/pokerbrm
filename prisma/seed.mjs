/**
 * Amorce la base : utilisateur unique, sites et programme d'étude.
 * Idempotent — on peut le relancer sans créer de doublons.
 *
 *   npm run db:seed
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ici = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL manquante — renseigne-la dans .env d'abord.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Repris de lib/constants.js pour que le seed suive la liste des sites actifs.
const SITES = [
  { slug: "winamax", name: "Winamax" },
  { slug: "betclic", name: "Betclic" },
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

  // --- Grille : les MTT habituellement joués ---
  // Extraite de l'historique Winamax réel, ordonnée par fréquence de jeu.
  // Les Spins en sont absents : seuls les MTT sont suivis.
  const grille = JSON.parse(
    readFileSync(join(ici, "..", "lib", "grille-winamax.json"), "utf8")
  );
  const sites = await prisma.site.findMany({ where: { userId: user.id } });
  const parSlug = new Map(sites.map((s) => [s.slug, s]));

  let ajoutes = 0;
  for (const [i, m] of grille.entries()) {
    const site = parSlug.get(m.site);
    if (!site) continue;
    // Plus de clé d'unicité sur la grille : on retrouve la ligne à la main
    // pour ne pas en créer une deuxième à chaque passage du seed.
    const existant = await prisma.tournamentTemplate.findFirst({
      where: {
        userId: user.id,
        siteId: site.id,
        name: m.name,
        buyIn: m.buyIn,
        bounty: m.bounty,
      },
      select: { id: true },
    });

    const valeurs = {
      fee: m.fee,
      format: m.format,
      speed: m.speed,
      usualHour: m.heureUsuelle,
      position: i,
    };

    if (existant) {
      await prisma.tournamentTemplate.update({
        where: { id: existant.id },
        data: valeurs,
      });
    } else {
      await prisma.tournamentTemplate.create({
        data: {
          ...valeurs,
          userId: user.id,
          siteId: site.id,
          name: m.name,
          buyIn: m.buyIn,
          bounty: m.bounty,
        },
      });
    }

    ajoutes += 1;
  }
  console.log(`${ajoutes} tournois dans la grille`);

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
