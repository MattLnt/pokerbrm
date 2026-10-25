import { Screen, PageHeader } from "@/components/ui";
import SessionClient from "./SessionClient";
import {
  DEMO,
  getSessionOuverte,
  getGrille,
  getSessionsRecentes,
} from "@/lib/data";

export const metadata = { title: "Session · Poker BRM" };

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

export default async function SessionPage() {
  const [session, grille, recentes] = await Promise.all([
    getSessionOuverte(),
    getGrille(),
    getSessionsRecentes(8),
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
      />
    </Screen>
  );
}
