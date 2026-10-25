"use client";

import { identiteSite } from "@/lib/constants";

/**
 * Pastille d'une room.
 *
 * Affiche `public/logos/<slug>.png` s'il existe, sinon une pastille colorée à
 * l'initiale. L'initiale reste sous le logo : elle ne se voit que si l'image
 * manque, ce qui évite un trou pendant le chargement.
 */
export default function SiteBadge({ slug, taille = 40, avecLogo = true }) {
  const site = identiteSite(slug);

  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-[10px] font-bold text-white"
      style={{
        width: taille,
        height: taille,
        background: site.couleur,
        fontSize: Math.round(taille * 0.42),
      }}
      aria-hidden
    >
      {avecLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/logos/${slug}.png`}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      {site.initiale}
    </span>
  );
}
