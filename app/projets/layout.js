import { Screen, PageHeader } from "@/components/ui";
import ProjetsNav from "@/components/ProjetsNav";
import { getProjets, DEMO } from "@/lib/data";
import { relanceDue } from "@/lib/projets";

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

/**
 * Cadre commun aux deux sections des projets : le titre et la navigation ne
 * bougent pas, seule la table de travail change.
 */
export default async function ProjetsLayout({ children }) {
  const projets = await getProjets();
  const relances = projets.filter((p) => relanceDue(p) !== null).length;

  return (
    <Screen width="wide">
      <PageHeader eyebrow={DEMO ? "Données d'exemple" : null} title="Projets" />
      <ProjetsNav relances={relances} />
      {children}
      <div className="h-10" />
    </Screen>
  );
}
