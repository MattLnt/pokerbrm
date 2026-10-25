"use client";

import { identiteSite } from "@/lib/constants";

/**
 * Pastille d'une room.
 *
 * Si `public/logos/<slug>.svg` existe, il est utilisé ; sinon on retombe sur
 * une pastille colorée à l'initiale. Les logos officiels des opérateurs sont
 * des marques déposées et ce dépôt est public : ils ne sont pas versionnés.
 * Déposer les fichiers dans public/logos/ suffit à les faire apparaître.
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
          src={`/logos/${slug}.svg`}
          alt=""
          className="absolute inset-0 size-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      {site.initiale}
    </span>
  );
}
