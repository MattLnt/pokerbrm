import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import {
  sansBase,
  erreur,
  lireJson,
  nombre,
  texte,
  dateOuNull,
} from "@/lib/api";
import { CATEGORIES_COMPTE } from "@/lib/constants";

const FLOWS = new Set(["INCOME", "EXPENSE"]);

function valider(body) {
  const label = texte(body?.label, 120);
  if (!label) return { erreur: "Le libellé est obligatoire." };

  const amount = nombre(body?.amount);
  if (amount <= 0) return { erreur: "Le montant doit être supérieur à zéro." };

  const flow = body?.flow;
  if (!FLOWS.has(flow)) return { erreur: "Sens du mouvement inconnu." };

  const categorie = CATEGORIES_COMPTE.find((c) => c.key === body?.category);
  if (!categorie) return { erreur: "Catégorie inconnue." };
  if (categorie.flow !== flow) {
    return { erreur: `« ${categorie.label} » n'est pas une catégorie de ce sens.` };
  }
  // Les catégories du miroir décrivent des mouvements déjà connus de l'app :
  // un retrait poker saisi ici compterait une seconde fois.
  if (categorie.miroir) {
    return {
      erreur:
        "Les dépôts et retraits poker se saisissent depuis la bankroll — le compte les reprend tout seul.",
    };
  }

  const date = dateOuNull(body?.date ?? new Date().toISOString());
  if (date === undefined) return { erreur: "Date invalide." };

  return {
    valeurs: {
      label,
      amount,
      flow,
      category: categorie.key,
      date: date ?? new Date(),
      note: texte(body?.note, 200),
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
  const entry = await prisma.bankEntry.create({
    data: { ...valeurs, userId: user.id },
  });

  return NextResponse.json({ id: entry.id });
}

export async function PATCH(request) {
  if (!hasDatabase()) return sansBase();

  const { body, reponse } = await lireJson(request);
  if (reponse) return reponse;

  const user = await getCurrentUser();
  const existant = await prisma.bankEntry.findFirst({
    where: { id: String(body?.id ?? ""), userId: user.id },
  });
  if (!existant) return erreur("Mouvement introuvable.", 404);

  const { erreur: message, valeurs } = valider(body);
  if (message) return erreur(message);

  await prisma.bankEntry.update({ where: { id: existant.id }, data: valeurs });
  return NextResponse.json({ id: existant.id });
}

export async function DELETE(request) {
  if (!hasDatabase()) return sansBase();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return erreur("Identifiant manquant.");

  const user = await getCurrentUser();
  const existant = await prisma.bankEntry.findFirst({
    where: { id, userId: user.id },
  });
  if (!existant) return erreur("Mouvement introuvable.", 404);

  await prisma.bankEntry.delete({ where: { id: existant.id } });
  return NextResponse.json({ ok: true });
}
