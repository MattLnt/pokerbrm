/**
 * Parser des résumés de tournoi Winamax.
 *
 * ⚠️ Écrit d'après le format public documenté, PAS encore validé sur de vrais
 * fichiers (cf. PROJET-APP-POKER.md §10). Déposer un résumé réel dans
 * `test/fixtures/winamax/` et relancer `npm run test:parsers` avant de s'y fier.
 *
 * Forme attendue :
 *   Winamax Poker - Tournament summary : Monster Stack (123456789)
 *   Buy-In : 45€ + 5€                      (classique : buy-in + rake)
 *   Buy-In : 20€ + 20€ + 5€                (KO : buy-in + bounty + rake)
 *   Registered players : 1234
 *   Tournament started 2024/05/12 19:00:00 UTC
 *   You finished in 14th place
 *   You won 386€ (including 120€ of bounties)
 */

import { buildTournament, toInteger, toNumber } from "./common.js";

export const SITE = "winamax";

/** Signature permettant de router un fichier vers ce parser. */
export function detect(content) {
  return /Winamax Poker\s*-\s*Tournament summary/i.test(content);
}

function splitSummaries(content) {
  const parts = content.split(/(?=Winamax Poker\s*-\s*Tournament summary)/i);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseBuyIn(block) {
  // « Buy-In : 20€ + 20€ + 5€ » → 3 montants = buy-in, bounty, rake
  // « Buy-In : 45€ + 5€ »       → 2 montants = buy-in, rake
  const m = block.match(/Buy-?In\s*:\s*([^\r\n]+)/i);
  if (!m) return { buyIn: 0, bounty: 0, fee: 0 };
  const amounts = m[1]
    .split("+")
    .map((p) => toNumber(p))
    .filter((n) => Number.isFinite(n));

  if (amounts.length >= 3) {
    return { buyIn: amounts[0], bounty: amounts[1], fee: amounts[2] };
  }
  if (amounts.length === 2) {
    return { buyIn: amounts[0], bounty: 0, fee: amounts[1] };
  }
  return { buyIn: amounts[0] || 0, bounty: 0, fee: 0 };
}

function parseDate(block) {
  const m = block.match(
    /Tournament started\s+(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/i
  );
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
}

function parseOne(block) {
  const idMatch = block.match(/Tournament summary\s*:\s*(.+?)\s*\((\d+)\)/i);
  if (!idMatch) return null;

  const name = idMatch[1];
  const tournamentId = idMatch[2];
  const date = parseDate(block);
  if (!date) return null;

  const { buyIn, bounty, fee } = parseBuyIn(block);

  const entrantsMatch = block.match(/Registered players\s*:\s*([\d\s.,]+)/i);
  const placeMatch = block.match(/You finished in\s+(\d+)/i);
  const wonMatch = block.match(/You won\s+([\d.,]+)\s*€/i);
  const bountyMatch = block.match(
    /including\s+([\d.,]+)\s*€\s*(?:of\s+)?bount/i
  );
  const reEntryMatch = block.match(/re-?enter(?:ed)?[^\d]*(\d+)/i);

  const prizeTotal = wonMatch ? toNumber(wonMatch[1]) : 0;
  const bountiesWon = bountyMatch ? toNumber(bountyMatch[1]) : 0;

  const speedMatch = block.match(/Speed\s*:\s*(\w+)/i);
  const speedMap = { hyper: "HYPER", turbo: "TURBO", normal: "NORMAL" };

  return buildTournament({
    site: SITE,
    tournamentId,
    name,
    date,
    buyIn,
    fee,
    bounty,
    reEntries: reEntryMatch ? Number(reEntryMatch[1]) : 0,
    finishPosition: placeMatch ? Number(placeMatch[1]) : null,
    entrants: entrantsMatch ? toInteger(entrantsMatch[1]) : null,
    // « You won » inclut les bounties : on les isole pour ne pas compter double.
    prize: Math.max(0, prizeTotal - bountiesWon),
    bountiesWon,
    speed: speedMatch ? speedMap[speedMatch[1].toLowerCase()] : undefined,
    currency: "EUR",
  });
}

export function parse(content) {
  return splitSummaries(content).map(parseOne).filter(Boolean);
}
