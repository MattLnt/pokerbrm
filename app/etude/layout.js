import { Screen, PageHeader } from "@/components/ui";
import EtudeNav from "@/components/EtudeNav";
import { getTaggedHands, DEMO } from "@/lib/data";

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

/**
 * Cadre commun aux sections de l'étude : le titre et la navigation ne
 * bougent pas d'un onglet à l'autre, seule la table de travail change.
 */
export default async function EtudeLayout({ children }) {
  const mains = await getTaggedHands();
  const aRevoir = mains.filter((m) => m.status === "A_REVOIR").length;

  return (
    <Screen width="wide">
      <PageHeader eyebrow={DEMO ? "Données d'exemple" : null} title="Étude" />
      <EtudeNav aRevoir={aRevoir} />
      {children}
      <div className="h-10" />
    </Screen>
  );
}
