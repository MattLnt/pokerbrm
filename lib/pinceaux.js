import { RANGE_BRUSHES } from "./constants.js";
import { parseSpotKey } from "./spots.js";

/**
 * Pinceaux affichés selon le spot.
 *
 * Les ranges d'open reprennent les couleurs de Suited, celles qu'on a sous
 * les yeux en les recopiant : raise orange, all-in rouge, loosifie vert,
 * tightifie bleu. En SB, le vert sert au limp. Il n'y a pas de call dans
 * un open, donc l'orange n'y croise jamais l'ambre du call.
 *
 * Les autres spots gardent la palette générale (`RANGE_BRUSHES`), sans le
 * limp qui n'y a pas de sens.
 */

const FOLD = RANGE_BRUSHES.find((b) => b.key === "fold");

const OPEN = [
  { key: "raise", label: "Raise", color: "#fb923c" },
  { key: "loosifie", label: "Loosifie", color: "#4ade80" },
  { key: "tightifie", label: "Tightifie", color: "#60a5fa" },
  { key: "shove", label: "All-in", color: "#ef4444" },
  FOLD,
];

const OPEN_SB = [
  { key: "raise", label: "Raise", color: "#fb923c" },
  { key: "limp", label: "Limp", color: "#4ade80" },
  { key: "tightifie", label: "Tightifie", color: "#60a5fa" },
  { key: "shove", label: "All-in", color: "#ef4444" },
  FOLD,
];

const GENERAL = RANGE_BRUSHES.filter((b) => b.key !== "limp");

export function pinceauxPour(action, position) {
  if (action === "RFI" || action === "SHOVE") {
    return position === "SB" ? OPEN_SB : OPEN;
  }
  return GENERAL;
}

export function pinceauxDuSpot(cle) {
  const { action, position } = parseSpotKey(cle);
  return pinceauxPour(action, position);
}

/**
 * Le pinceau d'une clé dans une palette. Une main peut porter une action
 * que la palette du spot n'affiche pas (saisie avant un changement de
 * palette) : on retombe alors sur la palette générale plutôt que de la
 * rendre invisible.
 */
export function trouverPinceau(cle, palette) {
  return (
    palette.find((b) => b.key === cle) ?? RANGE_BRUSHES.find((b) => b.key === cle)
  );
}
