import { Screen, PageHeader, EmptyState, Button } from "@/components/ui";
import { Target } from "lucide-react";
import Link from "next/link";

import TrainerSession from "./TrainerSession";
import { getRanges } from "@/lib/ranges";
import { DEMO } from "@/lib/data";

export const metadata = { title: "Trainer · Poker BRM" };

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

export default async function TrainerPage({ searchParams }) {
  const params = await searchParams;
  const ranges = await getRanges();

  // Un spot n'est jouable que si sa range contient au moins une main.
  const playable = Object.entries(ranges).filter(
    ([, cells]) => Object.keys(cells ?? {}).length > 0
  );

  if (playable.length === 0) {
    return (
      <Screen>
        <PageHeader
          eyebrow={DEMO ? "Données d'exemple" : null}
          title="Trainer"
        />
        <EmptyState
          icon={Target}
          title="Aucune range à travailler"
          description="Le trainer tire ses questions de tes propres ranges. Commence par en saisir une dans l'éditeur."
          action={
            <Button as={Link} href="/ranges" variant="primary" className="mt-2">
              Ouvrir l&apos;éditeur de ranges
            </Button>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen width="wide">
      <PageHeader eyebrow={DEMO ? "Données d'exemple" : null} title="Trainer" />
      <TrainerSession
        ranges={Object.fromEntries(playable)}
        demo={DEMO}
        initialSpot={params?.spot ?? null}
      />
    </Screen>
  );
}
