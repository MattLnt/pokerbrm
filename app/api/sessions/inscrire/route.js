import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { coutInscription, identifiantManuel } from "@/lib/session";

/**
 * Inscrit un tournoi de la grille dans la session ouverte.
 * Le coût est engagé immédiatement : le résultat net vaut −coût tant que le
 * tournoi n'est pas terminé, ce qui garde la bankroll honnête en direct.
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

  const modele = await prisma.tournamentTemplate.findFirst({
    where: { id: String(body?.templateId ?? ""), userId: user.id },
    include: { site: true },
  });
  if (!modele) {
    return NextResponse.json({ error: "Tournoi inconnu dans la grille." }, { status: 404 });
  }

  const session = await prisma.session.findFirst({
    where: { userId: user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (!session) {
    return NextResponse.json({ error: "Aucune session ouverte." }, { status: 409 });
  }

  const totalCost = coutInscription(modele, 0);

  const tournoi = await prisma.tournament.create({
    data: {
      userId: user.id,
      siteId: modele.siteId,
      externalId: identifiantManuel(),
      name: modele.name,
      playedAt: new Date(),
      buyIn: modele.buyIn,
      fee: modele.fee,
      bounty: modele.bounty,
      reEntries: 0,
      prize: 0,
      bountiesWon: 0,
      totalCost,
      netResult: -totalCost,
      format: modele.format,
      speed: modele.speed,
      source: "MANUAL",
      inProgress: true,
      sessionId: session.id,
      templateId: modele.id,
    },
  });

  return NextResponse.json({ id: tournoi.id, totalCost });
}
