import { NextResponse } from "next/server";

import { prisma, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { sansBase, erreur, lireJson, texte } from "@/lib/api";
import { SERVICES_WEB } from "@/lib/constants";

const SERVICES = new Set(SERVICES_WEB.map((s) => s.slug));

/**
 * Ce qui ne doit pas entrer : chaînes de connexion et clés d'API.
 *
 * Cette table recense des *références* — quel compte, quelle ressource, quel
 * tableau de bord. La base de l'app n'est pas chiffrée au repos côté
 * application et ses sauvegardes se promènent : un secret collé ici y
 * resterait en clair. Le garde-fou n'est pas une sécurité, c'est un
 * rappel — mais il attrape le copier-coller distrait, qui est le cas réel.
 */
const EMPREINTES_SECRET = [
  { motif: /\b(postgres(ql)?|mysql|redis|rediss|mongodb(\+srv)?|amqps?):\/\//i, quoi: "une chaîne de connexion" },
  { motif: /\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{8,}/, quoi: "une clé Stripe" },
  { motif: /\bwhsec_[A-Za-z0-9]{8,}/, quoi: "un secret de webhook" },
  { motif: /\b(ghp|gho|ghs|ghr)_[A-Za-z0-9]{20,}/, quoi: "un jeton GitHub" },
  { motif: /\bgithub_pat_[A-Za-z0-9_]{20,}/, quoi: "un jeton GitHub" },
  { motif: /\bxox[baprs]-[A-Za-z0-9-]{10,}/, quoi: "un jeton Slack" },
  { motif: /\bAKIA[0-9A-Z]{16}\b/, quoi: "une clé AWS" },
  { motif: /\bsk-(ant-)?[A-Za-z0-9_-]{20,}/, quoi: "une clé d'API" },
  { motif: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, quoi: "une clé privée" },
  { motif: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./, quoi: "un jeton JWT" },
];

/** Le libellé du secret repéré, ou `null` si tout est propre. */
function secretRepere(champs) {
  for (const valeur of champs) {
    if (!valeur) continue;
    for (const { motif, quoi } of EMPREINTES_SECRET) {
      if (motif.test(valeur)) return quoi;
    }
  }
  return null;
}

function valider(body) {
  if (!SERVICES.has(body?.service)) return { erreur: "Service inconnu." };

  const account = texte(body?.account, 160);
  const resource = texte(body?.resource, 160);
  if (!account && !resource) {
    return { erreur: "Indique au moins le compte utilisé ou la ressource." };
  }

  const url = texte(body?.url, 300);
  if (url && !/^https?:\/\//i.test(url)) {
    return { erreur: "L'adresse doit commencer par http:// ou https://." };
  }

  const note = texte(body?.note, 500);

  const secret = secretRepere([account, resource, url, note]);
  if (secret) {
    return {
      erreur: `On dirait ${secret}. Cet onglet ne stocke que des références — garde les secrets dans ton gestionnaire de mots de passe.`,
    };
  }

  return {
    valeurs: { service: body.service, account, resource, url, note },
  };
}

/** Vérifie que le projet visé appartient bien à l'utilisateur. */
async function resoudreProjet(userId, projectId) {
  if (!projectId) return { id: null };
  const projet = await prisma.project.findFirst({
    where: { id: String(projectId), userId },
    select: { id: true },
  });
  return projet ?? null;
}

export async function POST(request) {
  if (!hasDatabase()) return sansBase();

  const { body, reponse } = await lireJson(request);
  if (reponse) return reponse;

  const { erreur: message, valeurs } = valider(body);
  if (message) return erreur(message);

  const user = await getCurrentUser();
  const projet = await resoudreProjet(user.id, body?.projectId);
  if (!projet) return erreur("Projet introuvable.", 404);

  const dernier = await prisma.projectAccess.findFirst({
    where: { userId: user.id, projectId: projet.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const acces = await prisma.projectAccess.create({
    data: {
      ...valeurs,
      userId: user.id,
      projectId: projet.id,
      position: (dernier?.position ?? -1) + 1,
    },
  });

  return NextResponse.json({ id: acces.id });
}

export async function PATCH(request) {
  if (!hasDatabase()) return sansBase();

  const { body, reponse } = await lireJson(request);
  if (reponse) return reponse;

  const user = await getCurrentUser();
  const existant = await prisma.projectAccess.findFirst({
    where: { id: String(body?.id ?? ""), userId: user.id },
  });
  if (!existant) return erreur("Accès introuvable.", 404);

  const { erreur: message, valeurs } = valider(body);
  if (message) return erreur(message);

  // `projectId` absent du corps : on ne déplace pas l'accès.
  let projectId = existant.projectId;
  if (body?.projectId !== undefined) {
    const projet = await resoudreProjet(user.id, body.projectId);
    if (!projet) return erreur("Projet introuvable.", 404);
    projectId = projet.id;
  }

  await prisma.projectAccess.update({
    where: { id: existant.id },
    data: { ...valeurs, projectId },
  });
  return NextResponse.json({ id: existant.id });
}

export async function DELETE(request) {
  if (!hasDatabase()) return sansBase();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return erreur("Identifiant manquant.");

  const user = await getCurrentUser();
  const existant = await prisma.projectAccess.findFirst({
    where: { id, userId: user.id },
  });
  if (!existant) return erreur("Accès introuvable.", 404);

  await prisma.projectAccess.delete({ where: { id: existant.id } });
  return NextResponse.json({ ok: true });
}
