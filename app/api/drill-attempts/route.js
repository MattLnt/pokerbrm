import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { RANGE_BRUSHES } from "@/lib/constants";
import { ALL_HANDS } from "@/lib/hands";
import { review } from "@/lib/spaced";

const VALID_ANSWERS = new Set(RANGE_BRUSHES.map((b) => b.key));
const VALID_HANDS = new Set(ALL_HANDS);

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

  const { spot, hand, answer, correct } = body ?? {};
  if (!VALID_HANDS.has(hand)) {
    return NextResponse.json({ error: "Main inconnue." }, { status: 400 });
  }
  if (!VALID_ANSWERS.has(answer)) {
    return NextResponse.json({ error: "Réponse inconnue." }, { status: 400 });
  }
  if (typeof spot !== "string") {
    return NextResponse.json({ error: "Spot manquant." }, { status: 400 });
  }

  const [position, action, stackDepth] = spot.split("|");
  const user = await getCurrentUser();

  const range = await prisma.range.findFirst({
    where: { userId: user.id, position, action, stackDepth },
    select: { id: true },
  });
  if (!range) {
    return NextResponse.json({ error: "Range introuvable." }, { status: 404 });
  }

  // On repart du dernier passage sur cette main pour faire avancer l'intervalle.
  const last = await prisma.drillAttempt.findFirst({
    where: { userId: user.id, rangeId: range.id, hand },
    orderBy: { createdAt: "desc" },
  });

  const next = review(last, Boolean(correct));

  const attempt = await prisma.drillAttempt.create({
    data: {
      userId: user.id,
      rangeId: range.id,
      hand,
      answer,
      correct: Boolean(correct),
      easiness: next.easiness,
      interval: next.interval,
      repetition: next.repetition,
      dueAt: next.dueAt,
    },
  });

  return NextResponse.json({ id: attempt.id, dueAt: next.dueAt });
}
