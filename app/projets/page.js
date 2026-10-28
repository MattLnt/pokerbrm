import { getProjets, DEMO } from "@/lib/data";
import { resumeProjets } from "@/lib/projets";
import ProjetsClient from "./ProjetsClient";

export const metadata = { title: "Projets · Poker BRM" };

export const dynamic = "force-dynamic";

export default async function ProjetsPage() {
  const projets = await getProjets();

  return (
    <ProjetsClient
      projets={projets}
      resume={resumeProjets(projets)}
      demo={DEMO}
    />
  );
}
