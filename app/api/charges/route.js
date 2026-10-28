import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import {
  sansBase,
  erreur,
  lireJson,
  nombre,
  texte,
  entierOuNull,
} from "@/lib/api";
import { CATEGORIES_COMPTE } from "@/lib/constants";

function valider(body) {
  const label = texte(body?.label, 120);
  if (!label) return { erreur: "Le libellé est obligatoire." };

  const amount = nombre(body?.amount);
  if (amount <= 0) return { erreur: "Le montant doit être supérieur à zéro." };

  // Une charge récurrente est une dépense : un revenu régulier se saisit
  // comme une entrée, il ne se « prélève » pas.
  const categorie = CATEGORIES_COMPTE.find(
    (c) => c.key === body?.category && c.flow === "EXPENSE" && !c.miroir
  );
  if (!categorie) return { erreur: "Catégorie de dépense inconnue." };

  const dayOfMonth = entierOuNull(body?.dayOfMonth, 1, 31);
  if (dayOfMonth === undefined) {
    return { erreur: "Le jour du mois doit être compris entre 1 et 31." };
  }

  return {
    valeurs: {
      label,
      amount,
      category: categorie.key,
      dayOfMonth,
      active: body?.active === undefined ? true : Boolean(body.active),
    },
  };
}

export async function POST(request) {
  if (!hasDatabase()) return sansBase();

  const { body, reponse } = await lireJson(request);
  if (reponse) return reponse;

  const { erreur: message, valeurs } = valider(body);
  if (message) return erreur(message);

  const user = await getCurrentUser();
  const charge = await prisma.recurringCharge.create({
    data: { ...valeurs, userId: user.id },
  });

  return NextResponse.json({ id: charge.id });
}

export async function PATCH(request) {
  if (!hasDatabase()) return sansBase();

  const { body, reponse } = await lireJson(request);
  if (reponse) return reponse;

  const user = await getCurrentUser();
  const existant = await prisma.recurringCharge.findFirst({
    where: { id: String(body?.id ?? ""), userId: user.id },
  });
  if (!existant) return erreur("Charge introuvable.", 404);

  // Bascule active/inactive seule, sans toucher au reste — comme la grille.
  if (body?.active !== undefined && body?.label === undefined) {
    await prisma.recurringCharge.update({
      where: { id: existant.id },
      data: { active: Boolean(body.active) },
    });
    return NextResponse.json({ id: existant.id });
  }

  const { erreur: message, valeurs } = valider(body);
  if (message) return erreur(message);

  await prisma.recurringCharge.update({
    where: { id: existant.id },
    data: valeurs,
  });
  return NextResponse.json({ id: existant.id });
}

export async function DELETE(request) {
  if (!hasDatabase()) return sansBase();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return erreur("Identifiant manquant.");

  const user = await getCurrentUser();
  const existant = await prisma.recurringCharge.findFirst({
    where: { id, userId: user.id },
  });
  if (!existant) return erreur("Charge introuvable.", 404);

  await prisma.recurringCharge.delete({ where: { id: existant.id } });
  return NextResponse.json({ ok: true });
}
