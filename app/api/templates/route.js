import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser, getSiteMap } from "@/lib/user";

// Le Spin n'est plus proposé à la saisie.
const FORMATS = new Set(["CLASSIC", "KO", "MYSTERY", "SPACE_KO"]);
const SPEEDS = new Set(["NORMAL", "SEMITURBO", "TURBO", "HYPER"]);

function sansBase() {
  return NextResponse.json(
    { error: "Aucune base configurée (DATABASE_URL manquante)." },
    { status: 503 }
  );
}

const nombre = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};

function valider(body) {
  const name = String(body?.name ?? "").trim();
  if (!name) return { erreur: "Le nom est obligatoire." };

  const buyIn = nombre(body?.buyIn);
  const fee = nombre(body?.fee);
  const bounty = nombre(body?.bounty);
  if (buyIn + fee + bounty <= 0) {
    return { erreur: "Le coût total doit être supérieur à zéro." };
  }

  const heure = body?.usualHour === "" || body?.usualHour === null || body?.usualHour === undefined
    ? null
    : Math.trunc(Number(body.usualHour));
  if (heure !== null && (!Number.isFinite(heure) || heure < 0 || heure > 23)) {
    return { erreur: "L'heure doit être comprise entre 0 et 23." };
  }

  const minutes =
    body?.levelMinutes === "" || body?.levelMinutes == null
      ? null
      : Math.trunc(Number(body.levelMinutes));
  if (minutes !== null && (!Number.isFinite(minutes) || minutes < 1 || minutes > 120)) {
    return { erreur: "La durée de niveau doit être comprise entre 1 et 120 minutes." };
  }

  const tag = String(body?.tag ?? "").trim();

  return {
    valeurs: {
      name: name.slice(0, 120),
      buyIn,
      fee,
      bounty,
      format: FORMATS.has(body?.format) ? body.format : "CLASSIC",
      speed: SPEEDS.has(body?.speed) ? body.speed : "NORMAL",
      levelMinutes: minutes,
      tag: tag ? tag.slice(0, 24) : null,
      usualHour: heure,
      active: body?.active === undefined ? true : Boolean(body.active),
    },
  };
}

/** Ajoute un tournoi à la grille. */
export async function POST(request) {
  if (!hasDatabase()) return sansBase();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const { erreur, valeurs } = valider(body);
  if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });

  const user = await getCurrentUser();
  const sites = await getSiteMap(user.id);
  const site = sites.get(body?.site);
  if (!site) {
    return NextResponse.json({ error: "Room inconnue." }, { status: 400 });
  }

  const existe = await prisma.tournamentTemplate.findFirst({
    where: {
      userId: user.id,
      siteId: site.id,
      name: valeurs.name,
      buyIn: valeurs.buyIn,
      bounty: valeurs.bounty,
    },
    select: { id: true },
  });
  if (existe) {
    return NextResponse.json(
      { error: "Ce tournoi est déjà dans la grille." },
      { status: 409 }
    );
  }

  const dernier = await prisma.tournamentTemplate.findFirst({
    where: { userId: user.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const modele = await prisma.tournamentTemplate.create({
    data: {
      ...valeurs,
      userId: user.id,
      siteId: site.id,
      position: (dernier?.position ?? -1) + 1,
    },
  });

  return NextResponse.json({ id: modele.id });
}

/** Modifie un tournoi de la grille. */
export async function PATCH(request) {
  if (!hasDatabase()) return sansBase();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const modele = await prisma.tournamentTemplate.findFirst({
    where: { id: String(body?.id ?? ""), userId: user.id },
  });
  if (!modele) {
    return NextResponse.json({ error: "Tournoi introuvable." }, { status: 404 });
  }

  // Bascule active/inactive seule, sans toucher au reste.
  if (body?.active !== undefined && body?.name === undefined) {
    await prisma.tournamentTemplate.update({
      where: { id: modele.id },
      data: { active: Boolean(body.active) },
    });
    return NextResponse.json({ id: modele.id });
  }

  const { erreur, valeurs } = valider(body);
  if (erreur) return NextResponse.json({ error: erreur }, { status: 400 });

  const sites = await getSiteMap(user.id);
  const site = body?.site ? sites.get(body.site) : null;

  await prisma.tournamentTemplate.update({
    where: { id: modele.id },
    data: { ...valeurs, ...(site ? { siteId: site.id } : {}) },
  });

  return NextResponse.json({ id: modele.id });
}

/**
 * Retire un tournoi de la grille.
 * S'il a déjà servi, on le désactive au lieu de le supprimer : les tournois
 * joués gardent ainsi leur rattachement et l'historique reste intact.
 */
export async function DELETE(request) {
  if (!hasDatabase()) return sansBase();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const modele = await prisma.tournamentTemplate.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { entries: true } } },
  });
  if (!modele) {
    return NextResponse.json({ error: "Tournoi introuvable." }, { status: 404 });
  }

  if (modele._count.entries > 0) {
    await prisma.tournamentTemplate.update({
      where: { id: modele.id },
      data: { active: false },
    });
    return NextResponse.json({ id: modele.id, desactive: true });
  }

  await prisma.tournamentTemplate.delete({ where: { id: modele.id } });
  return NextResponse.json({ id: modele.id, supprime: true });
}
