import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { sansBase, erreur, lireJson, dateOuNull } from "@/lib/api";

/**
 * Solde d'ouverture du compte : le relevé dont on part.
 *
 * Sans lui, le solde affiché ne serait que la somme de ce qui a été saisi
 * dans l'app — un chiffre qui ne correspond à rien. On le pose une fois, on
 * le corrige quand le compte dérive du relevé de la banque.
 *
 * Les mouvements antérieurs à sa date sont ignorés dans le solde (cf.
 * `soldeCompte`) : ils sont déjà dedans.
 */
export async function PATCH(request) {
  if (!hasDatabase()) return sansBase();

  const { body, reponse } = await lireJson(request);
  if (reponse) return reponse;

  // Saisi à la main plutôt que par `nombre()`, qui refuse les valeurs
  // négatives : un découvert est un solde comme un autre.
  const brut = Number(String(body?.balance ?? "").replace(",", "."));
  if (!Number.isFinite(brut)) return erreur("Solde invalide.");
  const balance = Math.round(brut * 100) / 100;

  const at = dateOuNull(body?.at);
  if (at === undefined) return erreur("Date invalide.");

  const user = await getCurrentUser();
  await prisma.settings.upsert({
    where: { userId: user.id },
    update: { bankOpeningBalance: balance, bankOpeningAt: at },
    create: {
      userId: user.id,
      bankOpeningBalance: balance,
      bankOpeningAt: at,
    },
  });

  return NextResponse.json({ balance, at });
}
