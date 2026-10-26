"use client";

// Le tapis du héros dit déjà la profondeur : l'afficher une seconde fois
// sous la table faisait doublon.
import { placerSieges, cartesDe, tapisDe } from "@/lib/table";

/** Ce qu'on écrit dans la pastille d'un siège, par acte. */
const ACTES = {
  fold: { label: "Fold", classe: "text-ink-muted/60" },
  open: { label: "Open", classe: "text-warning" },
  "3bet": { label: "3bet", classe: "text-negative" },
  shove: { label: "Tapis", classe: "text-negative" },
};

function Carte({ carte }) {
  return (
    <span
      className={`grid h-11 w-8 place-items-center rounded-xs bg-ink font-bold leading-none ${
        carte.noire ? "text-[#0a0f1c]" : "text-[#c0203a]"
      }`}
    >
      <span className="text-[var(--fs-md)]">{carte.rang}</span>
      <span className="text-[var(--fs-sm)]">{carte.symbole}</span>
    </span>
  );
}

/**
 * Table de 8 joueurs, héros en bas.
 *
 * Elle ne sert pas à décorer : lire « BTN · Défense vs open · 25bb » demande
 * de reconstruire la scène de tête, alors qu'à table elle est sous les yeux.
 * Le siège du héros porte ses cartes et son tapis, les autres portent ce
 * qu'ils viennent de faire, et les couchés s'effacent.
 */
export default function PokerTable({ heros, main, profondeur, scene }) {
  const sieges = placerSieges(heros);
  const cartes = cartesDe(main);
  const tapis = tapisDe(profondeur);

  return (
    <div className="relative w-full" style={{ aspectRatio: "16 / 10" }}>
      {/* Le feutre : un ovale creusé, pas une carte de plus. */}
      <div className="absolute inset-[9%] rounded-[50%] border border-line bg-bg-sunken" />

      {scene?.consigne ? (
        <p className="absolute left-1/2 top-1/2 w-[46%] -translate-x-1/2 -translate-y-1/2 text-center text-[var(--fs-sm)] leading-[var(--lh-snug)] text-ink-muted">
          {scene.consigne}
        </p>
      ) : null}

      {sieges.map((siege) => {
        const acte = scene?.actes?.[siege.position];
        const couche = acte === "fold";
        const details = ACTES[acte];

        return (
          <div
            key={siege.position}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${siege.x}%`, top: `${siege.y}%` }}
          >
            {siege.heros ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex gap-1">
                  {cartes.map((carte, i) => (
                    <Carte key={i} carte={carte} />
                  ))}
                </div>
                <div className="rounded-pill border border-accent-line bg-accent-soft px-3 py-1 text-center">
                  <span className="text-[var(--fs-overline)] font-bold tracking-[var(--overline-tracking)] text-accent-hover">
                    {siege.position}
                  </span>
                  <span className="num ml-2 text-[var(--fs-xs)] text-ink-section">
                    {tapis} bb
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-pill border px-2.5 py-1 text-center transition-opacity ${
                  couche
                    ? "border-line/60 bg-surface/60 opacity-45"
                    : "border-line-strong bg-surface-2"
                }`}
              >
                <span className="block text-[var(--fs-overline)] font-bold tracking-[var(--overline-tracking)] text-ink-section">
                  {siege.position}
                </span>
                {details ? (
                  <span
                    className={`block text-[var(--fs-overline)] font-semibold ${details.classe}`}
                  >
                    {details.label}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        );
      })}

    </div>
  );
}
