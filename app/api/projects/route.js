import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import {
  sansBase,
  erreur,
  lireJson,
  nombre,
  texte,
  dateOuNull,
} from "@/lib/api";
import { PROJECT_STAGES, PROJECT_BILLINGS } from "@/lib/constants";

const STAGES = new Set(PROJECT_STAGES.map((s) => s.key));
const BILLINGS = new Set(PROJECT_BILLINGS.map((b) => b.key));

/**
 * Les dates qui découlent d'un changement d'état.
 *
 * On ne demande pas de saisir « devis envoyé le… » après avoir coché « devis
 * envoyé » : c'est aujourd'hui, neuf fois sur dix. Une date explicitement
 * fournie par le formulaire a toujours le dernier mot.
 *
 * En sens inverse, repasser « payé » à « facturé » efface la date
 * d'encaissement : la garder laisserait une date de paiement sur un projet
 * qui n'est pas payé, et c'est elle qui fait naître l'entrée sur le compte.
 */
function datesDerivees({ stage, billing, fournies, precedent }) {
  const aujourdhui = new Date();
  const dates = { ...fournies };

  if (stage === "DEVIS_ENVOYE" && !dates.devisAt) {
    dates.devisAt = precedent?.devisAt ?? aujourdhui;
  }

  if (billing === "A_FACTURER") {
    dates.invoicedAt = null;
    dates.paidAt = null;
  } else if (billing === "FACTURE") {
    dates.invoicedAt = dates.invoicedAt ?? precedent?.invoicedAt ?? aujourdhui;
    dates.paidAt = null;
  } else if (billing === "PAYE") {
    dates.invoicedAt = dates.invoicedAt ?? precedent?.invoicedAt ?? null;
    dates.paidAt = dates.paidAt ?? precedent?.paidAt ?? aujourdhui;
  }

  return dates;
}

function valider(body, precedent = null) {
  const name = texte(body?.name, 120);
  if (!name) return { erreur: "Le nom du projet est obligatoire." };

  const stage = STAGES.has(body?.stage) ? body.stage : "IDEE";
  const billing = BILLINGS.has(body?.billing) ? body.billing : "A_FACTURER";

  // Montant à zéro accepté : une piste dont le prix n'est pas encore fixé
  // est une piste légitime, et la forcer à un chiffre inventé serait pire.
  const amount = nombre(body?.amount);

  const fournies = {};
  for (const champ of ["devisAt", "invoicedAt", "paidAt", "deadline"]) {
    if (body?.[champ] === undefined) continue;
    const d = dateOuNull(body[champ]);
    if (d === undefined) return { erreur: `Date invalide : ${champ}.` };
    fournies[champ] = d;
  }

  const url = texte(body?.url, 300);
  if (url && !/^https?:\/\//i.test(url)) {
    return { erreur: "L'adresse doit commencer par http:// ou https://." };
  }

  return {
    valeurs: {
      name,
      client: texte(body?.client, 120),
      amount,
      stage,
      billing,
      url,
      note: texte(body?.note, 1000),
      ...datesDerivees({ stage, billing, fournies, precedent }),
    },
  };
}

export async function POST(request) {
  if (!hasDatabase()) return sansBase();

  const { body, reponse } = await lireJson(request);
  if (reponse) return reponse;

  const { erreur: message, valeurs } = valider(body);
  if (message) return erreur(message);

  const user = await getCurrentUser();
  const dernier = await prisma.project.findFirst({
    where: { userId: user.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const projet = await prisma.project.create({
    data: {
      ...valeurs,
      userId: user.id,
      position: (dernier?.position ?? -1) + 1,
    },
  });

  return NextResponse.json({ id: projet.id });
}

export async function PATCH(request) {
  if (!hasDatabase()) return sansBase();

  const { body, reponse } = await lireJson(request);
  if (reponse) return reponse;

  const user = await getCurrentUser();
  const existant = await prisma.project.findFirst({
    where: { id: String(body?.id ?? ""), userId: user.id },
  });
  if (!existant) return erreur("Projet introuvable.", 404);

  /*
   * Changement d'un seul état, sans le reste du formulaire : les boutons
   * « Facturé » et « Payé » de la liste, et le passage d'un devis accepté en
   * projet en cours. Les dates qui en découlent sont posées au passage.
   */
  const seulementEtat =
    body?.name === undefined && (body?.stage !== undefined || body?.billing !== undefined);

  if (seulementEtat) {
    const stage = STAGES.has(body?.stage) ? body.stage : existant.stage;
    const billing = BILLINGS.has(body?.billing) ? body.billing : existant.billing;
    if (body?.stage !== undefined && !STAGES.has(body.stage)) {
      return erreur("État de projet inconnu.");
    }
    if (body?.billing !== undefined && !BILLINGS.has(body.billing)) {
      return erreur("État de facturation inconnu.");
    }

    await prisma.project.update({
      where: { id: existant.id },
      data: {
        stage,
        billing,
        ...datesDerivees({ stage, billing, fournies: {}, precedent: existant }),
      },
    });
    return NextResponse.json({ id: existant.id });
  }

  const { erreur: message, valeurs } = valider(body, existant);
  if (message) return erreur(message);

  await prisma.project.update({ where: { id: existant.id }, data: valeurs });
  return NextResponse.json({ id: existant.id });
}

/**
 * Supprime un projet. Ses accès partent avec lui (cascade) : ils ne décrivent
 * rien d'autre que ce projet.
 */
export async function DELETE(request) {
  if (!hasDatabase()) return sansBase();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return erreur("Identifiant manquant.");

  const user = await getCurrentUser();
  const existant = await prisma.project.findFirst({
    where: { id, userId: user.id },
  });
  if (!existant) return erreur("Projet introuvable.", 404);

  await prisma.project.delete({ where: { id: existant.id } });
  return NextResponse.json({ ok: true });
}
