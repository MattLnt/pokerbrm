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
 * Ordonne la grille pour la session en cours : d'abord les tournois dont
 * l'heure habituelle est proche de maintenant, puis l'ordre de la grille.
 * On évite ainsi de chercher le tournoi de 19 h dans une liste de 53 lignes.
 */
export function trierGrille(modeles, maintenant = new Date()) {
  const heure = maintenant.getUTCHours();
  const ecart = (m) => {
    if (m.usualHour === null || m.usualHour === undefined) return 99;
    const d = Math.abs(m.usualHour - heure);
    return Math.min(d, 24 - d); // l'heure est cyclique
  };
  return [...modeles].sort(
    (a, b) => ecart(a) - ecart(b) || a.position - b.position
  );
}

/** Un identifiant externe est requis ; les saisies manuelles n'en ont pas. */
export function identifiantManuel() {
  return `manuel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
