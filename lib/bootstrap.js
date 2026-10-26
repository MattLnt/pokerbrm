import { prisma } from "./db.js";
import { SITES, FORMATS } from "./constants.js";
import grilleWinamax from "./grille-winamax.json";
import { THEMES } from "./programme.js";

/**
 * Remplit les données de référence au premier accès : sites, règles de
 * buy-in, paliers, programme d'étude et grille de tournois.
 *
 * Tout est en création-si-absent, jamais en écrasement : relancer est sans
 * effet, et rien de ce que l'utilisateur modifie ensuite n'est réinitialisé
 * au déploiement suivant. C'est ce qui permet de s'en passer d'un script de
 * seed à lancer à la main avec le mot de passe de la base.
 */

// Une fois par instance : inutile de re-vérifier à chaque requête.
let enCours = null;

const LEVELS = [
  { targetAbi: 25, bankrollRequired: 5000, stopLoss: 3500, position: 0 },
  { targetAbi: 50, bankrollRequired: 10000, stopLoss: 6500, position: 1 },
  { targetAbi: 100, bankrollRequired: 20000, stopLoss: 13000, position: 2 },
];



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

  // --- Règles de buy-in ---
  await Promise.all(
    FORMATS.map((f) =>
      prisma.bankrollRule.upsert({
        where: { userId_format: { userId, format: f.key } },
        update: {},
        create: { userId, format: f.key, buyInsRequired: f.defaultBuyIns },
      })
    )
  );

  // --- Paliers : seulement s'il n'y en a aucun, pour ne jamais écraser
  //     ceux que l'utilisateur aura saisis.
  if ((await prisma.bankrollLevel.count({ where: { userId } })) === 0) {
    await prisma.bankrollLevel.createMany({
      data: LEVELS.map((l) => ({ ...l, userId })),
    });
  }

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
      await prisma.tournamentTemplate.createMany({ data, skipDuplicates: true });
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
