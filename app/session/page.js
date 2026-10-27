import { Screen, PageHeader } from "@/components/ui";
import SessionClient from "./SessionClient";
import {
  DEMO,
  getSessionOuverte,
  getGrille,
  getSessionsRecentes,
  getTournoisASolder,
} from "@/lib/data";

export const metadata = { title: "Session · Poker BRM" };

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

export default async function SessionPage() {
  const [session, grille, recentes, aSolder] = await Promise.all([
    getSessionOuverte(),
    getGrille(),
    getSessionsRecentes(8),
    getTournoisASolder(),
  ]);

  return (
    <Screen width="wide">
      <PageHeader
        eyebrow={DEMO ? "Données d'exemple" : null}
        title="Session"
      />
      <SessionClient
        demo={DEMO}
        session={session}
        grille={grille}
        recentes={recentes}
        aSolder={aSolder}
      />
    </Screen>
  );
}
