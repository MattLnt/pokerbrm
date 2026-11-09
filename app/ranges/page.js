import { cookies } from "next/headers";

import { Screen, PageHeader } from "@/components/ui";
import RangeEditor from "./RangeEditor";
import { DEMO } from "@/lib/data";
import { COOKIE_DERNIER_SPOT } from "@/lib/constants";
import { getRanges, getRangesAVerifier } from "@/lib/ranges";

export const metadata = { title: "Ranges · Poker BRM" };

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

export default async function RangesPage({ searchParams }) {
  const [initialRanges, aVerifier] = await Promise.all([
    getRanges(),
    getRangesAVerifier(),
  ]);
  // Une main taguée ouvre la page sur son propre spot : sans ça, on
  // retombait sur BTN · RFI et il fallait recliquer trois pastilles.
  // Sans spot dans l'adresse (arrivée par le menu), on reprend le dernier
  // spot ouvert, retenu dans un cookie par l'éditeur.
  let params = await searchParams;
  if (typeof params?.position !== "string") {
    const memo = (await cookies()).get(COOKIE_DERNIER_SPOT)?.value;
    if (memo) {
      try {
        params = Object.fromEntries(new URLSearchParams(decodeURIComponent(memo)));
      } catch {
        // Cookie illisible : on ouvre le spot par défaut.
      }
    }
  }
  const spot = {
    position: typeof params?.position === "string" ? params.position : null,
    action: typeof params?.action === "string" ? params.action : null,
    stackDepth: typeof params?.depth === "string" ? params.depth : null,
    vsPosition: typeof params?.vs === "string" ? params.vs : null,
  };

  return (
    <Screen width="wide">
      <PageHeader
        eyebrow={DEMO ? "Données d'exemple" : null}
        title="Ranges"
      />
      <RangeEditor
        initialRanges={initialRanges}
        aVerifierInitial={aVerifier}
        spot={spot}
        demo={DEMO}
      />
    </Screen>
  );
}
