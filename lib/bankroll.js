// Calculs de bankroll — fonctions pures, indépendantes de Prisma.

import { FORMATS, OFF_GAME_TYPES } from "./constants.js";

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function inPeriod(date, days) {
  if (days === null || days === undefined) return true;
  const cutoff = Date.now() - days * 86400000;
  return new Date(date).getTime() >= cutoff;
}

/**
 * Solde d'un site = dépôts − retraits + rakeback/bonus/tickets
 *                   + corrections + gains nets des tournois.
 */
export function computeSiteBalance({ tournaments = [], transactions = [] }) {
  let balance = 0;
  for (const t of tournaments) balance += Number(t.netResult);
  for (const tx of transactions) {
    const amount = Number(tx.amount);
    balance += tx.type === "WITHDRAWAL" ? -Math.abs(amount) : amount;
  }
  return round2(balance);
}

/** Résultats sur la période, profit de jeu et hors jeu séparés. */
export function computePeriodResults({ tournaments, transactions, days }) {
  const inRange = tournaments.filter((t) => inPeriod(t.playedAt ?? t.date, days));
  const txInRange = transactions.filter((tx) => inPeriod(tx.date, days));

  const gameProfit = round2(
    inRange.reduce((sum, t) => sum + Number(t.netResult), 0)
  );
  const offGame = round2(
    txInRange
      .filter((tx) => OFF_GAME_TYPES.includes(tx.type))
      .reduce((sum, tx) => sum + Number(tx.amount), 0)
  );
  const buyIns = round2(
    inRange.reduce((sum, t) => sum + Number(t.totalCost), 0)
  );

  const itmCount = inRange.filter(
    (t) => Number(t.prize) + Number(t.bountiesWon) > 0
  ).length;

  return {
    tournamentCount: inRange.length,
    gameProfit,
    offGame,
    // Variation totale = ce que la bankroll a gagné, jeu + hors jeu.
    variation: round2(gameProfit + offGame),
    roi: buyIns > 0 ? round2((gameProfit / buyIns) * 100) : 0,
    itm: inRange.length > 0 ? round2((itmCount / inRange.length) * 100) : 0,
    abi: inRange.length > 0 ? round2(buyIns / inRange.length) : 0,
  };
}

/** Buy-in max autorisé par format, selon le nombre de caves exigé. */
export function computeBuyInLimits(bankroll, rules = []) {
  const byFormat = new Map(rules.map((r) => [r.format, r.buyInsRequired]));
  return FORMATS.map((f) => {
    const buyIns = byFormat.get(f.key) ?? f.defaultBuyIns;
    return {
      format: f.key,
      label: f.label,
      buyIns,
      maxBuyIn: buyIns > 0 ? Math.floor(bankroll / buyIns) : 0,
    };
  });
}

/**
 * « Dans les clous » tant qu'aucun tournoi récent ne dépasse le buy-in max
 * de son format. Renvoie aussi les tournois fautifs pour pouvoir les montrer.
 */
export function checkBuyInCompliance(tournaments, limits, { days = 30 } = {}) {
  const byFormat = new Map(limits.map((l) => [l.format, l.maxBuyIn]));
  const offenders = tournaments.filter((t) => {
    if (!inPeriod(t.playedAt ?? t.date, days)) return false;
    const max = byFormat.get(t.format);
    if (max === undefined) return false;
    const cost = Number(t.buyIn) + Number(t.fee) + Number(t.bounty);
    return cost > max;
  });
  return { compliant: offenders.length === 0, offenders };
}

/** Palier courant et palier suivant, d'après la bankroll. */
export function computeLevelProgress(bankroll, levels = []) {
  const sorted = [...levels].sort(
    (a, b) => Number(a.bankrollRequired) - Number(b.bankrollRequired)
  );
  const next = sorted.find((l) => Number(l.bankrollRequired) > bankroll);
  const current = [...sorted]
    .reverse()
    .find((l) => Number(l.bankrollRequired) <= bankroll);

  return {
    current: current ?? null,
    next: next ?? null,
    required: next ? Number(next.bankrollRequired) : null,
    stopLoss: current ? Number(current.stopLoss) : null,
  };
}

/**
 * Courbe de bankroll : solde cumulé jour par jour sur la période.
 * On remonte depuis le solde actuel pour que la courbe finisse dessus.
 */
export function buildBankrollCurve({
  currentBankroll,
  tournaments,
  transactions,
  days,
}) {
  const events = [
    ...tournaments.map((t) => ({
      at: new Date(t.playedAt ?? t.date).getTime(),
      delta: Number(t.netResult),
    })),
    ...transactions.map((tx) => ({
      at: new Date(tx.date).getTime(),
      delta:
        tx.type === "WITHDRAWAL"
          ? -Math.abs(Number(tx.amount))
          : Number(tx.amount),
    })),
  ].sort((a, b) => a.at - b.at);

  if (events.length === 0) return [];

  const cutoff =
    days === null || days === undefined ? -Infinity : Date.now() - days * 86400000;

  // Solde au début de la période = solde actuel − somme des deltas de la période.
  const inRange = events.filter((e) => e.at >= cutoff);
  const periodDelta = inRange.reduce((s, e) => s + e.delta, 0);

  let running = currentBankroll - periodDelta;
  const curve = [round2(running)];
  for (const e of inRange) {
    running += e.delta;
    curve.push(round2(running));
  }
  return curve;
}
