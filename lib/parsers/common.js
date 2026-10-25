// Outils partagés par les parsers de résumés de tournoi.

/** Nombre type « 12,50 » ou « 1,234.56 » → 12.5 */
export function toNumber(raw) {
  if (raw === null || raw === undefined) return 0;
  const s = String(raw)
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (!s) return 0;
  // Si les deux séparateurs sont là, le dernier est le décimal.
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized = s;
  if (lastComma > -1 && lastDot > -1) {
    normalized =
      lastComma > lastDot
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    normalized = s.replace(",", ".");
  }
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Déduit le format du tournoi depuis son nom et la présence d'un bounty. */
export function detectFormat(name = "", bounty = 0) {
  const n = name.toLowerCase();
  if (/\bspin\b|expresso|twister|sit\s*&\s*go\s*jackpot/.test(n)) return "SPIN";
  if (bounty > 0 || /\bko\b|knockout|bounty|prime|hitman/.test(n)) return "KO";
  return "CLASSIC";
}

/** Déduit la vitesse depuis le nom. */
export function detectSpeed(name = "") {
  const n = name.toLowerCase();
  if (/hyper|ultra[- ]?turbo/.test(n)) return "HYPER";
  if (/turbo|express/.test(n)) return "TURBO";
  return "NORMAL";
}

/**
 * Coût total = (buyIn + fee + bounty) × (1 + re-entries)
 * Gain net   = prize + bountiesWon − coût total
 */
export function computeResult({ buyIn, fee, bounty, reEntries, prize, bountiesWon }) {
  const entries = 1 + (reEntries || 0);
  const totalCost = (buyIn + fee + bounty) * entries;
  const netResult = prize + bountiesWon - totalCost;
  return { totalCost: round2(totalCost), netResult: round2(netResult) };
}

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Construit l'objet tournoi normalisé commun à tous les parsers. */
export function buildTournament(fields) {
  const buyIn = round2(fields.buyIn || 0);
  const fee = round2(fields.fee || 0);
  const bounty = round2(fields.bounty || 0);
  const prize = round2(fields.prize || 0);
  const bountiesWon = round2(fields.bountiesWon || 0);
  const reEntries = fields.reEntries || 0;
  const { totalCost, netResult } = computeResult({
    buyIn,
    fee,
    bounty,
    reEntries,
    prize,
    bountiesWon,
  });

  return {
    site: fields.site,
    tournamentId: String(fields.tournamentId),
    name: fields.name?.trim() || "Tournoi",
    date: fields.date,
    buyIn,
    fee,
    bounty,
    reEntries,
    finishPosition: fields.finishPosition ?? null,
    entrants: fields.entrants ?? null,
    prize,
    bountiesWon,
    totalCost,
    netResult,
    format: fields.format || detectFormat(fields.name, bounty),
    speed: fields.speed || detectSpeed(fields.name),
    currency: fields.currency || "EUR",
  };
}

/**
 * Entier avec séparateurs de milliers (« 2,345 » / « 2 345 » / « 2.345 »).
 * À utiliser pour les compteurs (joueurs, places) : contrairement à toNumber,
 * aucun séparateur n'est traité comme une virgule décimale.
 */
export function toInteger(raw) {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  return Number.parseInt(digits, 10);
}
