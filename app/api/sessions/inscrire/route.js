import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { coutInscription, identifiantManuel } from "@/lib/session";

/**
 * Inscrit un ou plusieurs tournois de la grille dans la session ouverte.
 * On coche plusieurs tournois d'un coup au moment de s'asseoir : l'appel
 * accepte donc une liste.
 *
 * Le coût est engagé immédiatement : le résultat net vaut moins le coût tant
 * que le tournoi n'est pas terminé, ce qui garde la bankroll juste en direct.
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

  // Accepte une liste, ou un identifiant seul.
  const ids = Array.isArray(body?.templateIds)
    ? body.templateIds.map(String)
    : body?.templateId
      ? [String(body.templateId)]
      : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Aucun tournoi sélectionné." }, { status: 400 });
  }

  const user = await getCurrentUser();

  const session = await prisma.session.findFirst({
    where: { userId: user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (!session) {
    return NextResponse.json({ error: "Aucune session ouverte." }, { status: 409 });
  }

  const modeles = await prisma.tournamentTemplate.findMany({
    where: { id: { in: ids }, userId: user.id },
  });
  if (modeles.length === 0) {
    return NextResponse.json(
      { error: "Aucun de ces tournois n'est dans la grille." },
      { status: 404 }
    );
  }

  const data = modeles.map((m) => {
    const totalCost = coutInscription(m, 0);
    return {
      userId: user.id,
      siteId: m.siteId,
      externalId: identifiantManuel(),
      name: m.name,
      playedAt: new Date(),
      buyIn: m.buyIn,
      fee: m.fee,
      bounty: m.bounty,
      reEntries: 0,
      prize: 0,
      bountiesWon: 0,
      totalCost,
      netResult: -totalCost,
      format: m.format,
      speed: m.speed,
      levelMinutes: m.levelMinutes,
      source: "MANUAL",
      inProgress: true,
      sessionId: session.id,
      templateId: m.id,
    };
  });

  const res = await prisma.tournament.createMany({ data });
  const engage = data.reduce((s, t) => s + t.totalCost, 0);

  return NextResponse.json({
    inscrits: res.count,
    engage: Math.round(engage * 100) / 100,
  });
}

/**
 * Retire un tournoi inscrit par erreur.
 * On s'inscrit vite, en plein multi-tabling : le mauvais clic est inévitable.
 * Seul un tournoi encore en jeu peut partir — une fois le résultat saisi,
 * c'est de l'historique.
 */
export async function DELETE(request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "Aucune base configurée (DATABASE_URL manquante)." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const tournoi = await prisma.tournament.findFirst({
    where: { id, userId: user.id },
  });
  if (!tournoi) {
    return NextResponse.json({ error: "Tournoi introuvable." }, { status: 404 });
  }
  if (!tournoi.inProgress) {
    return NextResponse.json(
      { error: "Ce tournoi est terminé : son résultat est déjà enregistré." },
      { status: 409 }
    );
  }

  await prisma.tournament.delete({ where: { id: tournoi.id } });
  return NextResponse.json({ id: tournoi.id, supprime: true });
}
