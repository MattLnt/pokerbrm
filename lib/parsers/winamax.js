/**
 * Parser des résumés de tournoi Winamax.
 *
 * Écrit à partir de 2 590 fichiers réels (3 599 blocs). Les pièges du format,
 * tous rencontrés dans ces fichiers :
 *
 * 1. Un fichier contient souvent PLUSIEURS blocs pour le même tournoi : un
 *    bloc « - Late Registration » intermédiaire, puis le bloc final. Seul le
 *    dernier porte le résultat. On ne garde donc qu'un bloc par tournoi, le
 *    plus complet.
 * 2. La ligne de gain a six formes, dont « You won Bounty 3€ » où aucun
 *    montant ne suit « won ». On lit les segments séparés par « + » et on
 *    les étiquette, plutôt que de chercher un montant à position fixe.
 * 3. Certains fichiers contiennent la séquence d'échappement littérale
 *    (backslash u20ac) au lieu du caractère euro.
 * 4. Les ordinaux sont irréguliers : « 1202th », « 41th ».
 * 5. Il n'existe pas de champ re-entry ; il y a en revanche des rebuys et
 *    des add-ons, avec leur coût sur des lignes séparées.
 *
 *   Winamax Poker - Tournament summary : ATOM(1042567870)
 *   Player : <pseudo>
 *   Buy-In : 2€ + 2.50€ + 0.50€      (KO : buy-in + prime + rake)
 *   Registered players : 5630
 *   Mode : tt                        (tt | sng)
 *   Type : knockout                  (knockout | normal | sitngo | flight …)
 *   Speed : normal                   (normal | semiturbo | turbo)
 *   Tournament started 2026/02/04 18:45:01 UTC
 *   You finished in 788th place
 *   You won 5€ + Bounty 0.62€
 */

import { buildTournament, toInteger, toNumber } from "./common.js";

export const SITE = "winamax";

const EN_TETE = /Winamax Poker\s*-\s*Tournament summary/i;

export function detect(content) {
  return EN_TETE.test(content);
}

/** Certains exports laissent la séquence d'échappement au lieu du caractère. */
function normaliser(content) {
  return content.replace(/\\u20ac/gi, "€");
}

function decouperBlocs(content) {
  return normaliser(content)
    .split(/(?=Winamax Poker\s*-\s*Tournament summary)/i)
    .map((b) => b.trim())
    .filter(Boolean);
}

/**
 * « Buy-In : 2€ + 2.50€ + 0.50€ » → 3 montants : buy-in, prime, rake.
 * « Buy-In : 45€ + 5€ »           → 2 montants : buy-in, rake.
 */
function lireBuyIn(bloc) {
  const m = bloc.match(/Buy-?In\s*:\s*([^\r\n]+)/i);
  if (!m) return { buyIn: 0, bounty: 0, fee: 0 };

  const montants = m[1].split("+").map(toNumber);
  if (montants.length >= 3) {
    return { buyIn: montants[0], bounty: montants[1], fee: montants[2] };
  }
  if (montants.length === 2) {
    return { buyIn: montants[0], bounty: 0, fee: montants[1] };
  }
  return { buyIn: montants[0] || 0, bounty: 0, fee: 0 };
}

/**
 * Toutes les formes observées :
 *   You won 12€
 *   You won Bounty 3€
 *   You won 5€ + Bounty 0.62€
 *   You won Ticket 20€
 *   You won 5€ + Ticket 20€ + Bounty 1€
 *   You won 12                      (sans symbole)
 *
 * Un ticket gagné n'est pas du cash : il est renvoyé à part et n'entre pas
 * dans le résultat net, conformément au traitement des tickets comme
 * mouvement hors jeu.
 */
function lireGains(bloc) {
  const m = bloc.match(/You won\s+([^\r\n]+)/i);
  if (!m) return { prize: 0, bountiesWon: 0, ticketWon: 0 };

  let prize = 0;
  let bountiesWon = 0;
  let ticketWon = 0;

  for (const segment of m[1].split("+")) {
    const valeur = toNumber(segment);
    if (/bounty/i.test(segment)) bountiesWon += valeur;
    else if (/ticket/i.test(segment)) ticketWon += valeur;
    else prize += valeur;
  }

  return { prize, bountiesWon, ticketWon };
}

/** Rebuys et add-ons, rares mais ils changent le coût réel du tournoi. */
function lireRecaves(bloc) {
  const nb = (re) => {
    const m = bloc.match(re);
    return m ? toInteger(m[1]) ?? 0 : 0;
  };
  const cout = (re) => {
    const m = bloc.match(re);
    return m ? toNumber(m[1]) : 0;
  };

  const rebuys = nb(/Your rebuys\s*:\s*(\d+)/i);
  const addons = nb(/Your addons\s*:\s*(\d+)/i);
  const coutRebuy = cout(/Rebuy cost\s*:\s*([\d.,]+)/i);
  const coutAddon = cout(/Addon cost\s*:\s*([\d.,]+)/i);

  return rebuys * coutRebuy + addons * coutAddon;
}

const VITESSES = { normal: "NORMAL", semiturbo: "SEMITURBO", turbo: "TURBO" };

/**
 * Durée d'un niveau de blindes, en minutes.
 *
 * La ligne Levels liste les niveaux sous la forme
 * `blindes:ante:durée:variante`, la durée étant en secondes. Le premier
 * niveau est souvent rallongé par l'inscription tardive : on prend donc la
 * durée la plus fréquente, qui est le vrai rythme du tournoi.
 */
function lireDureeNiveau(bloc) {
  const m = bloc.match(/Levels\s*:.*?\[([^\]]+)\]/i);
  if (!m) return null;

  const comptes = new Map();
  for (const niveau of m[1].split(",")) {
    const parts = niveau.split(":");
    if (parts.length < 3) continue;
    const secondes = Number(parts[2]);
    if (!Number.isFinite(secondes) || secondes <= 0) continue;
    comptes.set(secondes, (comptes.get(secondes) ?? 0) + 1);
  }
  if (comptes.size === 0) return null;

  const [secondes] = [...comptes.entries()].sort((a, b) => b[1] - a[1])[0];
  return Math.max(1, Math.round(secondes / 60));
}

/**
 * Le format vient d'abord du nom, qui porte la gamme Winamax, puis du champ
 * Type. Mystery et Space KO sont des KO particuliers : ils doivent être
 * testés avant le KO générique, sinon ils y seraient tous absorbés.
 */
function lireFormat(nom, type, bounty) {
  if (/space\s*ko/i.test(nom)) return "SPACE_KO";
  if (/mystery/i.test(nom)) return "MYSTERY";
  // L'Expresso est le Spin de Winamax, et il est aussi à primes : on le teste
  // avant le KO pour qu'il ne soit pas classé comme tel.
  if (/expresso|spin/i.test(nom)) return "SPIN";
  if (type === "knockout" || bounty > 0) return "KO";
  return "CLASSIC";
}

function lireBloc(bloc) {
  const idMatch = bloc.match(/Tournament summary\s*:\s*(.+?)\s*\((\d+)\)/i);
  if (!idMatch) return null;

  const dateMatch = bloc.match(
    /Tournament started\s+(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/i
  );
  if (!dateMatch) return null;
  const [, y, mo, d, h, mi, s] = dateMatch;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);

  const { buyIn, bounty, fee } = lireBuyIn(bloc);
  const { prize, bountiesWon, ticketWon } = lireGains(bloc);

  const typeMatch = bloc.match(/Type\s*:\s*(\w+)/i);
  const speedMatch = bloc.match(/Speed\s*:\s*(\w+)/i);
  const placeMatch = bloc.match(/You finished in\s+(\d+)/i);
  const joueursMatch = bloc.match(/Registered players\s*:\s*([\d\s.,]+)/i);

  const nom = idMatch[1];
  const type = typeMatch ? typeMatch[1].toLowerCase() : "";

  const tournoi = buildTournament({
    site: SITE,
    tournamentId: idMatch[2],
    name: nom,
    date,
    buyIn,
    fee,
    bounty,
    reEntries: 0, // Winamax ne documente pas les re-entries dans le résumé.
    finishPosition: placeMatch ? Number(placeMatch[1]) : null,
    entrants: joueursMatch ? toInteger(joueursMatch[1]) : null,
    prize,
    bountiesWon,
    format: lireFormat(nom, type, bounty),
    speed: speedMatch ? VITESSES[speedMatch[1].toLowerCase()] : undefined,
    currency: "EUR",
  });

  tournoi.levelMinutes = lireDureeNiveau(bloc);

  // Les recaves s'ajoutent au coût calculé par buildTournament.
  const recaves = lireRecaves(bloc);
  if (recaves > 0) {
    tournoi.totalCost = Math.round((tournoi.totalCost + recaves) * 100) / 100;
    tournoi.netResult =
      Math.round((tournoi.prize + tournoi.bountiesWon - tournoi.totalCost) * 100) / 100;
  }

  tournoi.ticketWon = ticketWon;
  // Sert à départager plusieurs blocs du même tournoi.
  tournoi._complet =
    (/You won/i.test(bloc) ? 2 : 0) + (placeMatch ? 1 : 0);

  return tournoi;
}

export function parse(content) {
  const blocs = decouperBlocs(content).map(lireBloc).filter(Boolean);

  // Un tournoi peut apparaître plusieurs fois (bloc « Late Registration »
  // puis bloc final). On garde le bloc le plus complet ; à égalité, le
  // dernier, qui est le plus récent.
  const parTournoi = new Map();
  for (const t of blocs) {
    const existant = parTournoi.get(t.tournamentId);
    if (!existant || t._complet >= existant._complet) {
      parTournoi.set(t.tournamentId, t);
    }
  }

  return [...parTournoi.values()].map(({ _complet, ...t }) => t);
}
