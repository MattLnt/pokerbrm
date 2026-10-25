import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { coutInscription } from "@/lib/session";

const nombre = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Saisit le résultat d'un tournoi en cours, à la sortie.
 * Les re-entries se saisissent ici : c'est le seul moment où on les connaît,
 * et c'est l'information que les résumés Winamax ne donnent pas.
 */
export async function POST(request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "Aucune base configurée (DATABASE_URL manquante)." },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const tournoi = await prisma.tournament.findFirst({
    where: { id: String(body?.tournamentId ?? ""), userId: user.id },
  });
  if (!tournoi) {
    return NextResponse.json({ error: "Tournoi introuvable." }, { status: 404 });
  }

  const reEntries = Math.max(0, Math.trunc(nombre(body?.reEntries)));
  const prize = nombre(body?.prize);
  const bountiesWon = nombre(body?.bountiesWon);
  const place = body?.finishPosition ? Math.trunc(nombre(body.finishPosition)) : null;
  const entrants = body?.entrants ? Math.trunc(nombre(body.entrants)) : null;

  const totalCost = coutInscription(tournoi, reEntries);
  const netResult = Math.round((prize + bountiesWon - totalCost) * 100) / 100;

  await prisma.tournament.update({
    where: { id: tournoi.id },
    data: {
      reEntries,
      prize,
      bountiesWon,
      finishPosition: place,
      entrants,
      totalCost,
      netResult,
      inProgress: false,
    },
  });

  return NextResponse.json({ id: tournoi.id, totalCost, netResult });
}
