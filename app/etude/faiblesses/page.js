import Link from "next/link";
import { Target } from "lucide-react";

import {
  Card,
  SectionTitle,
  Button,
  ProgressBar,
  EmptyState,
} from "@/components/ui";
import { getWeakSpots } from "@/lib/data";
import { POSITIONS, RANGE_ACTIONS, STACK_DEPTHS } from "@/lib/constants";

export const metadata = { title: "Faiblesses · Poker BRM" };

/**
 * `getWeakSpots` renvoie un libellé de spot assemblé côté base
 * (« BTN RFI · 25BB »). On le redécoupe ici pour pouvoir ouvrir la range
 * correspondante ; quand la forme ne s'y prête pas, on affiche le libellé
 * sans lien plutôt que d'ouvrir une range au hasard.
 */
function decouper(libelle) {
  const [gauche, droite] = String(libelle).split("·").map((p) => p.trim());
  const [position, action] = (gauche ?? "").split(/\s+/);
  if (!POSITIONS.includes(position)) return null;
  if (!RANGE_ACTIONS.some((a) => a.key === action)) return null;
  const profondeur = STACK_DEPTHS.find((d) => d.key === droite);
  return { position, action, depth: profondeur?.key ?? null };
}

function tonalite(reussite) {
  if (reussite < 60) return "warning";
  if (reussite < 75) return "accent";
  return "positive";
}

// Classes écrites en toutes lettres : Tailwind lit le source, une classe
// construite à la volée ne serait jamais générée.
const COULEUR_TEXTE = {
  warning: "text-warning",
  accent: "text-accent",
  positive: "text-positive",
};

export default async function FaiblessesPage() {
  const spots = await getWeakSpots();

  if (spots.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Pas encore assez de drills"
        description="Les faiblesses se calculent à partir de tes réponses au trainer. Il faut une dizaine de mains sur un spot pour qu'il apparaisse ici."
        action={
          <Button as={Link} href="/trainer" variant="primary">
            <Target size={18} />
            Lancer un drill
          </Button>
        }
      />
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
      <div>
        <SectionTitle>Du plus faible au plus solide</SectionTitle>
        <div className="grid gap-2.5">
          {spots.map((spot, i) => {
            const cible = decouper(spot.spot);
            return (
              <Card key={spot.spot} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="num text-[var(--fs-overline)] font-bold tracking-[var(--overline-tracking)] text-ink-muted/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-0.5 font-medium">{spot.spot}</p>
                    <p className="num mt-0.5 text-sm text-ink-muted">
                      {spot.attempts} mains jouées
                    </p>
                  </div>
                  <p
                    className={`num shrink-0 text-[var(--fs-xl)] font-bold ${
                      COULEUR_TEXTE[tonalite(spot.success)]
                    }`}
                  >
                    {spot.success} %
                  </p>
                </div>

                <div className="mt-3">
                  <ProgressBar
                    value={spot.success}
                    max={100}
                    tone={tonalite(spot.success)}
                  />
                </div>

                {cible ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button as={Link} href="/trainer">
                      <Target size={18} />
                      Drill
                    </Button>
                    <Button
                      as={Link}
                      href={`/ranges?position=${cible.position}&action=${cible.action}${
                        cible.depth ? `&depth=${cible.depth}` : ""
                      }`}
                    >
                      Ouvrir la range
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      </div>

      <div className="max-lg:mt-6 lg:sticky lg:top-6">
        <SectionTitle tight>Comment lire ça</SectionTitle>
        <Card className="p-4">
          <p className="text-sm leading-[var(--lh-normal)] text-ink-muted">
            Le pourcentage est ta réussite au trainer sur ce spot. Un spot
            n&apos;apparaît qu&apos;à partir de dix mains jouées : en dessous,
            le chiffre ne dit rien.
          </p>
          <p className="mt-3 text-sm leading-[var(--lh-normal)] text-ink-muted">
            Deux façons de corriger : rejouer le spot au trainer, ou rouvrir la
            range et vérifier qu&apos;elle dit bien ce que tu veux jouer. Une
            réussite basse vient parfois d&apos;une range mal écrite, pas
            d&apos;une erreur de jeu.
          </p>
        </Card>
      </div>
    </div>
  );
}
