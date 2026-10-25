import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import ImportClient from "./ImportClient";
import { DEMO } from "@/lib/data";

export const metadata = { title: "Importer · Poker BRM" };

export default function ImportPage() {
  return (
    <main className="px-4 pt-6">
      <header className="mb-5 flex items-center gap-2">
        <Link
          href="/bankroll"
          aria-label="Retour à la bankroll"
          className="-ml-2 grid size-11 place-items-center rounded-tile text-ink"
        >
          <ChevronLeft size={26} />
        </Link>
        <h1 className="text-[2rem] font-bold leading-none tracking-tight">
          Importer
        </h1>
      </header>

      <ImportClient demo={DEMO} />
    </main>
  );
}
