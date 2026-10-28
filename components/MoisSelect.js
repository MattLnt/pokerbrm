"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { libelleMois, moisCourant, moisDecale } from "@/lib/compte";

/**
 * Navigation de mois en mois.
 *
 * Un compte bancaire se lit par mois, pas sur une fenêtre glissante de
 * trente jours : le loyer tombe le 5, le salaire à la fin, et « les trente
 * derniers jours » mélangerait deux loyers ou aucun.
 *
 * Deux flèches et le mois en clair plutôt qu'une liste déroulante : on va
 * presque toujours au mois d'avant.
 */
export default function MoisSelect({ value }) {
  const router = useRouter();
  const params = useSearchParams();
  const courant = moisCourant();

  function aller(mois) {
    const next = new URLSearchParams(params);
    if (mois === courant) next.delete("mois");
    else next.set("mois", mois);
    const query = next.toString();
    router.replace(query ? `/compte?${query}` : "/compte", { scroll: false });
  }

  const precedent = moisDecale(value, -1);
  const suivant = moisDecale(value, 1);
  // On ne va pas dans le futur : il n'y a rien à y voir, et le solde affiché
  // est celui d'aujourd'hui.
  const futur = suivant > courant;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => aller(precedent)}
        aria-label={`Mois précédent, ${libelleMois(precedent)}`}
        className="grid size-11 place-items-center rounded-sm text-ink-section transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Largeur fixe : sans elle, passer de « mai » à « septembre » ferait
          sauter les deux flèches d'un cran. */}
      <p className="min-w-[8.5rem] text-center text-base font-semibold capitalize">
        {libelleMois(value)}
      </p>

      <button
        type="button"
        onClick={() => aller(suivant)}
        disabled={futur}
        aria-label={`Mois suivant, ${libelleMois(suivant)}`}
        className="grid size-11 place-items-center rounded-sm text-ink-section transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRight size={20} />
      </button>

      {value === courant ? null : (
        <button
          type="button"
          onClick={() => aller(courant)}
          className="ml-1 rounded-pill border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink-section transition-colors hover:border-line-strong hover:text-ink"
        >
          Ce mois
        </button>
      )}
    </div>
  );
}
