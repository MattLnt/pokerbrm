import * as winamax from "./winamax.js";
import * as pokerstars from "./pokerstars.js";
import * as pmu from "./pmu.js";

const PARSERS = [winamax, pokerstars, pmu];

/** Renvoie le parser capable de lire ce contenu, ou null. */
export function detectParser(content) {
  return PARSERS.find((p) => p.detect(content)) || null;
}

/**
 * Analyse une liste de fichiers { name, content } et renvoie un rapport :
 *   { tournaments, bySite, unrecognized }
 * La déduplication (site + tournamentId) se fait ici pour le lot, puis en base
 * via la contrainte unique [siteId, externalId].
 */
export function parseFiles(files) {
  const seen = new Set();
  const tournaments = [];
  const bySite = {};
  const unrecognized = [];

  for (const file of files) {
    const parser = detectParser(file.content);

    if (!parser) {
      unrecognized.push({ name: file.name, reason: "site non reconnu" });
      continue;
    }

    const bucket = (bySite[parser.SITE] ??= {
      site: parser.SITE,
      fileCount: 0,
      newCount: 0,
      duplicateCount: 0,
      net: 0,
      needsSpec: Boolean(parser.needsSpec),
    });
    bucket.fileCount += 1;

    if (parser.needsSpec) {
      unrecognized.push({ name: file.name, reason: "format à valider" });
      continue;
    }

    let parsed = [];
    try {
      parsed = parser.parse(file.content);
    } catch {
      unrecognized.push({ name: file.name, reason: "lecture impossible" });
      continue;
    }

    if (parsed.length === 0) {
      unrecognized.push({ name: file.name, reason: "aucun tournoi trouvé" });
      continue;
    }

    for (const t of parsed) {
      const key = `${t.site}:${t.tournamentId}`;
      if (seen.has(key)) {
        bucket.duplicateCount += 1;
        continue;
      }
      seen.add(key);
      bucket.newCount += 1;
      bucket.net += t.netResult;
      tournaments.push(t);
    }
  }

  for (const b of Object.values(bySite)) {
    b.net = Math.round((b.net + Number.EPSILON) * 100) / 100;
  }

  tournaments.sort((a, b) => b.date - a.date);
  return { tournaments, bySite: Object.values(bySite), unrecognized };
}
