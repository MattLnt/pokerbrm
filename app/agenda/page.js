import { Screen, PageHeader } from "@/components/ui";
import { getAgenda } from "@/lib/data";
import AgendaClient from "./AgendaClient";

export const metadata = { title: "Agenda · Poker BRM" };

// Données propres à l'utilisateur, et fenêtre qui glisse d'un jour chaque
// nuit : jamais figées au moment du build.
export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const data = await getAgenda();

  return (
    <Screen width="wide">
      <PageHeader
        eyebrow={data.demo ? "Données d'exemple" : null}
        title="Agenda"
      />
      <AgendaClient data={data} />
      <div className="h-10" />
    </Screen>
  );
}
