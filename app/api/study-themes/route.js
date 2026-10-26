import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

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

function texte(valeur, max) {
  if (valeur === undefined || valeur === null) return null;
  const propre = String(valeur).trim();
  return propre === "" ? null : propre.slice(0, max);
}

/**
 * Les objectifs sont du JSON libre côté base. On les normalise ici, sinon
 * une forme inattendue casse l'affichage de la page plutôt que la requête.
 */
function objectifs(valeur) {
  if (!Array.isArray(valeur)) return null;
  return valeur
    .map((o) => ({
      label: texte(o?.label, 200),
      done: Boolean(o?.done),
    }))
    .filter((o) => o.label !== null)
    .slice(0, 30);
}

function entierOuNull(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const n = Math.trunc(Number(valeur));
  return Number.isFinite(n) && n > 0 && n <= 520 ? n : null;
}

export async function POST(request) {
  if (!hasDatabase()) return sansBase();

  const body = await lireCorps(request);
  const title = texte(body?.title, 200);
  if (!title) {
    return NextResponse.json({ error: "Le titre est obligatoire." }, { status: 400 });
  }

  const user = await getCurrentUser();
  // Le nouveau thème se range en fin de programme.
  const dernier = await prisma.studyTheme.findFirst({
    where: { userId: user.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const theme = await prisma.studyTheme.create({
    data: {
      userId: user.id,
      title,
      block: texte(body?.block, 120),
      weekFrom: entierOuNull(body?.weekFrom),
      weekTo: entierOuNull(body?.weekTo),
      position: (dernier?.position ?? -1) + 1,
      objectives: objectifs(body?.objectives) ?? [],
    },
  });

  return NextResponse.json({ id: theme.id });
}

export async function PATCH(request) {
  if (!hasDatabase()) return sansBase();

  const body = await lireCorps(request);
  if (!body?.id) {
    return NextResponse.json({ error: "Thème inconnu." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const existant = await prisma.studyTheme.findFirst({
    where: { id: String(body.id), userId: user.id },
    select: { id: true, position: true },
  });
  if (!existant) {
    return NextResponse.json({ error: "Thème inconnu." }, { status: 404 });
  }

  // Déplacement : on échange la position avec le voisin plutôt que de
  // renuméroter tout le programme.
  if (body.move === "up" || body.move === "down") {
    const voisin = await prisma.studyTheme.findFirst({
      where: {
        userId: user.id,
        position:
          body.move === "up"
            ? { lt: existant.position }
            : { gt: existant.position },
      },
      orderBy: { position: body.move === "up" ? "desc" : "asc" },
      select: { id: true, position: true },
    });
    if (!voisin) return NextResponse.json({ id: existant.id });

    await prisma.$transaction([
      prisma.studyTheme.update({
        where: { id: existant.id },
        data: { position: voisin.position },
      }),
      prisma.studyTheme.update({
        where: { id: voisin.id },
        data: { position: existant.position },
      }),
    ]);
    return NextResponse.json({ id: existant.id });
  }

  const data = {};
  if (body.title !== undefined) {
    const title = texte(body.title, 200);
    if (!title) {
      return NextResponse.json(
        { error: "Le titre est obligatoire." },
        { status: 400 }
      );
    }
    data.title = title;
  }
  if (body.block !== undefined) data.block = texte(body.block, 120);
  if (body.weekFrom !== undefined) data.weekFrom = entierOuNull(body.weekFrom);
  if (body.weekTo !== undefined) data.weekTo = entierOuNull(body.weekTo);
  if (body.objectives !== undefined) {
    const liste = objectifs(body.objectives);
    if (liste === null) {
      return NextResponse.json({ error: "Objectifs invalides." }, { status: 400 });
    }
    data.objectives = liste;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Rien à modifier." }, { status: 400 });
  }

  await prisma.studyTheme.update({ where: { id: existant.id }, data });
  return NextResponse.json({ id: existant.id });
}

export async function DELETE(request) {
  if (!hasDatabase()) return sansBase();

  const body = await lireCorps(request);
  if (!body?.id) {
    return NextResponse.json({ error: "Thème inconnu." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const supprimes = await prisma.studyTheme.deleteMany({
    where: { id: String(body.id), userId: user.id },
  });
  if (supprimes.count === 0) {
    return NextResponse.json({ error: "Thème inconnu." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
