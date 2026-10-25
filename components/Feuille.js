"use client";

import { X } from "lucide-react";

/**
 * Feuille de saisie : ancrée en bas sur mobile, boîte centrée sur grand écran.
 */
export default function Feuille({ titre, onClose, avant = null, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        className="relative w-full max-w-[480px] rounded-t-[22px] border-t border-line bg-surface p-5 lg:rounded-[22px] lg:border"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center gap-2">
          {avant}
          <h2 className="min-w-0 flex-1 truncate text-xl font-bold">{titre}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-2 grid size-11 shrink-0 place-items-center text-ink-muted"
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
