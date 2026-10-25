import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser, getSiteMap } from "@/lib/user";

const TYPES = new Set([
  "DEPOSIT",
  "WITHDRAWAL",
  "RAKEBACK",
  "BONUS",
  "TICKET",
  "ADJUSTMENT",
]);

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

  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  }
  if (!TYPES.has(body?.type)) {
    return NextResponse.json({ error: "Type inconnu." }, { status: 400 });
  }

  const date = body?.date ? new Date(body.date) : new Date();
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const siteMap = await getSiteMap(user.id);
  const site = siteMap.get(body?.site);
  if (!site) {
    return NextResponse.json({ error: "Site inconnu." }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      siteId: site.id,
      type: body.type,
      amount,
      date,
      note: body?.note ? String(body.note).slice(0, 200) : null,
    },
  });

  return NextResponse.json({ id: transaction.id });
}
