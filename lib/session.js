// Calculs d'une session de jeu — fonctions pures, testables sans base.

import { round2 } from "./bankroll.js";
import { FORMATS_COMPTES } from "./constants.js";

/**
 * Totaux d'une session.
 *
 * « engagé » = tout ce qui est sorti, y compris les tournois encore en cours :
 * l'argent d'une inscription est dépensé au moment où on s'inscrit, pas au
 * moment où on sort. C'est le chiffre qui donne la mesure de la session.
 *
 * « récupéré » = gains et primes des tournois terminés.
 */
export function totauxSession(tournois = []) {
  let engage = 0;
  let recupere = 0;
  let enCours = 0;
  let termines = 0;
  let itm = 0;

  for (const t of tournois) {
    engage += Number(t.totalCost);
    if (t.inProgress) {
      enCours += 1;
      continue;
    }
    termines += 1;
    recupere += Number(t.prize) + Number(t.bountiesWon);
    if (Number(t.prize) > 0) itm += 1;
  }

  const comptes = tournois.filter((t) => FORMATS_COMPTES.includes(t.format));
  const engageCompte = comptes.reduce((s, t) => s + Number(t.totalCost), 0);

  return {
    total: tournois.length,
    enCours,
    termines,
    engage: round2(engage),
    recupere: round2(recupere),
    net: round2(recupere - engage),
    itm: termines > 0 ? round2((itm / termines) * 100) : 0,
    roi: engageCompte > 0 ? round2(((recupere - engage) / engageCompte) * 100) : 0,
  };
}

/** Coût d'une inscription : (buy-in + rake + prime) × nombre d'entrées. */
export function coutInscription({ buyIn, fee, bounty }, reEntries = 0) {
  return round2(
    (Number(buyIn) + Number(fee) + Number(bounty)) * (1 + Number(reEntries))
  );
}

/**
 * Classe la grille par heure de début, comme une grille horaire.
 *
 * Renvoie des tranches { heure, tournois } dans l'ordre chronologique,
 * de 0 h à 23 h. Les tournois sans heure connue ferment la marche dans une
 * tranche à `heure: null` — ils existent, mais on ne sait pas où les placer.
 *
 * À heure égale, l'ordre de la grille départage : les tournois les plus
 * joués restent en tête de leur tranche.
 */
export function grouperParHeure(modeles) {
  const tranches = new Map();

  for (const m of modeles) {
    const h =
      m.usualHour === null || m.usualHour === undefined ? null : m.usualHour;
    if (!tranches.has(h)) tranches.set(h, []);
    tranches.get(h).push(m);
  }

  for (const liste of tranches.values()) {
    liste.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  return [...tranches.entries()]
    .sort(([a], [b]) => {
      if (a === null) return 1; // sans heure : toujours en dernier
      if (b === null) return -1;
      return a - b;
    })
    .map(([heure, tournois]) => ({ heure, tournois }));
}

/** « 19 h », ou « Sans heure » pour la tranche inconnue. */
export function libelleTranche(heure) {
  return heure === null ? "Sans heure" : `${heure} h`;
}

/** Un identifiant externe est requis ; les saisies manuelles n'en ont pas. */
export function identifiantManuel() {
  return `manuel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
