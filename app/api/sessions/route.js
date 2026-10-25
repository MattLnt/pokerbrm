import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

function sansBase() {
  return NextResponse.json(
    { error: "Aucune base configurée (DATABASE_URL manquante)." },
    { status: 503 }
  );
}

/** Ouvre une session, ou renvoie celle qui est déjà ouverte. */
export async function POST() {
  if (!hasDatabase()) return sansBase();

  const user = await getCurrentUser();

  const ouverte = await prisma.session.findFirst({
    where: { userId: user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (ouverte) return NextResponse.json({ id: ouverte.id, deja: true });

  const session = await prisma.session.create({ data: { userId: user.id } });
  return NextResponse.json({ id: session.id, deja: false });
}

/**
 * Clôt la session ouverte.
 * Les tournois encore en cours restent en cours : on peut fermer la session
 * et saisir un résultat plus tard, plutôt que de perdre l'information.
 */
export async function PATCH(request) {
  if (!hasDatabase()) return sansBase();

  let body = {};
  try {
    body = await request.json();
  } catch {
    // corps facultatif
  }

  const user = await getCurrentUser();
  const ouverte = await prisma.session.findFirst({
    where: { userId: user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (!ouverte) {
    return NextResponse.json({ error: "Aucune session ouverte." }, { status: 404 });
  }

  const session = await prisma.session.update({
    where: { id: ouverte.id },
    data: {
      endedAt: new Date(),
      note: body?.note ? String(body.note).slice(0, 500) : undefined,
    },
  });

  return NextResponse.json({ id: session.id, endedAt: session.endedAt });
}
