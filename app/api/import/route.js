import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser, getSiteMap } from "@/lib/user";

const FORMATS = new Set(["CLASSIC", "KO", "SPIN"]);
const SPEEDS = new Set(["NORMAL", "TURBO", "HYPER"]);

/** Ne garde que les champs attendus : le corps de requête n'est pas de confiance. */
function sanitize(t) {
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const date = new Date(t.date);
  if (Number.isNaN(date.getTime())) return null;
  if (!t.tournamentId || !t.site) return null;

  return {
    site: String(t.site),
    externalId: String(t.tournamentId),
    name: String(t.name ?? "Tournoi").slice(0, 200),
    playedAt: date,
    buyIn: num(t.buyIn),
    fee: num(t.fee),
    bounty: num(t.bounty),
    reEntries: Math.max(0, Math.trunc(num(t.reEntries))),
    entrants: t.entrants ? Math.trunc(num(t.entrants)) : null,
    finishPosition: t.finishPosition ? Math.trunc(num(t.finishPosition)) : null,
    prize: num(t.prize),
    bountiesWon: num(t.bountiesWon),
    totalCost: num(t.totalCost),
    netResult: num(t.netResult),
    format: FORMATS.has(t.format) ? t.format : "CLASSIC",
    speed: SPEEDS.has(t.speed) ? t.speed : "NORMAL",
    currency: String(t.currency ?? "EUR").slice(0, 3),
  };
}

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

  const incoming = Array.isArray(body?.tournaments) ? body.tournaments : [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: "Aucun tournoi à importer." }, { status: 400 });
  }

  const rows = incoming.map(sanitize).filter(Boolean);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Aucun tournoi exploitable." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const siteMap = await getSiteMap(user.id);

  const batch = await prisma.importBatch.create({
    data: { userId: user.id, fileCount: 0, newCount: 0, duplicateCount: 0 },
  });

  // La contrainte unique [siteId, externalId] fait la déduplication :
  // skipDuplicates laisse passer les tournois déjà présents sans échouer.
  const data = rows
    .map((r) => {
      const site = siteMap.get(r.site);
      if (!site) return null;
      const { site: _slug, ...rest } = r;
      return {
        ...rest,
        userId: user.id,
        siteId: site.id,
        importBatchId: batch.id,
      };
    })
    .filter(Boolean);

  const created = await prisma.tournament.createMany({
    data,
    skipDuplicates: true,
  });

  const duplicateCount = data.length - created.count;

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { newCount: created.count, duplicateCount },
  });

  // Date du dernier import, par site concerné.
  const touchedSlugs = [...new Set(rows.map((r) => r.site))];
  await Promise.all(
    touchedSlugs.map((slug) => {
      const site = siteMap.get(slug);
      if (!site) return null;
      return prisma.site.update({
        where: { id: site.id },
        data: { lastImportAt: new Date() },
      });
    })
  );

  return NextResponse.json({
    imported: created.count,
    duplicates: duplicateCount,
    batchId: batch.id,
  });
}
