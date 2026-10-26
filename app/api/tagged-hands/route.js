import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { TAGGED_HAND_STATUSES, STACK_DEPTHS } from "@/lib/constants";

const STATUTS = new Set(TAGGED_HAND_STATUSES.map((s) => s.key));
const PROFONDEURS = new Set(STACK_DEPTHS.map((d) => d.key));

function sansBase() {
  return NextResponse.json(
    { error: "Aucune base configurée (DATABASE_URL manquante)." },
    { status: 503 }
  );
}

async function lireCorps(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Les textes sont coupés à la saisie plutôt qu'au rendu : une main collée
 * depuis un client peut faire plusieurs dizaines de milliers de caractères.
 */
function texte(valeur, max) {
  if (valeur === undefined || valeur === null) return null;
  const propre = String(valeur).trim();
  return propre === "" ? null : propre.slice(0, max);
}

export async function POST(request) {
  if (!hasDatabase()) return sansBase();

  const body = await lireCorps(request);
  if (!body) {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const spot = texte(body.spot, 120);
  if (!spot) {
    return NextResponse.json({ error: "Le spot est obligatoire." }, { status: 400 });
  }

  const stackDepth = body.stackDepth ? String(body.stackDepth) : null;
  if (stackDepth && !PROFONDEURS.has(stackDepth)) {
    return NextResponse.json({ error: "Profondeur inconnue." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const main = await prisma.taggedHand.create({
    data: {
      userId: user.id,
      spot,
      stackDepth,
      description: texte(body.description, 1000),
      handHistory: texte(body.handHistory, 20000),
      link: texte(body.link, 500),
      status: STATUTS.has(body.status) ? body.status : "A_REVOIR",
    },
  });

  return NextResponse.json({ id: main.id });
}

export async function PATCH(request) {
  if (!hasDatabase()) return sansBase();

  const body = await lireCorps(request);
  if (!body?.id) {
    return NextResponse.json({ error: "Main inconnue." }, { status: 400 });
  }

  const user = await getCurrentUser();
  // On vérifie l'appartenance avant d'écrire : l'id vient du client.
  const existante = await prisma.taggedHand.findFirst({
    where: { id: String(body.id), userId: user.id },
    select: { id: true },
  });
  if (!existante) {
    return NextResponse.json({ error: "Main inconnue." }, { status: 404 });
  }

  const data = {};
  if (body.status !== undefined) {
    if (!STATUTS.has(body.status)) {
      return NextResponse.json({ error: "Statut inconnu." }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body.spot !== undefined) {
    const spot = texte(body.spot, 120);
    if (!spot) {
      return NextResponse.json(
        { error: "Le spot est obligatoire." },
        { status: 400 }
      );
    }
    data.spot = spot;
  }
  if (body.stackDepth !== undefined) {
    const profondeur = body.stackDepth ? String(body.stackDepth) : null;
    if (profondeur && !PROFONDEURS.has(profondeur)) {
      return NextResponse.json({ error: "Profondeur inconnue." }, { status: 400 });
    }
    data.stackDepth = profondeur;
  }
  if (body.description !== undefined) {
    data.description = texte(body.description, 1000);
  }
  if (body.handHistory !== undefined) {
    data.handHistory = texte(body.handHistory, 20000);
  }
  if (body.link !== undefined) data.link = texte(body.link, 500);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Rien à modifier." }, { status: 400 });
  }

  await prisma.taggedHand.update({ where: { id: existante.id }, data });
  return NextResponse.json({ id: existante.id });
}

export async function DELETE(request) {
  if (!hasDatabase()) return sansBase();

  const body = await lireCorps(request);
  if (!body?.id) {
    return NextResponse.json({ error: "Main inconnue." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const supprimees = await prisma.taggedHand.deleteMany({
    where: { id: String(body.id), userId: user.id },
  });
  if (supprimees.count === 0) {
    return NextResponse.json({ error: "Main inconnue." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
