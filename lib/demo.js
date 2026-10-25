/**
 * Jeu de données d'exemple, calqué sur les maquettes.
 * Il sert tant que DATABASE_URL n'est pas configurée : l'app est navigable
 * immédiatement, et l'en-tête affiche « Données d'exemple ».
 */

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

const TOURNAMENT_SEEDS = [
  { name: "Monster Stack 50 €", site: "winamax", format: "KO", speed: "NORMAL", buyIn: 45, fee: 5, bounty: 0, reEntries: 1, entrants: 1234, finishPosition: 14, prize: 486, bountiesWon: 0, day: 2 },
  { name: "Sunday Special 22 €", site: "pokerstars", format: "CLASSIC", speed: "NORMAL", buyIn: 20, fee: 2, bounty: 0, reEntries: 0, entrants: 2345, finishPosition: 412, prize: 0, bountiesWon: 0, day: 3 },
  { name: "Hyper 10 €", site: "winamax", format: "KO", speed: "HYPER", buyIn: 4, fee: 1, bounty: 5, reEntries: 0, entrants: 582, finishPosition: 58, prize: 0, bountiesWon: 18, day: 4 },
  { name: "Bounty Builder 30 €", site: "pokerstars", format: "KO", speed: "NORMAL", buyIn: 13.5, fee: 3, bounty: 13.5, reEntries: 0, entrants: 1120, finishPosition: 9, prize: 220, bountiesWon: 95, day: 6 },
  { name: "Expresso 5 €", site: "pmu", format: "SPIN", speed: "HYPER", buyIn: 5, fee: 0, bounty: 0, reEntries: 0, entrants: 3, finishPosition: 2, prize: 0, bountiesWon: 0, day: 9 },
  { name: "Daily 15 €", site: "winamax", format: "CLASSIC", speed: "TURBO", buyIn: 13.5, fee: 1.5, bounty: 0, reEntries: 2, entrants: 440, finishPosition: 31, prize: 58, bountiesWon: 0, day: 11 },
  { name: "Mini Main Event 40 €", site: "pokerstars", format: "CLASSIC", speed: "NORMAL", buyIn: 36, fee: 4, bounty: 0, reEntries: 0, entrants: 1890, finishPosition: 112, prize: 92, bountiesWon: 0, day: 14 },
  { name: "KO Series 25 €", site: "winamax", format: "KO", speed: "NORMAL", buyIn: 11, fee: 2, bounty: 12, reEntries: 1, entrants: 760, finishPosition: 44, prize: 0, bountiesWon: 36, day: 18 },
  { name: "Night Turbo 12 €", site: "winamax", format: "CLASSIC", speed: "TURBO", buyIn: 11, fee: 1, bounty: 0, reEntries: 0, entrants: 320, finishPosition: 3, prize: 410, bountiesWon: 0, day: 22 },
  { name: "Expresso 10 €", site: "pmu", format: "SPIN", speed: "HYPER", buyIn: 10, fee: 0, bounty: 0, reEntries: 0, entrants: 3, finishPosition: 1, prize: 20, bountiesWon: 0, day: 26 },
];

function materialize(seed, index) {
  const entries = 1 + seed.reEntries;
  const totalCost = (seed.buyIn + seed.fee + seed.bounty) * entries;
  const netResult = seed.prize + seed.bountiesWon - totalCost;
  return {
    id: `demo-t-${index}`,
    externalId: `demo-${index}`,
    ...seed,
    playedAt: daysAgo(seed.day),
    totalCost: Math.round(totalCost * 100) / 100,
    netResult: Math.round(netResult * 100) / 100,
    currency: "EUR",
  };
}

export const demoTournaments = TOURNAMENT_SEEDS.map(materialize);

export const demoTransactions = [
  { id: "demo-tx-1", site: "winamax", type: "RAKEBACK", amount: 120, date: daysAgo(3), note: "Rakeback hebdo" },
  { id: "demo-tx-2", site: "pokerstars", type: "RAKEBACK", amount: 45, date: daysAgo(7), note: "Chest" },
  { id: "demo-tx-3", site: "winamax", type: "BONUS", amount: 20, date: daysAgo(12), note: "Ticket Monster Stack" },
  { id: "demo-tx-4", site: "pokerstars", type: "DEPOSIT", amount: 500, date: daysAgo(40), note: null },
  { id: "demo-tx-5", site: "winamax", type: "DEPOSIT", amount: 3000, date: daysAgo(120), note: null },
  { id: "demo-tx-6", site: "pmu", type: "DEPOSIT", amount: 1400, date: daysAgo(150), note: null },
  { id: "demo-tx-7", site: "winamax", type: "ADJUSTMENT", amount: 1182, date: daysAgo(150), note: "Solde initial" },
  { id: "demo-tx-8", site: "pokerstars", type: "ADJUSTMENT", amount: 2290, date: daysAgo(150), note: "Solde initial" },
  { id: "demo-tx-9", site: "winamax", type: "WITHDRAWAL", amount: 300, date: daysAgo(30), note: null },
];

export const demoSites = [
  { slug: "winamax", name: "Winamax", lastImportAt: daysAgo(2) },
  { slug: "pokerstars", name: "PokerStars", lastImportAt: daysAgo(2) },
  { slug: "pmu", name: "PMU", lastImportAt: daysAgo(9) },
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
