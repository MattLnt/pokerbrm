/**
 * Jeu de données d'exemple, calqué sur les maquettes.
 * Il sert tant que DATABASE_URL n'est pas configurée : l'app est navigable
 * immédiatement, et l'en-tête affiche « Données d'exemple ».
 *
 * Les tournois sont engendrés de façon déterministe (générateur à graine fixe)
 * pour que les chiffres restent plausibles — ROI de l'ordre de 10 à 20 %,
 * ITM autour de 15 %, une grosse place de temps en temps — sans avoir à
 * écrire deux cents lignes à la main.
 */

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function makeRandom(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = {
  winamax: [
    ["Monster Stack", "CLASSIC", "NORMAL"],
    ["Daily Big", "CLASSIC", "NORMAL"],
    ["Hyper KO", "KO", "HYPER"],
    ["Night Turbo", "CLASSIC", "TURBO"],
    ["KO Series", "KO", "NORMAL"],
    ["Expresso", "SPIN", "HYPER"],
  ],
  betclic: [
    ["Sunday Challenge", "CLASSIC", "NORMAL"],
    ["Bounty Hunter", "KO", "NORMAL"],
    ["Deepstack", "CLASSIC", "NORMAL"],
    ["Turbo Series", "CLASSIC", "TURBO"],
    ["Twister", "SPIN", "HYPER"],
  ],
};

const BUY_INS = [5, 10, 15, 22, 25, 30, 40, 50];

/**
 * Tire une place d'arrivée sur `entrants` joueurs, avec une distribution
 * réaliste : on sort le plus souvent dans le premier tiers du champ.
 */
function drawFinish(random, entrants) {
  const r = random();
  if (r < 0.845) {
    // Pas de place payée : quelque part dans les 85 % du bas.
    return Math.max(2, Math.ceil(entrants * (0.15 + random() * 0.85)));
  }
  if (r < 0.985) {
    // Place payée modeste.
    return Math.max(2, Math.ceil(entrants * (0.01 + random() * 0.13)));
  }
  // Table finale.
  return Math.max(1, Math.ceil(entrants * 0.008 * random()));
}

/**
 * Gain approximatif pour une place donnée, en multiples du coût d'entrée.
 * Le facteur global est calé pour que le ROI du jeu d'exemple tombe autour
 * de +15 %, ce qui est l'ordre de grandeur d'un bon joueur de MTT.
 */
const PAYOUT_SCALE = 8.33;

function prizeFor(finish, entrants, entryCost, random) {
  const ratio = finish / entrants;
  if (ratio > 0.15) return 0; // hors des places payées
  const base =
    finish === 1
      ? 18 + random() * 22
      : ratio <= 0.01
        ? 4 + random() * 10
        : ratio <= 0.05
          ? 1.6 + random() * 2.2
          : 1.1 + random() * 0.6;
  return entryCost * base * PAYOUT_SCALE;
}

function buildTournaments() {
  const random = makeRandom(20261030);
  const out = [];
  const sites = ["winamax", "winamax", "winamax", "betclic", "betclic"];

  for (let i = 0; i < 140; i += 1) {
    const site = sites[Math.floor(random() * sites.length)];
    const [baseName, format, speed] =
      NAMES[site][Math.floor(random() * NAMES[site].length)];

    const buyInTotal = BUY_INS[Math.floor(random() * BUY_INS.length)];
    const fee = Math.round(buyInTotal * 0.09 * 100) / 100;
    const isKo = format === "KO";
    const bounty = isKo ? Math.round((buyInTotal / 2) * 100) / 100 : 0;
    const buyIn = Math.round((buyInTotal - fee - bounty) * 100) / 100;

    const entrants =
      format === "SPIN" ? 3 : Math.ceil(120 + random() * 2400);
    const reEntries = format === "SPIN" ? 0 : random() < 0.22 ? 1 : 0;
    const entries = 1 + reEntries;
    const totalCost = Math.round(buyInTotal * entries * 100) / 100;

    const finishPosition = drawFinish(random, entrants);
    let prize = prizeFor(finishPosition, entrants, buyInTotal, random);

    // Sur un KO, une partie du gain vient des primes.
    let bountiesWon = 0;
    if (isKo) {
      bountiesWon = Math.round(bounty * random() * 3.5 * 100) / 100;
      prize = prize * 0.7;
    }
    prize = Math.round(prize * 100) / 100;

    out.push({
      id: `demo-t-${i}`,
      externalId: `demo-${i}`,
      name: `${baseName} ${buyInTotal} €`,
      site,
      format,
      speed,
      buyIn,
      fee,
      bounty,
      reEntries,
      entrants,
      finishPosition,
      prize,
      bountiesWon,
      playedAt: daysAgo(Math.floor(random() * 165)),
      totalCost,
      netResult: Math.round((prize + bountiesWon - totalCost) * 100) / 100,
      currency: "EUR",
    });
  }

  return out.sort((a, b) => b.playedAt - a.playedAt);
}

export const demoTournaments = buildTournaments();

export const demoTransactions = [
  { id: "demo-tx-1", site: "winamax", type: "RAKEBACK", amount: 96, date: daysAgo(3), note: "Rakeback hebdo" },
  { id: "demo-tx-2", site: "betclic", type: "RAKEBACK", amount: 52, date: daysAgo(7), note: "Missions" },
  { id: "demo-tx-3", site: "winamax", type: "BONUS", amount: 20, date: daysAgo(12), note: "Ticket Monster Stack" },
  { id: "demo-tx-4", site: "winamax", type: "RAKEBACK", amount: 88, date: daysAgo(17), note: "Rakeback hebdo" },
  { id: "demo-tx-5", site: "winamax", type: "WITHDRAWAL", amount: 300, date: daysAgo(30), note: null },
  { id: "demo-tx-6", site: "betclic", type: "RAKEBACK", amount: 44, date: daysAgo(35), note: "Missions" },
  { id: "demo-tx-7", site: "betclic", type: "DEPOSIT", amount: 500, date: daysAgo(90), note: null },
  { id: "demo-tx-8", site: "winamax", type: "ADJUSTMENT", amount: 4200, date: daysAgo(170), note: "Solde initial" },
  { id: "demo-tx-9", site: "betclic", type: "ADJUSTMENT", amount: 3400, date: daysAgo(170), note: "Solde initial" },
];

export const demoSites = [
  { slug: "winamax", name: "Winamax", lastImportAt: daysAgo(2) },
  { slug: "betclic", name: "Betclic", lastImportAt: daysAgo(9) },
];

export const demoLevels = [
  { targetAbi: 25, bankrollRequired: 5000, stopLoss: 3500 },
  { targetAbi: 50, bankrollRequired: 10000, stopLoss: 6500 },
  { targetAbi: 100, bankrollRequired: 20000, stopLoss: 13000 },
];

export const demoRules = [
  { format: "CLASSIC", buyInsRequired: 200 },
  { format: "KO", buyInsRequired: 150 },
  { format: "SPIN", buyInsRequired: 100 },
];

export const demoThemes = [
  {
    id: "demo-th-1",
    title: "RFI par position et par tapis",
    block: "Préflop par profondeur",
    weekFrom: 1,
    weekTo: 2,
    objectives: [
      { label: "Écrire les RFI 60bb+ de UTG à BTN", done: true },
      { label: "Écrire les RFI 25bb", done: true },
      { label: "Drill 200 mains RFI", done: false },
    ],
  },
  {
    id: "demo-th-2",
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
    id: "demo-th-3",
    title: "Push/fold et resteal sous 20bb",
    block: "Préflop par profondeur",
    weekFrom: 4,
    weekTo: 4,
    objectives: [{ label: "Tables de push par position", done: false }],
  },
];

export const demoStudySessions = [
  { id: "demo-s-1", date: daysAgo(0), minutes: 75, type: "THEORIE", themeId: "demo-th-1", notes: "Révision open sizing" },
  { id: "demo-s-2", date: daysAgo(1), minutes: 60, type: "DRILL", themeId: "demo-th-1", notes: null },
  { id: "demo-s-3", date: daysAgo(2), minutes: 90, type: "REVUE_MAINS", themeId: "demo-th-1", notes: "3 spots de bulle" },
  { id: "demo-s-4", date: daysAgo(4), minutes: 45, type: "REVUE_BDD", themeId: null, notes: null },
];

export const demoWeakSpots = [
  { spot: "BB vs BTN open · 25bb", success: 58, attempts: 120 },
  { spot: "SB 3bet vs CO · 40bb", success: 64, attempts: 86 },
  { spot: "Push/fold UTG · 12bb", success: 71, attempts: 150 },
];

export const demoTaggedHands = [
  {
    id: "demo-th-1",
    spot: "BTN · Face au 3bet",
    stackDepth: "25BB",
    description:
      "3bet du SB, j'ai AJo. Call ou fold ? J'ai payé et je suis dominé.",
    handHistory: null,
    link: null,
    status: "A_REVOIR",
    createdAt: daysAgo(1),
  },
  {
    id: "demo-th-2",
    spot: "BB · Défense vs open",
    stackDepth: "40BB",
    description: "Défense trop large vs l'open UTG sur une table à 9.",
    handHistory: null,
    link: null,
    status: "A_REVOIR",
    createdAt: daysAgo(3),
  },
  {
    id: "demo-th-3",
    spot: "SB · 3bet",
    stackDepth: "60BB_PLUS",
    description: "3bet KQs vs CO : taille à revoir, j'ouvre trop petit.",
    handHistory: null,
    link: null,
    status: "REVUE",
    createdAt: daysAgo(9),
  },
];
