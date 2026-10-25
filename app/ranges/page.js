import { Screen, PageHeader } from "@/components/ui";
import RangeEditor from "./RangeEditor";
import { DEMO } from "@/lib/data";
import { getRanges } from "@/lib/ranges";

export const metadata = { title: "Ranges · Poker BRM" };

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

export default async function RangesPage() {
  const initialRanges = await getRanges();

  return (
    <Screen width="wide">
      <PageHeader
        eyebrow={DEMO ? "Données d'exemple" : null}
        title="Ranges"
      />
      <RangeEditor initialRanges={initialRanges} demo={DEMO} />
    </Screen>
  );
}
