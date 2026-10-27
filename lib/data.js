/**
 * Couche d'accès aux données.
 * Tant que DATABASE_URL n'est pas configurée, tout vient de lib/demo.js afin
 * que l'app soit navigable (l'en-tête affiche alors « Données d'exemple »).
 */

import { prisma, hasDatabase } from "./db.js";
import { getCurrentUser } from "./user.js";
import {
  demoTournaments,
  demoTransactions,
  demoSites,
  demoThemes,
  demoStudySessions,
  demoWeakSpots,
  demoTaggedHands,
} from "./demo.js";
import {
  computeSiteBalance,
  computePeriodResults,
  computePalier,
  montantSigne,
  buildBankrollCurve,
  filtrerFormatsComptes,
  round2,
} from "./bankroll.js";
import { SITES, PERIODS, TRANSFER_TYPES } from "./constants.js";

export const DEMO = !hasDatabase();

function periodDays(key) {
  return PERIODS.find((p) => p.key === key)?.days ?? 30;
}

async function loadRaw() {
  if (DEMO) {
    return {
      sites: demoSites,
      tournaments: demoTournaments,
      transactions: demoTransactions,
    };
  }

  // Première visite : crée l'utilisateur et les données de référence.
  await getCurrentUser();

  const [sites, tournaments, transactions] = await Promise.all([
    prisma.site.findMany(),
    prisma.tournament.findMany({ include: { site: true } }),
    prisma.transaction.findMany({ include: { site: true } }),
  ]);

  return {
    sites: sites.map((s) => ({ ...s, slug: s.slug })),
    tournaments: tournaments.map((t) => ({ ...t, site: t.site.slug })),
    transactions: transactions.map((t) => ({ ...t, site: t.site.slug })),
  };
}

/**
 * Les deux moitiés d'un transfert n'en font qu'une dans la liste des
 * mouvements : « Winamax → Betclic » dit tout, deux lignes jumelles ne
 * diraient pas mieux et prendraient la place de deux vrais mouvements.
 * Une moitié orpheline — l'autre room supprimée — reste affichée seule.
 */
function regrouperTransferts(transactions) {
  const paires = new Map();
  for (const tx of transactions) {
    if (!tx.transferId) continue;
    const paire = paires.get(tx.transferId) ?? {};
    paire[tx.type] = tx;
    paires.set(tx.transferId, paire);
  }

  return transactions.flatMap((tx) => {
    if (!TRANSFER_TYPES.includes(tx.type) || !tx.transferId) return [tx];
    const { TRANSFER_OUT: depart, TRANSFER_IN: arrivee } =
      paires.get(tx.transferId) ?? {};
    if (!depart || !arrivee) return [tx];
    if (tx.type === "TRANSFER_IN") return [];
    return [{ ...tx, versSite: arrivee.site }];
  });
}

/** Tout ce dont l'écran /bankroll a besoin, en une passe. */
export async function getBankrollOverview(periodKey = "30") {
  const days = periodDays(periodKey);
  const { sites, tournaments, transactions } = await loadRaw();

  const bySite = (sites.length ? sites : SITES).map((site) => {
    const slug = site.slug;
    const siteTournaments = tournaments.filter((t) => t.site === slug);
    const siteTransactions = transactions.filter((t) => t.site === slug);
    const balance = computeSiteBalance({
      tournaments: siteTournaments,
      transactions: siteTransactions,
    });
    const period = computePeriodResults({
      tournaments: siteTournaments,
      transactions: siteTransactions,
      days,
    });
    return {
      slug,
      name: site.name,
      lastImportAt: site.lastImportAt ?? null,
      balance,
      variation: period.variation,
      tournamentCount: siteTournaments.length,
      // Le palier se lit sur le solde de la room, pas sur la bankroll
      // totale : c'est là qu'on joue, c'est là que l'argent doit être.
      palier: computePalier({
        tournaments: siteTournaments,
        transactions: siteTransactions,
      }),
    };
  });

  const bankroll = round2(bySite.reduce((s, x) => s + x.balance, 0));
  const results = computePeriodResults({ tournaments, transactions, days });
  // « Dans les clous » veut dire : dans les clous partout. Une seule room
  // au-dessus de son plafond fait basculer le badge.
  const compliance = {
    compliant: bySite.every((s) => s.palier.compliant),
    offenders: bySite.flatMap((s) => s.palier.offenders),
  };
  const curve = buildBankrollCurve({
    currentBankroll: bankroll,
    tournaments,
    transactions,
    days,
  });

  const nomDeRoom = (slug) =>
    bySite.find((s) => s.slug === slug)?.name ?? slug;

  // Un tournoi inscrit dont le résultat n'a jamais été saisi pèse sur le
  // solde comme une perte sèche. C'est juste — l'argent est bien sorti —
  // mais ça mérite d'être dit, sinon le solde paraît faux.
  const enCours = tournaments.filter((t) => t.inProgress);
  const aSolder = {
    count: enCours.length,
    engage: round2(enCours.reduce((s, t) => s + Number(t.totalCost), 0)),
  };

  const movements = regrouperTransferts(transactions)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)
    .map((tx) => ({
      id: tx.id,
      site: nomDeRoom(tx.site),
      // Un transfert affiche son trajet plutôt qu'un simple nom de room.
      versSite: tx.versSite ? nomDeRoom(tx.versSite) : null,
      type: tx.type,
      amount: tx.versSite ? Math.abs(Number(tx.amount)) : montantSigne(tx),
      date: tx.date,
      note: tx.note,
    }));

  return {
    demo: DEMO,
    periodKey,
    bankroll,
    results,
    bySite,
    compliance,
    aSolder,
    curve,
    movements,
  };
}

/** Ventilation des résultats par format / buy-in / site. */
export async function getBreakdown(periodKey = "30", dimension = "format") {
  const days = periodDays(periodKey);
  const { tournaments, sites } = await loadRaw();
  const cutoff = days === null ? -Infinity : Date.now() - days * 86400000;
  const inRange = filtrerFormatsComptes(tournaments).filter(
    (t) => new Date(t.playedAt ?? t.date).getTime() >= cutoff
  );

  const keyOf = (t) => {
    if (dimension === "site") {
      return sites.find((s) => s.slug === t.site)?.name ?? t.site;
    }
    if (dimension === "buyin") {
      const cost = Number(t.buyIn) + Number(t.fee) + Number(t.bounty);
      if (cost < 10) return "< 10 €";
      if (cost < 25) return "10 – 25 €";
      if (cost < 50) return "25 – 50 €";
      if (cost < 100) return "50 – 100 €";
      return "100 € +";
    }
    return t.format;
  };

  const groups = new Map();
  for (const t of inRange) {
    const key = keyOf(t);
    const g = groups.get(key) ?? { key, count: 0, net: 0, cost: 0, itm: 0 };
    g.count += 1;
    g.net += Number(t.netResult);
    g.cost += Number(t.totalCost);
    if (Number(t.prize) > 0) g.itm += 1;
    groups.set(key, g);
  }

  return [...groups.values()]
    .map((g) => ({
      key: g.key,
      count: g.count,
      net: round2(g.net),
      roi: g.cost > 0 ? round2((g.net / g.cost) * 100) : 0,
      itm: g.count > 0 ? round2((g.itm / g.count) * 100) : 0,
    }))
    .sort((a, b) => b.net - a.net);
}

/** Données du tableau de bord d'accueil. */
export async function getDashboard() {
  const overview = await getBankrollOverview("30");
  const study = await getStudyOverview();

  const staleSites = overview.bySite.filter((s) => {
    if (!s.lastImportAt) return true;
    return Date.now() - new Date(s.lastImportAt).getTime() > 7 * 86400000;
  });

  return {
    demo: DEMO,
    bankroll: overview.bankroll,
    variation: overview.results.variation,
    study,
    weakSpots: DEMO ? demoWeakSpots : await getWeakSpots(),
    staleSites,
  };
}

export async function getStudyOverview() {
  const user = DEMO ? null : await getCurrentUser();
  const themes = DEMO
    ? demoThemes
    : await prisma.studyTheme.findMany({ orderBy: { position: "asc" } });
  const sessions = DEMO
    ? demoStudySessions
    : await prisma.studySession.findMany({ orderBy: { date: "desc" }, take: 50 });

  // La cible vient des réglages : elle était codée en dur alors que le
  // modèle Settings la porte déjà.
  const settings = DEMO
    ? null
    : await prisma.settings.findUnique({ where: { userId: user.id } });
  const daysTarget = settings?.weeklyStudyDays ?? 5;
  const minutesPerDay = settings?.dailyStudyMinutes ?? 75;

  // Semaine glissante de 7 jours.
  const weekAgo = Date.now() - 7 * 86400000;
  const weekSessions = sessions.filter(
    (s) => new Date(s.date).getTime() >= weekAgo
  );
  const minutesDone = weekSessions.reduce((sum, s) => sum + s.minutes, 0);
  const daysDone = new Set(
    weekSessions.map((s) => new Date(s.date).toDateString())
  ).size;

  // Minutes par type, pour savoir où part le temps : une semaine à 100 % de
  // théorie et 0 % de drill ne se voit pas dans un total.
  const parType = {};
  for (const s of weekSessions) {
    parType[s.type] = (parType[s.type] ?? 0) + s.minutes;
  }

  // Sept jours, du plus ancien au plus récent, pour la barre de régularité.
  const joursSemaine = [];
  for (let i = 6; i >= 0; i -= 1) {
    const jour = new Date(Date.now() - i * 86400000);
    const minutes = weekSessions
      .filter((s) => new Date(s.date).toDateString() === jour.toDateString())
      .reduce((somme, s) => somme + s.minutes, 0);
    joursSemaine.push({ date: jour, minutes });
  }

  const taggedHands = await getTaggedHands();

  return {
    currentTheme: themes[0] ?? null,
    themes,
    sessions,
    minutesDone,
    minutesTarget: daysTarget * minutesPerDay,
    minutesPerDay,
    daysDone,
    daysTarget,
    parType,
    joursSemaine,
    taggedHands,
    aRevoir: taggedHands.filter((h) => h.status === "A_REVOIR").length,
  };
}

/** Les mains mises de côté, les plus récentes d'abord. */
export async function getTaggedHands() {
  if (DEMO) return demoTaggedHands;
  await getCurrentUser();

  const hands = await prisma.taggedHand.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return hands.map((h) => ({
    id: h.id,
    spot: h.spot,
    stackDepth: h.stackDepth,
    description: h.description,
    handHistory: h.handHistory,
    link: h.link,
    status: h.status,
    createdAt: h.createdAt,
  }));
}

export async function getWeakSpots() {
  if (DEMO) return demoWeakSpots;

  const attempts = await prisma.drillAttempt.findMany({
    include: { range: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const groups = new Map();
  for (const a of attempts) {
    const key = `${a.range.position} ${a.range.action} · ${a.range.stackDepth}`;
    const g = groups.get(key) ?? { spot: key, attempts: 0, hits: 0 };
    g.attempts += 1;
    if (a.correct) g.hits += 1;
    groups.set(key, g);
  }

  return [...groups.values()]
    .filter((g) => g.attempts >= 10)
    .map((g) => ({
      spot: g.spot,
      attempts: g.attempts,
      success: Math.round((g.hits / g.attempts) * 100),
    }))
    .sort((a, b) => a.success - b.success)
    .slice(0, 3);
}


/* ------------------------------------------------------------------ */
/* Sessions de jeu                                                     */
/* ------------------------------------------------------------------ */

/** Les champs d'un tournoi tels que les écrans de session les attendent. */
function tournoiDeSession(t) {
  return {
    ...t,
    buyIn: Number(t.buyIn),
    fee: Number(t.fee),
    bounty: Number(t.bounty),
    prize: Number(t.prize),
    bountiesWon: Number(t.bountiesWon),
    totalCost: Number(t.totalCost),
    netResult: Number(t.netResult),
    levelMinutes: t.levelMinutes,
    siteName: t.site.name,
    siteSlug: t.site.slug,
  };
}

/** La session ouverte, avec ses tournois. Null s'il n'y en a pas. */
export async function getSessionOuverte() {
  if (DEMO) return null;
  await getCurrentUser();

  const session = await prisma.session.findFirst({
    where: { endedAt: null },
    orderBy: { startedAt: "desc" },
    include: {
      tournaments: {
        orderBy: { playedAt: "desc" },
        include: { site: true },
      },
    },
  });
  if (!session) return null;

  return {
    ...session,
    tournaments: session.tournaments.map(tournoiDeSession),
  };
}

/**
 * La grille : les tournois que le joueur inscrit habituellement.
 * `tous` inclut les tournois désactivés — utile à l'écran de gestion, pas à
 * celui d'inscription.
 */
export async function getGrille({ tous = false } = {}) {
  if (DEMO) return [];
  await getCurrentUser();

  const modeles = await prisma.tournamentTemplate.findMany({
    where: tous ? {} : { active: true },
    orderBy: { position: "asc" },
    include: { site: true, _count: { select: { entries: true } } },
  });

  return modeles.map((m) => ({
    id: m.id,
    name: m.name,
    siteName: m.site.name,
    siteSlug: m.site.slug,
    buyIn: Number(m.buyIn),
    fee: Number(m.fee),
    bounty: Number(m.bounty),
    cout: Math.round((Number(m.buyIn) + Number(m.fee) + Number(m.bounty)) * 100) / 100,
    format: m.format,
    speed: m.speed,
    levelMinutes: m.levelMinutes,
    tag: m.tag,
    usualHour: m.usualHour,
    position: m.position,
    active: m.active,
    joues: m._count.entries,
  }));
}

/**
 * Les tournois restés en cours en dehors de la session ouverte.
 *
 * Clore une session laisse volontairement ses tournois en cours — on peut
 * sortir d'un tournoi après avoir rangé la session. Mais leur coût est déjà
 * engagé, donc tant que le résultat n'est pas saisi, la bankroll les compte
 * en perte sèche. Sans cet écran ils deviendraient invisibles, et le solde
 * resterait faux sans qu'on sache pourquoi.
 */
export async function getTournoisASolder() {
  if (DEMO) return [];
  await getCurrentUser();

  const ouverte = await prisma.session.findFirst({
    where: { endedAt: null },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  const tournois = await prisma.tournament.findMany({
    where: {
      inProgress: true,
      // Ceux de la session ouverte sont « en jeu », pas « à solder ».
      ...(ouverte ? { NOT: { sessionId: ouverte.id } } : {}),
    },
    orderBy: { playedAt: "desc" },
    include: { site: true },
  });

  return tournois.map(tournoiDeSession);
}

/** Les dernières sessions closes, pour l'historique. */
export async function getSessionsRecentes(limite = 10) {
  if (DEMO) return [];

  const sessions = await prisma.session.findMany({
    where: { endedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    take: limite,
    include: { tournaments: true },
  });

  return sessions.map((s) => ({
    id: s.id,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    note: s.note,
    tournaments: s.tournaments.map((t) => ({
      format: t.format,
      totalCost: Number(t.totalCost),
      prize: Number(t.prize),
      bountiesWon: Number(t.bountiesWon),
      inProgress: t.inProgress,
    })),
  }));
}

/**
 * Mains dont la révision est due : ratées au dernier passage, ou dont
 * l'intervalle est écoulé.
 *
 * On ne garde que le passage le plus récent de chaque main dans chaque
 * range — c'est lui qui porte l'état courant. Les plus anciens sont
 * l'historique, et leur `dueAt` est périmé par construction.
 */
export async function getDrillsDus() {
  if (DEMO) return [];
  await getCurrentUser();

  // Fenêtre bornée : au-delà, les passages les plus anciens ne décrivent
  // plus l'état courant d'une main, puisqu'un passage récent l'a remplacé.
  const passages = await prisma.drillAttempt.findMany({
    orderBy: { createdAt: "desc" },
    take: 3000,
    include: {
      range: { select: { position: true, action: true, stackDepth: true } },
    },
  });

  const vues = new Set();
  const dues = [];
  const maintenant = Date.now();

  for (const passage of passages) {
    const cle = `${passage.rangeId}#${passage.hand}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    if (new Date(passage.dueAt).getTime() > maintenant) continue;

    const { position, action, stackDepth } = passage.range;
    dues.push({
      spot: `${position}|${action}|${stackDepth}`,
      main: passage.hand,
      ratee: passage.repetition === 0,
    });
  }

  return dues;
}
