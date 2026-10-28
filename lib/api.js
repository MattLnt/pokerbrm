// Briques communes aux routes d'API : les mêmes réponses d'erreur et les
// mêmes conversions partout, plutôt que la même dizaine de lignes recopiée
// dans chaque fichier.

import { NextResponse } from "next/server";

export function sansBase() {
  return NextResponse.json(
    { error: "Aucune base configurée (DATABASE_URL manquante)." },
    { status: 503 }
  );
}

export function erreur(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Lit le corps JSON. Renvoie `{ body }` ou `{ reponse }` — la réponse d'erreur
 * déjà formée, à retourner telle quelle.
 */
export async function lireJson(request) {
  try {
    return { body: await request.json() };
  } catch {
    return { reponse: erreur("Corps JSON invalide.") };
  }
}

/** Nombre positif ou nul, arrondi au centime. La virgule est acceptée. */
export function nombre(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

/** Chaîne nettoyée et bornée, ou `null` si elle est vide. */
export function texte(v, max = 200) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
}

/**
 * Date d'un champ de formulaire (« AAAA-MM-JJ »), ou `null`.
 * Renvoie `undefined` si la valeur est invalide, pour qu'un appelant puisse
 * distinguer « pas de date » de « date illisible ».
 */
export function dateOuNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Entier borné, ou `null`. `undefined` si la valeur sort des bornes. */
export function entierOuNull(v, min, max) {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}
