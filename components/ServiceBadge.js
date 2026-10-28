"use client";

import { identiteService } from "@/lib/constants";

/**
 * Pastille d'un service (Vercel, Railway, Stripe…).
 *
 * La couleur de la marque et son initiale, sans image. `SiteBadge` tente un
 * logo parce que les deux rooms en ont un dans `public/` ; ici il y a seize
 * services et aucun fichier, et une balise `<img>` pointant dans le vide
 * affiche l'icône d'image cassée du navigateur avant que `onError` ne la
 * masque — seize fois sur la page.
 */
export default function ServiceBadge({ slug, taille = 34 }) {
  const service = identiteService(slug);

  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-sm font-bold text-white ring-1 ring-inset ring-white/15"
      style={{
        width: taille,
        height: taille,
        background: service.couleur,
        fontSize: Math.round(taille * 0.42),
      }}
      aria-hidden
    >
      {service.initiale}
    </span>
  );
}
