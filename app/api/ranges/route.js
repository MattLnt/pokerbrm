import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { POSITIONS, STACK_DEPTHS, RANGE_ACTIONS, RANGE_BRUSHES } from "@/lib/constants";
import { ALL_HANDS } from "@/lib/hands";
import { actionPossible, adversaireValide } from "@/lib/spots";

const VALID_POSITIONS = new Set(POSITIONS);
const VALID_DEPTHS = new Set(STACK_DEPTHS.map((d) => d.key));
const VALID_ACTIONS = new Set(RANGE_ACTIONS.map((a) => a.key));
const VALID_BRUSHES = new Set(RANGE_BRUSHES.map((b) => b.key));
const VALID_HANDS = new Set(ALL_HANDS);

/** Ne conserve que des mains et des fréquences valides. */
function sanitizeCells(cells) {
  if (!cells || typeof cells !== "object") return {};
  const out = {};
  for (const [hand, actions] of Object.entries(cells)) {
    if (!VALID_HANDS.has(hand) || !actions || typeof actions !== "object") continue;
    const clean = {};
    for (const [action, freq] of Object.entries(actions)) {
      if (!VALID_BRUSHES.has(action)) continue;
      const n = Number(freq);
      if (!Number.isFinite(n) || n <= 0) continue;
      clean[action] = Math.min(100, Math.round(n));
    }
    if (Object.keys(clean).length > 0) out[hand] = clean;
  }
  return out;
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

  const { position, action, stackDepth } = body ?? {};
  const vsPosition = typeof body?.vsPosition === "string" ? body.vsPosition : "";
  if (!VALID_POSITIONS.has(position)) {
    return NextResponse.json({ error: "Position inconnue." }, { status: 400 });
  }
  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }
  if (!VALID_DEPTHS.has(stackDepth)) {
    return NextResponse.json({ error: "Profondeur inconnue." }, { status: 400 });
  }
  if (!actionPossible(action, position)) {
    return NextResponse.json(
      { error: "Cette action ne se joue pas depuis cette position." },
      { status: 400 }
    );
  }
  if (!adversaireValide(action, position, vsPosition)) {
    return NextResponse.json({ error: "Adversaire impossible." }, { status: 400 });
  }

  const cells = sanitizeCells(body.cells);
  const user = await getCurrentUser();

  // vsPosition vide : la range vaut contre tout adversaire. C'est aussi ce
  // que portent les ranges saisies avant que l'éditeur ne le demande.
  const range = await prisma.range.upsert({
    where: {
      userId_position_action_vsPosition_stackDepth: {
        userId: user.id,
        position,
        action,
        vsPosition,
        stackDepth,
      },
    },
    // Enregistrer depuis l'éditeur, c'est valider : une range du jeu de base
    // perd son étiquette « à vérifier ».
    update: { cells, name: null },
    create: {
      userId: user.id,
      position,
      action,
      vsPosition,
      stackDepth,
      cells,
    },
  });

  return NextResponse.json({ id: range.id, handCount: Object.keys(cells).length });
}
