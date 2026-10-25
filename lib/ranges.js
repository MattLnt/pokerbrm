import { prisma } from "./db.js";
import { DEMO } from "./data.js";

/** Clé d'un spot : position | action | profondeur. */
export function spotKey({ position, action, stackDepth }) {
  return `${position}|${action}|${stackDepth}`;
}

export function parseSpotKey(key) {
  const [position, action, stackDepth] = key.split("|");
  return { position, action, stackDepth };
}

/**
 * Toutes les ranges de l'utilisateur, indexées par clé de spot.
 * L'énoncé est clair : aucune range n'est pré-remplie, l'utilisateur saisit
 * les siennes. En mode démo, on repart donc d'un éditeur vide.
 */
export async function getRanges() {
  if (DEMO) return {};

  const rows = await prisma.range.findMany();
  return Object.fromEntries(
    rows.map((r) => [
      spotKey({
        position: r.position,
        action: r.action,
        stackDepth: r.stackDepth,
      }),
      r.cells ?? {},
    ])
  );
}
