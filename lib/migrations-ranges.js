import { prisma } from "./db.js";
import { ANCIENNES_PROFONDEURS } from "./constants.js";

/**
 * Déplace les ranges et les mains taguées des anciennes profondeurs
 * (60bb+, 25bb, 15–20bb, <12bb) vers les nouvelles (100, 30, 18, ≤10bb).
 *
 * Même règle que pour les positions : si le spot d'arrivée existe déjà, la
 * range ancienne est laissée en place plutôt qu'écrasée. Les drills restent
 * attachés à leur range, puisqu'on la modifie sans la recréer.
 *
 * Vit hors de `bootstrap.js` pour que les scripts puissent l'appeler : ce
 * module-là tire un JSON que seul Next sait charger.
 */
export async function migrerProfondeurs(userId) {
  const anciennes = Object.keys(ANCIENNES_PROFONDEURS);

  const ranges = await prisma.range.findMany({
    where: { userId, stackDepth: { in: anciennes } },
  });
  for (const range of ranges) {
    const stackDepth = ANCIENNES_PROFONDEURS[range.stackDepth];
    const occupe = await prisma.range.findFirst({
      where: {
        userId,
        position: range.position,
        action: range.action,
        vsPosition: range.vsPosition,
        stackDepth,
      },
      select: { id: true },
    });
    if (occupe) continue;
    await prisma.range.update({ where: { id: range.id }, data: { stackDepth } });
  }

  for (const [ancienne, nouvelle] of Object.entries(ANCIENNES_PROFONDEURS)) {
    await prisma.taggedHand.updateMany({
      where: { userId, stackDepth: ancienne },
      data: { stackDepth: nouvelle },
    });
  }
}
