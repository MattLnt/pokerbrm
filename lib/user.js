import { prisma } from "./db.js";
import { assurerDonneesDeBase } from "./bootstrap.js";

/**
 * V1 mono-utilisateur : on travaille sur un compte unique, créé à la volée
 * avec ses données de référence. Le modèle porte déjà un userId partout, donc
 * passer au multi-utilisateur ne demandera que de remplacer cette fonction
 * par la session NextAuth.
 */
const SINGLE_USER_EMAIL = process.env.APP_USER_EMAIL ?? "moi@pokerbrm.local";

export async function getCurrentUser() {
  const user = await prisma.user.upsert({
    where: { email: SINGLE_USER_EMAIL },
    update: {},
    create: { email: SINGLE_USER_EMAIL, name: "Joueur" },
  });

  // Sites, règles, paliers, thèmes et grille : créés au premier accès.
  await assurerDonneesDeBase(user.id);

  return user;
}

export async function getSiteMap(userId) {
  const sites = await prisma.site.findMany({ where: { userId } });
  return new Map(sites.map((s) => [s.slug, s]));
}
