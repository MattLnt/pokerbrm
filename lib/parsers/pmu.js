/**
 * Parser des résumés de tournoi PMU — EN ATTENTE DE SPÉCIFICATION.
 *
 * Le format n'est pas connu (cf. PROJET-APP-POKER.md §10 : « exemple de fichier
 * résumé PMU à fournir avant de coder son parser »). En attendant, on détecte
 * le site pour pouvoir afficher « format à valider » dans l'écran d'import,
 * sans bloquer les autres fichiers.
 */

export const SITE = "pmu";

export function detect(content) {
  return /\bPMU\b|pmu\.fr|PMU\s*Poker/i.test(content);
}

/** Toujours vide tant que le format n'est pas spécifié. */
export function parse() {
  return [];
}

export const needsSpec = true;
