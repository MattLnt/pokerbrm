import { POSITIONS } from "./constants.js";

/**
 * Un spot de range : qui parle (position), ce qu'il fait (action), à quelle
 * profondeur, et — pour les actions qui répondent à quelqu'un — contre qui.
 *
 * Une défense BB ne se joue pas pareil contre le lojack et contre le bouton ;
 * un 3bet non plus. Sans adversaire, une seule range devait couvrir tous ces
 * spots à la fois.
 *
 * Ce module ne touche pas la base : l'éditeur, côté navigateur, s'en sert
 * autant que les routes.
 */

/**
 * Les actions qui répondent à un adversaire, et où il est assis :
 * « avant » le héros (il a ouvert ou fait tapis), ou « après » (le héros a
 * ouvert, il a 3bet derrière).
 */
const SENS_ADVERSAIRE = {
  DEF_VS_OPEN: "avant",
  "3BET": "avant",
  CALL_SHOVE: "avant",
  VS_3BET: "apres",
};

/**
 * Clé d'un spot. Sans adversaire, elle garde ses trois morceaux : les ranges
 * saisies avant l'adversaire, les drills et les liens existants continuent
 * de pointer au même endroit.
 */
export function spotKey({ position, action, stackDepth, vsPosition = "" }) {
  const base = `${position}|${action}|${stackDepth}`;
  return vsPosition ? `${base}|${vsPosition}` : base;
}

export function parseSpotKey(key) {
  const [position, action, stackDepth, vsPosition = ""] = String(key).split("|");
  return { position, action, stackDepth, vsPosition };
}

export function demandeAdversaire(action) {
  return Boolean(SENS_ADVERSAIRE[action]);
}

/** Les positions d'où peut venir l'adversaire, dans l'ordre de parole. */
export function adversairesPossibles(action, position) {
  const sens = SENS_ADVERSAIRE[action];
  const rang = POSITIONS.indexOf(position);
  if (!sens || rang < 0) return [];
  return sens === "avant" ? POSITIONS.slice(0, rang) : POSITIONS.slice(rang + 1);
}

/**
 * Une action se joue-t-elle depuis cette position ? Personne n'ouvre avant
 * le lojack, personne ne 3bet derrière la BB, et la BB n'ouvre jamais : si
 * tout le monde se couche, elle ramasse les blindes.
 */
export function actionPossible(action, position) {
  if (demandeAdversaire(action)) {
    return adversairesPossibles(action, position).length > 0;
  }
  return position !== "BB";
}

/** Vrai si `vsPosition` est vide ou plausible pour cette action. */
export function adversaireValide(action, position, vsPosition) {
  if (!vsPosition) return true;
  return adversairesPossibles(action, position).includes(vsPosition);
}
