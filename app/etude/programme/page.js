import ProgrammeClient from "./ProgrammeClient";
import { getStudyOverview, DEMO } from "@/lib/data";

export const metadata = { title: "Programme · Poker BRM" };

export default async function ProgrammePage() {
  const study = await getStudyOverview();
  return <ProgrammeClient themes={study.themes} demo={DEMO} />;
}
