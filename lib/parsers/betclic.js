/**
 * Parser des exports Betclic.
 *
 * Betclic n'exporte pas de résumés de tournoi : il exporte les mains, une par
 * une, et chaque main porte en en-tête l'identité du tournoi. On reconstitue
 * donc le tournoi en regroupant les mains par « Game ID », puis en lisant le
 * bloc SUMMARY de la dernière main du joueur.
 *
 *   *** HEADER ***
 *   Site: Betclic.fr
 *   Game Mode: Spin               (Spin | Tournament)
 *   Tournament Type: SKO          (présent sur les KO progressifs)
 *   Game Name: Spin & Rush 10€
 *   Game ID: 01M4EEFBFPAG4H7GRECG5GHMB3
 *   Prize pool: 40.00€
 *   Multiplier: x4                (Spin uniquement)
 *   Buy In: 10.00€
 *   Date & Time: 2026-10-08 19:12:48 (UTC)
 *   *** PLAYERS ***
 *   Seat 1: jo DUPONT (276, €5.00 bounty) [BTN SB Hero]
 *   …
 *   *** SUMMARY ***
 *   Adversaire Un wins main pot of 552
 *   joueur4 wins €0.50 for eliminating jo DUPONT (x0.4), joueur4 own bounty …
 *   Adversaire Un finished 1st and wins 40.00 EUR
 *   jo DUPONT finished 2nd
 *
 * Points d'attention, tous observés dans de vrais fichiers :
 * - Les pseudos contiennent des espaces (« jo DUPONT », « La Paix »). On ne
 *   peut donc pas découper sur l'espace : on ancre sur le pseudo du héros,
 *   repéré par le marqueur [Hero].
 * - Les ordinaux sont irréguliers : « 221th », « 41th ».
 * - Betclic ne donne que le buy-in total, sans détail rake / prime.
 * - Le nombre d'inscrits n'apparaît nulle part : il reste inconnu sur les MTT.
 */

import { buildTournament, round2, toNumber } from "./common.js";

export const SITE = "betclic";

export function detect(content) {
  return /^Site:\s*Betclic/im.test(content) || /\bBetclic\.fr\b/i.test(content);
}

function echapper(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function champ(bloc, nom) {
  const m = bloc.match(new RegExp(`^${nom}:\\s*(.+)$`, "im"));
  return m ? m[1].trim() : null;
}

function section(bloc, nom) {
  // Entre « *** NOM *** » et la section suivante ou la fin du bloc.
  const re = new RegExp(`\\*\\*\\* ${nom} \\*\\*\\*([\\s\\S]*?)(?=\\*\\*\\*|$)`, "i");
  const m = bloc.match(re);
  return m ? m[1] : "";
}

/** Pseudo du joueur, repéré par le marqueur [Hero] dans la liste des sièges. */
function trouverHero(bloc) {
  const joueurs = section(bloc, "PLAYERS");
  const m = joueurs.match(/^Seat\s+\d+:\s*(.+?)\s*\((?:[^)]*)\)\s*\[[^\]]*\bHero\b[^\]]*\]/im);
  return m ? m[1].trim() : null;
}

function lireDate(bloc) {
  const brut = champ(bloc, "Date & Time");
  if (!brut) return null;
  const m = brut.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
}

function lireVitesse(nom = "") {
  if (/hyper|rush|twister/i.test(nom)) return "HYPER";
  if (/turbo/i.test(nom)) return "TURBO";
  return "NORMAL";
}

function lireFormat(mode, typeTournoi, nom = "") {
  if (/spin/i.test(mode) || /spin|twister/i.test(nom)) return "SPIN";
  if (typeTournoi && /ko/i.test(typeTournoi)) return "KO";
  if (/\bko\b|knockout|bounty/i.test(nom)) return "KO";
  return "CLASSIC";
}

/**
 * Agrège les mains d'un même tournoi.
 * `etat` accumule au fil des mains ; seule la dernière porte le classement.
 */
function appliquerMain(etat, bloc, hero) {
  const resume = section(bloc, "SUMMARY");
  const h = echapper(hero);

  // « <hero> finished 2nd » / « <hero> finished 1st and wins 40.00 EUR »
  const fin = resume.match(
    new RegExp(`^${h}\\s+finished\\s+(\\d+)\\w*(?:\\s+and wins\\s+([\\d.,]+)\\s*EUR)?`, "im")
  );
  if (fin) {
    etat.finishPosition = Number(fin[1]);
    if (fin[2]) etat.prize += toNumber(fin[2]);
  }

  // « <hero> wins €1.25 for eliminating <victime> (x1), … »
  const primes = resume.matchAll(
    new RegExp(`^${h}\\s+wins\\s+€?\\s*([\\d.,]+)\\s+for eliminating`, "gim")
  );
  for (const p of primes) etat.bountiesWon += toNumber(p[1]);
}

export function parse(content) {
  const blocs = content
    .split(/(?=\*\*\* HEADER \*\*\*)/)
    .map((b) => b.trim())
    .filter((b) => /^\*\*\* HEADER \*\*\*/.test(b));

  const tournois = new Map();

  for (const bloc of blocs) {
    const gameId = champ(bloc, "Game ID");
    if (!gameId) continue;

    const hero = trouverHero(bloc);
    if (!hero) continue; // main où le joueur n'est pas assis : on l'ignore

    let etat = tournois.get(gameId);
    if (!etat) {
      const nom = champ(bloc, "Game Name") ?? "Tournoi";
      const mode = champ(bloc, "Game Mode") ?? "";
      const typeTournoi = champ(bloc, "Tournament Type");
      etat = {
        gameId,
        name: nom,
        buyIn: toNumber(champ(bloc, "Buy In")),
        format: lireFormat(mode, typeTournoi, nom),
        speed: lireVitesse(nom),
        date: lireDate(bloc),
        prize: 0,
        bountiesWon: 0,
        finishPosition: null,
      };
      tournois.set(gameId, etat);
    }

    // La date du tournoi est celle de sa première main.
    const dateMain = lireDate(bloc);
    if (dateMain && (!etat.date || dateMain < etat.date)) etat.date = dateMain;

    appliquerMain(etat, bloc, hero);
  }

  return [...tournois.values()]
    .filter((t) => t.date)
    .map((t) =>
      buildTournament({
        site: SITE,
        tournamentId: t.gameId,
        name: t.name,
        date: t.date,
        // Betclic ne détaille ni le rake ni la prime : le buy-in affiché est
        // le coût total d'une entrée.
        buyIn: t.buyIn,
        fee: 0,
        bounty: 0,
        reEntries: 0,
        finishPosition: t.finishPosition,
        entrants: null, // absent de l'export
        prize: round2(t.prize),
        bountiesWon: round2(t.bountiesWon),
        format: t.format,
        speed: t.speed,
        currency: "EUR",
      })
    );
}
