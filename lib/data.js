/**
 * Couche d'accès aux données.
 * Tant que DATABASE_URL n'est pas configurée, tout vient de lib/demo.js afin
 * que l'app soit navigable (l'en-tête affiche alors « Données d'exemple »).
 */

import { prisma, hasDatabase } from "./db.js";
import {
  demoTournaments,
  demoTransactions,
  demoSites,
  demoLevels,
  demoRules,
  demoThemes,
  demoStudySessions,
  demoWeakSpots,
} from "./demo.js";
import {
  computeSiteBalance,
  computePeriodResults,
  computeBuyInLimits,
  checkBuyInCompliance,
  computeLevelProgress,
  buildBankrollCurve,
  filtrerFormatsComptes,
  round2,
} from "./bankroll.js";
import { SITES, PERIODS } from "./constants.js";

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
      levels: demoLevels,
      rules: demoRules,
    };
  }

  const [sites, tournaments, transactions, levels, rules] = await Promise.all([
    prisma.site.findMany(),
    prisma.tournament.findMany({ include: { site: true } }),
    prisma.transaction.findMany({ include: { site: true } }),
    prisma.bankrollLevel.findMany({ orderBy: { position: "asc" } }),
    prisma.bankrollRule.findMany(),
  ]);

  return {
    sites: sites.map((s) => ({ ...s, slug: s.slug })),
    tournaments: tournaments.map((t) => ({ ...t, site: t.site.slug })),
    transactions: transactions.map((t) => ({ ...t, site: t.site.slug })),
    levels,
    rules,
  };
}

/** Tout ce dont l'écran /bankroll a besoin, en une passe. */
export async function getBankrollOverview(periodKey = "30") {
  const days = periodDays(periodKey);
  const { sites, tournaments, transactions, levels, rules } = await loadRaw();

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
    };
  });

  const bankroll = round2(bySite.reduce((s, x) => s + x.balance, 0));
  const results = computePeriodResults({ tournaments, transactions, days });
  const limits = computeBuyInLimits(bankroll, rules);
  const compliance = checkBuyInCompliance(tournaments, limits);
  const level = computeLevelProgress(bankroll, levels);
  const curve = buildBankrollCurve({
    currentBankroll: bankroll,
    tournaments,
    transactions,
    days,
  });

  const movements = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)
    .map((tx) => ({
      id: tx.id,
      site: bySite.find((s) => s.slug === tx.site)?.name ?? tx.site,
      type: tx.type,
      amount: tx.type === "WITHDRAWAL" ? -Math.abs(Number(tx.amount)) : Number(tx.amount),
      date: tx.date,
      note: tx.note,
    }));

  return {
    demo: DEMO,
    periodKey,
    bankroll,
    results,
    bySite,
    limits,
    compliance,
    level,
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
  const themes = DEMO
    ? demoThemes
    : await prisma.studyTheme.findMany({ orderBy: { position: "asc" } });
  const sessions = DEMO
    ? demoStudySessions
    : await prisma.studySession.findMany({ orderBy: { date: "desc" }, take: 50 });

  // Semaine glissante de 7 jours.
  const weekAgo = Date.now() - 7 * 86400000;
  const weekSessions = sessions.filter(
    (s) => new Date(s.date).getTime() >= weekAgo
  );
  const minutesDone = weekSessions.reduce((sum, s) => sum + s.minutes, 0);
  const daysDone = new Set(
    weekSessions.map((s) => new Date(s.date).toDateString())
  ).size;

  const targetDays = 5;
  const targetMinutesPerDay = 75;

  return {
    currentTheme: themes[0] ?? null,
    themes,
    sessions,
    minutesDone,
    minutesTarget: targetDays * targetMinutesPerDay,
    daysDone,
    daysTarget: targetDays,
  };
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

/** La session ouverte, avec ses tournois. Null s'il n'y en a pas. */
export async function getSessionOuverte() {
  if (DEMO) return null;

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
    tournaments: session.tournaments.map((t) => ({
      ...t,
      buyIn: Number(t.buyIn),
      fee: Number(t.fee),
      bounty: Number(t.bounty),
      prize: Number(t.prize),
      bountiesWon: Number(t.bountiesWon),
      totalCost: Number(t.totalCost),
      netResult: Number(t.netResult),
      siteName: t.site.name,
    })),
  };
}

/** La grille : les tournois que le joueur inscrit habituellement. */
export async function getGrille() {
  if (DEMO) return [];

  const modeles = await prisma.tournamentTemplate.findMany({
    where: { active: true },
    orderBy: { position: "asc" },
    include: { site: true },
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
    usualHour: m.usualHour,
    position: m.position,
  }));
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
