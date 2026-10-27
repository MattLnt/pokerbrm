// Calculs de bankroll — fonctions pures, indépendantes de Prisma.

import {
  FORMATS_COMPTES,
  OFF_GAME_TYPES,
  PALIERS_BUYIN,
  SORTIES,
} from "./constants.js";

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function inPeriod(date, days) {
  if (days === null || days === undefined) return true;
  const cutoff = Date.now() - days * 86400000;
  return new Date(date).getTime() >= cutoff;
}

/**
 * Ce qu'un mouvement ajoute au solde de sa room. Les sorties — retraits et
 * transferts sortants — sont saisies en positif et comptent en négatif : on
 * ne demande pas à l'utilisateur de taper un signe moins.
 */
export function montantSigne(tx) {
  const amount = Number(tx.amount);
  return SORTIES.includes(tx.type) ? -Math.abs(amount) : amount;
}

/**
 * Solde d'une room = dépôts − retraits ± transferts + rakeback/bonus/tickets
 *                    + corrections + gains nets des tournois.
 */
export function computeSiteBalance({ tournaments = [], transactions = [] }) {
  let balance = 0;
  for (const t of tournaments) balance += Number(t.netResult);
  for (const tx of transactions) balance += montantSigne(tx);
  return round2(balance);
}

/** Ne garde que les formats suivis (MTT), hors Spins. */
export function filtrerFormatsComptes(tournaments) {
  return tournaments.filter((t) => FORMATS_COMPTES.includes(t.format));
}

/**
 * Résultats sur la période, profit de jeu et hors jeu séparés.
 * Seuls les formats suivis comptent ; les Spins sont écartés.
 */
export function computePeriodResults({ tournaments, transactions, days }) {
  const inRange = filtrerFormatsComptes(tournaments).filter((t) =>
    inPeriod(t.playedAt ?? t.date, days)
  );
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

  // ITM = places payées atteintes. Les primes KO ne comptent pas : on ramasse
  // des bounties en éliminant des joueurs bien avant la bulle.
  const itmCount = inRange.filter((t) => Number(t.prize) > 0).length;

  return {
    tournamentCount: inRange.length,
    gameProfit,
    offGame,
    // Variation totale = ce que la bankroll a gagné, jeu + hors jeu.
    variation: round2(gameProfit + offGame),
    roi: buyIns > 0 ? round2((gameProfit / buyIns) * 100) : 0,
    itm: inRange.length > 0 ? round2((itmCount / inRange.length) * 100) : 0,
  };
}

/** Prix du ticket : buy-in + rake + prime. Les re-entries n'en font pas partie. */
export function coutBuyIn(t) {
  return round2(Number(t.buyIn) + Number(t.fee) + Number(t.bounty));
}

/** Les mouvements de bankroll, tournois et transactions, remis dans l'ordre. */
function chronologie({ tournaments, transactions }) {
  return [
    ...tournaments.map((t) => ({
      at: new Date(t.playedAt ?? t.date).getTime(),
      delta: Number(t.netResult),
      tournament: t,
    })),
    ...transactions.map((tx) => ({
      at: new Date(tx.date).getTime(),
      delta: montantSigne(tx),
      tournament: null,
    })),
  ].sort((a, b) => a.at - b.at);
}

/**
 * Le palier joué dans une room, et les tournois qui en sont sortis.
 *
 * À appeler avec les tournois et les mouvements d'**une seule room** : la
 * gestion de bankroll est par room, c'est son solde qui ouvre ses paliers.
 *
 * Monter et descendre n'ont pas le même seuil : entre 2 000 et 2 500 €, le
 * palier dépend du chemin parcouru, pas du seul solde. Le solde actuel ne
 * suffit donc pas à le dire — on rejoue l'historique depuis zéro et on
 * applique les montées et les descentes au fur et à mesure.
 *
 * Même passe pour la conformité : chaque tournoi est jugé sur le palier en
 * vigueur le jour où il a été joué, avant que son résultat ne bouge la
 * bankroll. Un tournoi à 20 € joué quand le palier était à 10 € reste une
 * sortie de route, même si la bankroll a doublé depuis.
 */
export function computePalier({
  tournaments = [],
  transactions = [],
  paliers = PALIERS_BUYIN,
  days = 30,
} = {}) {
  const cutoff =
    days === null || days === undefined ? -Infinity : Date.now() - days * 86400000;

  let index = 0;
  let balance = 0;
  const offenders = [];

  for (const e of chronologie({ tournaments, transactions })) {
    const t = e.tournament;
    if (
      t &&
      e.at >= cutoff &&
      FORMATS_COMPTES.includes(t.format) &&
      coutBuyIn(t) > paliers[index].buyInMax
    ) {
      offenders.push(t);
    }

    balance = round2(balance + e.delta);
    // Un gros gain peut faire sauter deux paliers, un gros trou en faire
    // perdre autant : on avance tant que le seuil suivant est franchi.
    while (
      index + 1 < paliers.length &&
      balance >= paliers[index + 1].bankrollRequired
    ) {
      index += 1;
    }
    while (index > 0 && balance < paliers[index].stopLoss) {
      index -= 1;
    }
  }

  const courant = paliers[index];
  const suivant = paliers[index + 1] ?? null;
  const precedent = index > 0 ? paliers[index - 1] : null;

  return {
    buyInMax: courant.buyInMax,
    stopLoss: courant.stopLoss,
    // Le plafond auquel on retombe si le seuil de descente est franchi.
    fallbackBuyIn: precedent ? precedent.buyInMax : null,
    next: suivant,
    required: suivant ? suivant.bankrollRequired : null,
    // Toute l'échelle, pour montrer d'un coup d'œil ce qui est ouvert et ce
    // qui ne l'est pas encore.
    echelle: paliers.map((p, i) => ({
      buyInMax: p.buyInMax,
      autorise: i <= index,
    })),
    compliant: offenders.length === 0,
    offenders,
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
  const events = chronologie({ tournaments, transactions });

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
