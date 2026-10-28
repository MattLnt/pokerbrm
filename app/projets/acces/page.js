import { getAcces, DEMO } from "@/lib/data";
import AccesClient from "./AccesClient";

export const metadata = { title: "Comptes et accès · Poker BRM" };

export const dynamic = "force-dynamic";

export default async function AccesPage() {
  const { groupes, projets } = await getAcces();

  return <AccesClient groupes={groupes} projets={projets} demo={DEMO} />;
}
