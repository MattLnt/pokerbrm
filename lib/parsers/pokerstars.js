/**
 * Parser des résumés de tournoi PokerStars.
 *
 * ⚠️ Écrit d'après le format public documenté, PAS encore validé sur de vrais
 * fichiers (cf. PROJET-APP-POKER.md §10).
 *
 * Forme attendue :
 *   PokerStars Tournament #3078018023, No Limit Hold'em
 *   Buy-In: €20.00/€2.00 EUR                 (classique)
 *   Buy-In: €10.00/€10.00/€2.00 EUR          (KO : buy-in / bounty / rake)
 *   2,345 players
 *   Tournament started 2024/05/12 18:00:00 CET
 *   You re-entered the tournament 1 time.
 *   You finished in 412th place.
 *   You earned €45.00 in bounty awards.
 *   €386.00 of the prize pool was won by you
 */

import { buildTournament, toInteger, toNumber } from "./common.js";

export const SITE = "pokerstars";

export function detect(content) {
  return /PokerStars\s+Tournament\s+#/i.test(content);
}

function splitSummaries(content) {
  const parts = content.split(/(?=PokerStars\s+Tournament\s+#)/i);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseBuyIn(block) {
  const m = block.match(/Buy-?In\s*:\s*([^\r\n]+)/i);
  if (!m) return { buyIn: 0, bounty: 0, fee: 0, currency: "EUR" };

  const line = m[1];
  const currency = /USD|\$/.test(line) ? "USD" : "EUR";
  // Les segments sont séparés par « / » (PokerStars) ou « + ».
  const amounts = line
    .split(/[/+]/)
    .map((p) => toNumber(p))
    .filter((n) => n > 0 || n === 0);

  if (amounts.length >= 3) {
    return { buyIn: amounts[0], bounty: amounts[1], fee: amounts[2], currency };
  }
  if (amounts.length === 2) {
    return { buyIn: amounts[0], bounty: 0, fee: amounts[1], currency };
  }
  return { buyIn: amounts[0] || 0, bounty: 0, fee: 0, currency };
}

function parseDate(block) {
  const m = block.match(
    /Tournament started\s+(?:\[)?(\d{4})\/(\d{2})\/(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})/i
  );
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(
    `${y}-${mo}-${d}T${String(h).padStart(2, "0")}:${mi}:${s}Z`
  );
}

function parseOne(block) {
  const idMatch = block.match(/PokerStars\s+Tournament\s+#(\d+)/i);
  if (!idMatch) return null;

  const date = parseDate(block);
  if (!date) return null;

  // Le nom du tournoi suit l'identifiant, après la virgule.
  const nameMatch = block.match(
    /PokerStars\s+Tournament\s+#\d+,\s*([^\r\n]+)/i
  );

  const { buyIn, bounty, fee, currency } = parseBuyIn(block);

  const entrantsMatch = block.match(/([\d,\s.]+)\s+players/i);
  const placeMatch = block.match(/You finished in\s+(\d+)/i);
  const reEntryMatch = block.match(/re-?entered the tournament\s+(\d+)\s+time/i);
  const bountyMatch = block.match(
    /You (?:earned|collected)\s+[^\d]*([\d.,]+)\s*in bount/i
  );
  const prizeMatch = block.match(
    /([\d.,]+)\s*(?:EUR|USD)?\s*of the prize pool was won by you|You (?:won|received)\s+[^\d]*([\d.,]+)/i
  );

  const prize = prizeMatch
    ? toNumber(prizeMatch[1] ?? prizeMatch[2])
    : 0;

  return buildTournament({
    site: SITE,
    tournamentId: idMatch[1],
    name: nameMatch ? nameMatch[1] : `Tournoi #${idMatch[1]}`,
    date,
    buyIn,
    fee,
    bounty,
    reEntries: reEntryMatch ? Number(reEntryMatch[1]) : 0,
    finishPosition: placeMatch ? Number(placeMatch[1]) : null,
    entrants: entrantsMatch ? toInteger(entrantsMatch[1]) : null,
    prize,
    bountiesWon: bountyMatch ? toNumber(bountyMatch[1]) : 0,
    currency,
  });
}

export function parse(content) {
  return splitSummaries(content).map(parseOne).filter(Boolean);
}
