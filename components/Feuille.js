"use client";

import { X } from "lucide-react";

/**
 * Feuille de saisie : ancrée en bas sur mobile, boîte centrée sur grand écran.
 *
 * `taille="large"` pour les contenus qui ont besoin d'air — une liste de
 * plusieurs dizaines de lignes dans une boîte de 480 px se lit à travers un
 * hublot. La hauteur est plafonnée en dvh et le corps défile, pour que la
 * feuille ne déborde jamais de l'écran, barre d'adresse mobile comprise.
 */
export default function Feuille({
  titre,
  onClose,
  avant = null,
  taille = "normal",
  pied = null,
  children,
}) {
  const largeur = taille === "large" ? "max-w-[860px]" : "max-w-[480px]";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        className={`surface relative flex max-h-[92dvh] w-full flex-col rounded-t-[22px] border-t border-line bg-surface lg:max-h-[88dvh] lg:rounded-[22px] lg:border ${largeur}`}
      >
        <div className="flex items-center gap-2 px-5 pt-5">
          {avant}
          <h2 className="min-w-0 flex-1 truncate text-xl font-bold">{titre}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X size={22} />
          </button>
        </div>

        <div className="scroll-fin min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">
          {children}
        </div>

        {/* Le pied reste hors de la zone qui défile : une barre d'action
            collante laisse toujours une ligne dépasser en dessous. */}
        {pied ? (
          <div
            className="shrink-0 border-t border-line px-5 pt-4"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          >
            {pied}
          </div>
        ) : null}
      </div>
    </div>
  );
}
