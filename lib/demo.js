import { ALL_HANDS } from "./hands.js";
import { jourLocal, jourDecale, normaliserFin } from "./agenda.js";
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

export const demoThemes = [
  {
    id: "demo-th-1",
    title: "RFI par position et par tapis",
    block: "Préflop par profondeur",
    weekFrom: 1,
    weekTo: 2,
    objectives: [
      { label: "Drill RFI toutes positions : 200 mains à 90 %", done: true },
      { label: "Revoir 10 opens où tu as hésité en session", done: false },
      {
        label:
          "Relever tes 5 plus gros écarts entre ce que tu ouvres et ce que tu joues vraiment",
        done: false,
      },
    ],
  },
  {
    id: "demo-th-2",
    title: "Défense BB vs open",
    block: "Préflop par profondeur",
    weekFrom: 3,
    weekTo: 4,
    objectives: [
      { label: "Drill défense BB : 150 mains à 85 %", done: false },
      { label: "Revoir 10 défenses BB jouées en session", done: false },
    ],
  },
  {
    id: "demo-th-3",
    title: "Push/fold et resteal sous 20bb",
    block: "Préflop par profondeur",
    weekFrom: 4,
    weekTo: 4,
    objectives: [
      { label: "Drill push/fold 12–20bb : 200 mains à 95 %", done: false },
      { label: "Revoir 10 shoves limites joués en session", done: false },
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
  { spot: "Push/fold LJ · 12bb", success: 71, attempts: 150 },
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
    description: "Défense trop large vs l'open du lojack.",
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

/**
 * Ranges d'exemple.
 *
 * Sans elles, le mode démo annonce « Données d'exemple » puis montre un
 * éditeur vide et un trainer sans question : l'app n'est pas navigable
 * pour qui n'a pas encore branché sa base. Les ranges sont écrites en
 * compréhension — une table de 169 entrées serait illisible et fausse au
 * premier ajustement.
 */
const RANGS = "AKQJT98765432";
const rang = (lettre) => RANGS.indexOf(lettre);

function cellules(predicat) {
  const cells = {};
  for (const main of ALL_HANDS) {
    const actions = predicat(main);
    if (actions) cells[main] = actions;
  }
  return cells;
}

/** Vrai si la seconde carte est au moins aussi forte que `plancher`. */
const auMoins = (main, plancher) => rang(main[1]) <= rang(plancher);

const btnRfi = (main) => {
  const paire = main.length === 2;
  if (paire) return { raise: 100 };

  const haute = main[0];
  const assortie = main.endsWith("s");
  const seuils = assortie
    ? { A: "2", K: "2", Q: "4", J: "6", T: "6", 9: "5", 8: "5", 7: "5", 6: "4", 5: "4" }
    : { A: "2", K: "9", Q: "9", J: "9", T: "9" };

  const plancher = seuils[haute];
  return plancher && auMoins(main, plancher) ? { raise: 100 } : null;
};

const bbDefense = (main) => {
  const paire = main.length === 2;
  const haute = main[0];
  const assortie = main.endsWith("s");

  // Les très fortes mains relancent, le reste suit — et quelques mains
  // mélangent, ce qui est justement ce qu'on vient travailler.
  if (paire) {
    if (auMoins(`${haute}${haute}`, "T")) return { raise: 100 };
    return { call: 100 };
  }
  if (assortie && haute === "A") {
    if (auMoins(main, "Q")) return { raise: 100 };
    if (rang(main[1]) >= rang("5")) return { raise: 50, call: 50 };
    return { call: 100 };
  }
  if (!assortie && haute === "A") {
    return auMoins(main, "J") ? { raise: 60, call: 40 } : { call: 100 };
  }
  if (assortie && haute === "K") return auMoins(main, "9") ? { call: 100 } : null;
  if (assortie && haute === "Q") return auMoins(main, "9") ? { call: 100 } : null;
  if (assortie && haute === "J") return auMoins(main, "9") ? { call: 100 } : null;
  if (assortie && ["T", "9", "8", "7", "6"].includes(haute)) {
    return rang(main[1]) === rang(haute) + 1 ? { call: 100 } : null;
  }
  if (!assortie && haute === "K") return auMoins(main, "T") ? { call: 100 } : null;
  if (!assortie && haute === "Q") return auMoins(main, "J") ? { call: 100 } : null;
  return null;
};

const sb3bet = (main) => {
  const paire = main.length === 2;
  const haute = main[0];
  const assortie = main.endsWith("s");

  if (paire) return auMoins(`${haute}${haute}`, "9") ? { raise: 100 } : null;
  if (haute === "A") {
    if (auMoins(main, "Q")) return { raise: 100 };
    if (assortie && rang(main[1]) >= rang("5")) return { raise: 100 };
    return null;
  }
  if (assortie && haute === "K") return auMoins(main, "J") ? { raise: 100 } : null;
  if (!assortie && haute === "K") return auMoins(main, "Q") ? { raise: 100 } : null;
  return null;
};

export const demoRanges = {
  "BTN|RFI|60BB_PLUS": cellules(btnRfi),
  "BB|DEF_VS_OPEN|25BB": cellules(bbDefense),
  "SB|3BET|40BB": cellules(sb3bet),
};

/* ------------------------------------------------------------------ */
/* Compte bancaire                                                     */
/* ------------------------------------------------------------------ */

/**
 * Les retraits et dépôts poker ne figurent pas ici : ils sont déjà dans
 * `demoTransactions` et le compte les reflète (lib/compte.js). Les y
 * recopier montrerait deux fois le même retrait de 300 €.
 */
export const demoBankEntries = [
  { id: "demo-be-1", date: daysAgo(2), label: "Courses", amount: 86.4, flow: "EXPENSE", category: "courses", note: null },
  { id: "demo-be-2", date: daysAgo(4), label: "Vercel Pro", amount: 20, flow: "EXPENSE", category: "infra", note: null },
  { id: "demo-be-3", date: daysAgo(5), label: "Essence", amount: 62, flow: "EXPENSE", category: "transport", note: null },
  { id: "demo-be-4", date: daysAgo(8), label: "Loyer", amount: 780, flow: "EXPENSE", category: "loyer", note: "Novembre" },
  { id: "demo-be-5", date: daysAgo(9), label: "Abonnements (box, mobile, streaming)", amount: 64.9, flow: "EXPENSE", category: "abonnements", note: null },
  { id: "demo-be-6", date: daysAgo(11), label: "Courses", amount: 112.3, flow: "EXPENSE", category: "courses", note: null },
  { id: "demo-be-7", date: daysAgo(14), label: "Restaurant", amount: 48, flow: "EXPENSE", category: "loisirs", note: null },
  { id: "demo-be-8", date: daysAgo(18), label: "URSSAF — acompte trimestriel", amount: 410, flow: "EXPENSE", category: "impots", note: null },
  { id: "demo-be-9", date: daysAgo(21), label: "Mutuelle", amount: 42, flow: "EXPENSE", category: "sante", note: null },
  { id: "demo-be-10", date: daysAgo(24), label: "Courses", amount: 94.2, flow: "EXPENSE", category: "courses", note: null },
  { id: "demo-be-11", date: daysAgo(26), label: "Railway — bases de prod", amount: 18.5, flow: "EXPENSE", category: "infra", note: null },
  { id: "demo-be-12", date: daysAgo(6), label: "Remboursement mutuelle", amount: 36, flow: "INCOME", category: "remboursement", note: null },
];

export const demoRecurringCharges = [
  { id: "demo-rc-1", label: "Loyer", amount: 780, category: "loyer", dayOfMonth: 5, active: true },
  { id: "demo-rc-2", label: "Box et mobile", amount: 44.9, category: "abonnements", dayOfMonth: 8, active: true },
  { id: "demo-rc-3", label: "Mutuelle", amount: 42, category: "sante", dayOfMonth: 10, active: true },
  { id: "demo-rc-4", label: "Vercel Pro", amount: 20, category: "infra", dayOfMonth: 1, active: true },
  { id: "demo-rc-5", label: "Railway", amount: 18.5, category: "infra", dayOfMonth: 1, active: true },
];

/** Solde d'ouverture du compte, et le jour où il a été relevé. */
export const demoBankOpening = { balance: 2850, at: daysAgo(60) };

/* ------------------------------------------------------------------ */
/* Projets web                                                         */
/* ------------------------------------------------------------------ */

export const demoProjects = [
  {
    id: "demo-pj-1",
    name: "Refonte site vitrine",
    client: "Atelier Vigneron",
    amount: 3200,
    stage: "EN_COURS",
    billing: "A_FACTURER",
    devisAt: daysAgo(48),
    invoicedAt: null,
    paidAt: null,
    deadline: daysAgo(-12),
    url: "https://atelier-vigneron.fr",
    note: "Reste la page contact et le formulaire.",
    position: 0,
  },
  {
    id: "demo-pj-2",
    name: "Boutique en ligne",
    client: "Savonnerie du Port",
    amount: 5400,
    stage: "EN_COURS",
    billing: "FACTURE",
    devisAt: daysAgo(90),
    invoicedAt: daysAgo(16),
    paidAt: null,
    deadline: daysAgo(-5),
    url: null,
    note: "Facture envoyée le 12, paiement à 30 jours.",
    position: 1,
  },
  {
    id: "demo-pj-3",
    name: "Landing page campagne",
    client: "Studio Lumen",
    amount: 900,
    stage: "TERMINE",
    billing: "PAYE",
    devisAt: daysAgo(70),
    invoicedAt: daysAgo(40),
    paidAt: daysAgo(22),
    deadline: null,
    url: null,
    note: null,
    position: 2,
  },
  {
    id: "demo-pj-4",
    name: "Application de réservation",
    client: "Le Clos des Lilas",
    amount: 7500,
    stage: "DEVIS_ENVOYE",
    billing: "A_FACTURER",
    devisAt: daysAgo(27),
    invoicedAt: null,
    paidAt: null,
    deadline: null,
    url: null,
    note: "Sans réponse — relancer.",
    position: 3,
  },
  {
    id: "demo-pj-5",
    name: "Tableau de bord interne",
    client: "Transports Keller",
    amount: 4200,
    stage: "IDEE",
    billing: "A_FACTURER",
    devisAt: null,
    invoicedAt: null,
    paidAt: null,
    deadline: null,
    url: null,
    note: "Premier échange, chiffrage à faire.",
    position: 4,
  },
];

export const demoAccesses = [
  { id: "demo-ac-1", projectId: "demo-pj-1", service: "vercel", account: "moi@exemple.fr", resource: "atelier-vigneron", url: "https://vercel.com", note: null, position: 0 },
  { id: "demo-ac-2", projectId: "demo-pj-1", service: "ovh", account: "moi@exemple.fr", resource: "atelier-vigneron.fr", url: null, note: "Renouvellement en mars.", position: 1 },
  { id: "demo-ac-3", projectId: "demo-pj-2", service: "vercel", account: "studio@exemple.fr", resource: "savonnerie-port", url: null, note: null, position: 0 },
  { id: "demo-ac-4", projectId: "demo-pj-2", service: "railway", account: "studio@exemple.fr", resource: "savonnerie-prod", url: null, note: "Base Postgres, région eu-west.", position: 1 },
  { id: "demo-ac-5", projectId: "demo-pj-2", service: "stripe", account: "studio@exemple.fr", resource: "Savonnerie du Port", url: null, note: "Compte du client, accès délégué.", position: 2 },
  { id: "demo-ac-6", projectId: "demo-pj-2", service: "resend", account: "studio@exemple.fr", resource: "mail.savonnerie-port.fr", url: null, note: null, position: 3 },
  { id: "demo-ac-7", projectId: null, service: "github", account: "moi@exemple.fr", resource: "compte perso", url: null, note: "Tous les dépôts y sont.", position: 0 },
];

/**
 * Agenda d'exemple : trois semaines de rythme plausible, posées en relatif
 * par rapport à aujourd'hui pour que la fenêtre glissante ne soit jamais vide.
 *
 * Le rythme imité : étude l'après-midi, grind le soir jusqu'au milieu de la
 * nuit, projets web le matin en semaine, et des trous — un agenda complet à
 * trente jours sur trente n'existe pas.
 */
export const demoPlanBlocks = (() => {
  const creneaux = [];
  let n = 0;

  const poser = (ecart, kind, start, end, extra = {}) => {
    creneaux.push({
      id: `demo-pb-${++n}`,
      jour: jourDecale(jourLocal(), ecart),
      kind,
      startMinute: start,
      endMinute: normaliserFin(start, end),
      projectId: null,
      projet: null,
      note: null,
      ...extra,
    });
  };

  const h = (heures, minutes = 0) => heures * 60 + minutes;

  for (let jour = 0; jour < 21; jour += 1) {
    const semaine = Math.floor(jour / 7);
    // Le jour de la semaine de la date visée, pour varier les journées.
    const nom = new Date(Date.now() + jour * 86400000).getDay();
    const dimanche = nom === 0;
    const samedi = nom === 6;

    // Un lundi sur deux reste vide : c'est la coupure.
    if (nom === 1 && semaine % 2 === 0) continue;

    if (!dimanche && !samedi) {
      poser(jour, "PROJET", h(9, 30), h(12, 30), {
        projectId: jour % 4 === 0 ? "demo-pj-2" : "demo-pj-1",
        projet: jour % 4 === 0 ? "Boutique en ligne" : "Refonte site vitrine",
      });
    }

    if (nom !== 2) {
      poser(jour, "ETUDE", h(14, 30), nom === 6 ? h(17) : h(16, 15), {
        note: nom === 6 ? "Revue de mains de la semaine." : null,
      });
    }

    if (!dimanche) {
      // Le grind du soir déborde sur le lendemain : 19 h → 1 h 30.
      poser(jour, "GRIND", samedi ? h(18, 45) : h(19), samedi ? h(2) : h(1, 30));
    }
  }

  return creneaux;
})();
