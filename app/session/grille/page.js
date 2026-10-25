import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Screen } from "@/components/ui";
import GrilleManager from "./GrilleManager";
import { DEMO, getGrille } from "@/lib/data";
import { SITES } from "@/lib/constants";

export const metadata = { title: "Grille · Poker BRM" };

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

export default async function GrillePage() {
  const grille = await getGrille({ tous: true });

  return (
    <Screen width="wide">
      <header className="mb-5 flex items-center gap-2 lg:mb-7">
        <Link
          href="/session"
          aria-label="Retour à la session"
          className="-ml-2 grid size-11 place-items-center rounded-tile text-ink"
        >
          <ChevronLeft size={26} />
        </Link>
        <div>
          {DEMO ? (
            <p className="text-sm text-ink-muted">Données d&apos;exemple</p>
          ) : null}
          <h1 className="text-[2rem] font-bold leading-none tracking-tight lg:text-[2.5rem]">
            Grille
          </h1>
        </div>
      </header>

      <GrilleManager grille={grille} sites={SITES} demo={DEMO} />
    </Screen>
  );
}
