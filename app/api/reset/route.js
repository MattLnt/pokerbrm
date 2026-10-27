import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

/**
 * Vide l'historique de jeu : tournois, sessions, lots d'import et mouvements
 * d'argent. Tout ce qui chiffre la bankroll y passe — et seulement ça.
 *
 * Ce qui reste : les ranges, le programme d'étude, les mains mises de côté,
 * les révisions du trainer et la grille de tournois. Ce sont des mois de
 * saisie, ils n'ont rien à voir avec un solde à remettre à zéro.
 *
 * Après le reset, la bankroll vaut zéro partout : le point de départ se
 * repose avec un mouvement « Correction » par room.
 */

/** Ce qu'il y a à perdre, pour que l'écran puisse le dire avant d'effacer. */
export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({ tournaments: 0, transactions: 0, sessions: 0 });
  }

  const user = await getCurrentUser();
  const where = { userId: user.id };
  const [tournaments, transactions, sessions] = await Promise.all([
    prisma.tournament.count({ where }),
    prisma.transaction.count({ where }),
    prisma.session.count({ where }),
  ]);

  return NextResponse.json({ tournaments, transactions, sessions });
}

export async function POST() {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "Aucune base configurée (DATABASE_URL manquante)." },
      { status: 503 }
    );
  }

  const user = await getCurrentUser();
  const where = { userId: user.id };

  // En une transaction : un reset à moitié fait laisserait des tournois
  // rattachés à des sessions disparues. Les tournois d'abord, puisqu'ils
  // pointent vers les sessions et les lots d'import.
  const [tournaments, transactions, sessions] = await prisma.$transaction([
    prisma.tournament.deleteMany({ where }),
    prisma.transaction.deleteMany({ where }),
    prisma.session.deleteMany({ where }),
    prisma.importBatch.deleteMany({ where }),
    // La date du dernier import n'a plus de sens sans les tournois.
    prisma.site.updateMany({ where, data: { lastImportAt: null } }),
  ]);

  return NextResponse.json({
    tournaments: tournaments.count,
    transactions: transactions.count,
    sessions: sessions.count,
  });
}
