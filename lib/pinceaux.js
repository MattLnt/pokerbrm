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

// Face à un open, on ne « raise » pas : on 3bet. Le pinceau Raise y
// faisait doublon avec 3bet.
const FACE_OPEN = GENERAL.filter((b) => b.key !== "raise");

export function pinceauxPour(action, position) {
  if (action === "RFI" || action === "SHOVE") {
    return position === "SB" ? OPEN_SB : OPEN;
  }
  if (action === "3BET" || action === "DEF_VS_OPEN") return FACE_OPEN;
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

/**
 * Face à un open, le 3bet a longtemps été peint avec le pinceau « raise ».
 * À la lecture, on le présente comme un 3bet ; il est réécrit tel quel au
 * prochain enregistrement du spot. Rien n'est modifié en base d'office.
 *
 * Une main qui portait les deux garde la somme, plafonnée à 100.
 */
export function normaliserCellules(action, cells) {
  if (action !== "3BET" && action !== "DEF_VS_OPEN") return cells ?? {};
  const suivantes = {};
  for (const [main, actions] of Object.entries(cells ?? {})) {
    if (!actions?.raise) {
      suivantes[main] = actions;
      continue;
    }
    const { raise, ...reste } = actions;
    suivantes[main] = {
      ...reste,
      threebet: Math.min(100, (reste.threebet ?? 0) + raise),
    };
  }
  return suivantes;
}
