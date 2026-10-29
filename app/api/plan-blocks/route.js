import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { sansBase, erreur, lireJson, texte } from "@/lib/api";
import { PLAN_KINDS } from "@/lib/constants";
import {
  MINUTES_JOUR,
  jourValide,
  dateStockee,
  minutesDepuisTexte,
  normaliserFin,
} from "@/lib/agenda";

const KINDS = new Set(PLAN_KINDS.map((k) => k.key));

/**
 * Les heures arrivent telles qu'elles ont été tapées (« 21:30 », « 2130 »)
 * et sont lues ici : une seule grammaire de l'heure pour toute l'app, celle
 * de `lib/agenda.js`, plutôt qu'un format normalisé côté client dont le
 * serveur dépendrait sans pouvoir le vérifier.
 */
function valider(body) {
  const jour = String(body?.jour ?? "");
  if (!jourValide(jour)) return { erreur: "Jour invalide." };

  if (!KINDS.has(body?.kind)) return { erreur: "Type de créneau inconnu." };

  const debut = minutesDepuisTexte(body?.start);
  if (debut === null) return { erreur: "Heure de début illisible (ex. 19:30)." };
  if (debut >= MINUTES_JOUR) {
    return { erreur: "Un créneau ne peut pas commencer à minuit pile la veille." };
  }

  const fin = minutesDepuisTexte(body?.end);
  if (fin === null) return { erreur: "Heure de fin illisible (ex. 23:00)." };

  return {
    valeurs: {
      date: dateStockee(jour),
      kind: body.kind,
      startMinute: debut,
      // Une fin avant le début veut dire « le lendemain » : un grind de 21 h
      // à 2 h est une soirée, pas une saisie fautive.
      endMinute: normaliserFin(debut, fin),
      note: texte(body?.note, 300),
      projectId: body.kind === "PROJET" ? texte(body?.projectId, 40) : null,
    },
  };
}

/** Un créneau de projet ne peut pointer que sur un projet de l'utilisateur. */
async function projetAutorise(userId, projectId) {
  if (!projectId) return true;
  const projet = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  return Boolean(projet);
}

/**
 * Recopie une journée sur une autre.
 *
 * C'est le geste qui fait vivre l'agenda : une semaine de grind se ressemble
 * d'un soir à l'autre, et retaper quatre créneaux à la main chaque jour
 * finirait par ne plus être fait du tout. La journée de destination est
 * complétée, jamais remplacée — on efface avec « Vider la journée ».
 */
async function copierJournee(userId, body) {
  const de = String(body?.copierDe ?? "");
  const vers = String(body?.jour ?? "");
  if (!jourValide(de) || !jourValide(vers)) return erreur("Jour invalide.");
  if (de === vers) return erreur("La journée de départ est celle d'arrivée.");

  const source = await prisma.planBlock.findMany({
    where: { userId, date: dateStockee(de) },
  });
  if (source.length === 0) return erreur("Cette journée n'a rien à recopier.");

  await prisma.planBlock.createMany({
    data: source.map((b) => ({
      userId,
      date: dateStockee(vers),
      kind: b.kind,
      startMinute: b.startMinute,
      endMinute: b.endMinute,
      projectId: b.projectId,
      note: b.note,
    })),
  });

  return NextResponse.json({ copies: source.length });
}

export async function POST(request) {
  if (!hasDatabase()) return sansBase();

  const { body, reponse } = await lireJson(request);
  if (reponse) return reponse;

  const user = await getCurrentUser();
  if (body?.copierDe) return copierJournee(user.id, body);

  const { erreur: message, valeurs } = valider(body);
  if (message) return erreur(message);

  if (!(await projetAutorise(user.id, valeurs.projectId))) {
    return erreur("Projet introuvable.", 404);
  }

  const bloc = await prisma.planBlock.create({
    data: { ...valeurs, userId: user.id },
  });

  return NextResponse.json({ id: bloc.id });
}

export async function PATCH(request) {
  if (!hasDatabase()) return sansBase();

  const { body, reponse } = await lireJson(request);
  if (reponse) return reponse;

  const user = await getCurrentUser();
  const existant = await prisma.planBlock.findFirst({
    where: { id: String(body?.id ?? ""), userId: user.id },
    select: { id: true },
  });
  if (!existant) return erreur("Créneau introuvable.", 404);

  const { erreur: message, valeurs } = valider(body);
  if (message) return erreur(message);

  if (!(await projetAutorise(user.id, valeurs.projectId))) {
    return erreur("Projet introuvable.", 404);
  }

  await prisma.planBlock.update({ where: { id: existant.id }, data: valeurs });
  return NextResponse.json({ id: existant.id });
}

/** Un créneau par son identifiant, ou toute une journée par son jour. */
export async function DELETE(request) {
  if (!hasDatabase()) return sansBase();

  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const jour = params.get("jour");
  const user = await getCurrentUser();

  if (jour) {
    if (!jourValide(jour)) return erreur("Jour invalide.");
    const { count } = await prisma.planBlock.deleteMany({
      where: { userId: user.id, date: dateStockee(jour) },
    });
    return NextResponse.json({ supprimes: count });
  }

  if (!id) return erreur("Identifiant manquant.");

  const existant = await prisma.planBlock.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existant) return erreur("Créneau introuvable.", 404);

  await prisma.planBlock.delete({ where: { id: existant.id } });
  return NextResponse.json({ ok: true });
}
