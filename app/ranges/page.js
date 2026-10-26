import { Screen, PageHeader } from "@/components/ui";
import RangeEditor from "./RangeEditor";
import { DEMO } from "@/lib/data";
import { getRanges } from "@/lib/ranges";

export const metadata = { title: "Ranges · Poker BRM" };

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

export default async function RangesPage({ searchParams }) {
  const initialRanges = await getRanges();
  // Une main taguée ouvre la page sur son propre spot : sans ça, on
  // retombait sur BTN · RFI et il fallait recliquer trois pastilles.
  const params = await searchParams;
  const spot = {
    position: typeof params?.position === "string" ? params.position : null,
    action: typeof params?.action === "string" ? params.action : null,
    stackDepth: typeof params?.depth === "string" ? params.depth : null,
  };

  return (
    <Screen width="wide">
      <PageHeader
        eyebrow={DEMO ? "Données d'exemple" : null}
        title="Ranges"
      />
      <RangeEditor initialRanges={initialRanges} spot={spot} demo={DEMO} />
    </Screen>
  );
}
