import RevueClient from "./RevueClient";
import { getTaggedHands, DEMO } from "@/lib/data";

export const metadata = { title: "Revue de mains · Poker BRM" };

export default async function RevuePage() {
  const mains = await getTaggedHands();
  return <RevueClient mains={mains} demo={DEMO} />;
}
