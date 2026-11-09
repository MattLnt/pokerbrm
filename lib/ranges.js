import { prisma } from "./db.js";
import { getCurrentUser } from "./user.js";
import { demoRanges } from "./demo.js";
import { DEMO } from "./data.js";

// La clé d'un spot vit dans `spots.js`, que l'éditeur importe aussi côté
// navigateur : ce module-ci touche la base et n'y a pas sa place.
export { spotKey, parseSpotKey } from "./spots.js";
import { spotKey } from "./spots.js";

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
        vsPosition: r.vsPosition,
      }),
      r.cells ?? {},
    ])
  );
}
