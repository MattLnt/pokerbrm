import { prisma } from "./db.js";
import { getCurrentUser } from "./user.js";
import { demoRanges } from "./demo.js";
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
 * les siennes. En mode démo, on sert les ranges d'exemple.
 *
 * Le passage par `getCurrentUser` n'est pas décoratif : c'est lui qui
 * déclenche l'amorçage, et donc les migrations de données. Cette fonction
 * lisait la base directement, si bien qu'une migration ne s'appliquait
 * jamais tant qu'on n'avait pas ouvert une autre page.
 */
export async function getRanges() {
  if (DEMO) return demoRanges;

  const user = await getCurrentUser();
  const rows = await prisma.range.findMany({ where: { userId: user.id } });
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
