import { getCompteOverview } from "@/lib/data";
import CompteClient from "./CompteClient";

export const metadata = { title: "Compte · Poker BRM" };

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

export default async function ComptePage({ searchParams }) {
  const params = await searchParams;
  const data = await getCompteOverview(params?.mois);

  return <CompteClient data={data} />;
}
