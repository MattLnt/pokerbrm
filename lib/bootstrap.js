import { prisma } from "./db.js";
import { SITES } from "./constants.js";
import grilleWinamax from "./grille-winamax.json";
import { THEMES } from "./programme.js";

/**
 * Remplit les données de référence au premier accès : sites, programme
 * d'étude et grille de tournois.
 *
 * Tout est en création-si-absent, jamais en écrasement : relancer est sans
 * effet, et rien de ce que l'utilisateur modifie ensuite n'est réinitialisé
 * au déploiement suivant. C'est ce qui permet de s'en passer d'un script de
 * seed à lancer à la main avec le mot de passe de la base.
 */

// Une fois par instance : inutile de re-vérifier à chaque requête.
let enCours = null;

async function remplir(userId) {
  // --- Sites ---
  const sites = await Promise.all(
    SITES.map((s) =>
      prisma.site.upsert({
        where: { userId_slug: { userId, slug: s.slug } },
        update: {},
        create: { userId, slug: s.slug, name: s.name },
      })
    )
  );
  const parSlug = new Map(sites.map((s) => [s.slug, s]));

  // --- Positions : passage d'une table à 8 à une table à 6 ---
  await migrerPositions(userId);

  // --- Programme d'étude ---
  if ((await prisma.studyTheme.count({ where: { userId } })) === 0) {
    await prisma.studyTheme.createMany({
      data: THEMES.map((t, i) => ({ ...t, userId, position: i })),
    });
  }

  // --- Grille de tournois ---
  if ((await prisma.tournamentTemplate.count({ where: { userId } })) === 0) {
    const data = grilleWinamax
      .map((m, i) => {
        const site = parSlug.get(m.site);
        if (!site) return null;
        return {
          userId,
          siteId: site.id,
          name: m.name,
          buyIn: m.buyIn,
          fee: m.fee,
          bounty: m.bounty,
          format: m.format,
          speed: m.speed,
          usualHour: m.heureUsuelle,
          position: i,
        };
      })
      .filter(Boolean);
    if (data.length > 0) {
      await prisma.tournamentTemplate.createMany({ data });
    }
  }

  // --- Réglages ---
  await prisma.settings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

/** À appeler avant toute lecture ou écriture qui suppose les données de référence. */
export function assurerDonneesDeBase(userId) {
  enCours ??= remplir(userId).catch((e) => {
    // On laisse une instance suivante réessayer plutôt que de rester bloqué.
    enCours = null;
    throw e;
  });
  return enCours;
}

/**
 * Renomme les positions des ranges écrites du temps d'une table à 8.
 *
 * UTG et UTG+1 deviennent le lojack, MP devient le hijack. Deux anciennes
 * positions peuvent viser la même nouvelle : si le spot d'arrivée existe
 * déjà, la range est laissée telle quelle plutôt qu'écrasée — on ne détruit
 * pas un travail de saisie pour faire place nette. Elle n'apparaîtra plus
 * dans les sélecteurs, mais elle est toujours là.
 */
const RENOMMAGES = { UTG: "LJ", "UTG+1": "LJ", MP: "HJ" };

async function migrerPositions(userId) {
  const anciennes = await prisma.range.findMany({
    where: { userId, position: { in: Object.keys(RENOMMAGES) } },
  });
  if (anciennes.length === 0) return;

  for (const range of anciennes) {
    const position = RENOMMAGES[range.position];
    const occupe = await prisma.range.findFirst({
      where: {
        userId,
        position,
        action: range.action,
        vsPosition: range.vsPosition,
        stackDepth: range.stackDepth,
      },
      select: { id: true },
    });
    if (occupe) continue;

    await prisma.range.update({ where: { id: range.id }, data: { position } });
  }
}
