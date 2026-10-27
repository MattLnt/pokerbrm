import { randomUUID } from "node:crypto";

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
  // Les deux moitiés d'un transfert ne se saisissent pas une par une : on
  // envoie "TRANSFER" avec une room de départ et une d'arrivée.
  "TRANSFER",
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

  const note = body?.note ? String(body.note).slice(0, 200) : null;

  if (body.type === "TRANSFER") {
    const vers = siteMap.get(body?.toSite);
    if (!vers) {
      return NextResponse.json(
        { error: "Room de destination inconnue." },
        { status: 400 }
      );
    }
    if (vers.id === site.id) {
      return NextResponse.json(
        { error: "Les deux rooms sont les mêmes." },
        { status: 400 }
      );
    }

    // Les deux moitiés naissent ensemble ou pas du tout : une sortie sans
    // son entrée ferait disparaître de l'argent de la bankroll totale.
    const transferId = randomUUID();
    const commun = { userId: user.id, amount, date, note, transferId };
    await prisma.$transaction([
      prisma.transaction.create({
        data: { ...commun, siteId: site.id, type: "TRANSFER_OUT" },
      }),
      prisma.transaction.create({
        data: { ...commun, siteId: vers.id, type: "TRANSFER_IN" },
      }),
    ]);

    return NextResponse.json({ transferId });
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      siteId: site.id,
      type: body.type,
      amount,
      date,
      note,
    },
  });

  return NextResponse.json({ id: transaction.id });
}
