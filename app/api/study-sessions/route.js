import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

const TYPES = new Set(["THEORIE", "DRILL", "REVUE_MAINS", "REVUE_BDD"]);

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

  if (!TYPES.has(body?.type)) {
    return NextResponse.json({ error: "Type de session inconnu." }, { status: 400 });
  }

  const minutes = Math.trunc(Number(body?.minutes));
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) {
    return NextResponse.json({ error: "Durée invalide." }, { status: 400 });
  }

  const user = await getCurrentUser();

  // Un thème transmis doit appartenir à l'utilisateur.
  let themeId = null;
  if (body?.themeId) {
    const theme = await prisma.studyTheme.findFirst({
      where: { id: String(body.themeId), userId: user.id },
      select: { id: true },
    });
    themeId = theme?.id ?? null;
  }

  const session = await prisma.studySession.create({
    data: {
      userId: user.id,
      themeId,
      date: body?.date ? new Date(body.date) : new Date(),
      minutes,
      type: body.type,
      notes: body?.notes ? String(body.notes).slice(0, 500) : null,
    },
  });

  return NextResponse.json({ id: session.id });
}
