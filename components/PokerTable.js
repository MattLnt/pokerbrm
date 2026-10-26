"use client";

import {
  placerSieges,
  positionBouton,
  cartesDe,
  tapisDe,
  miseDe,
  potDe,
  formatBb,
} from "@/lib/table";

/** Ce qu'on écrit dans le badge d'un siège, par acte. */
const ACTES = {
  open: { label: "Open", classe: "bg-warning text-[#241a00]" },
  "3bet": { label: "3bet", classe: "bg-negative text-[#2a0810]" },
  shove: { label: "Tapis", classe: "bg-negative text-[#2a0810]" },
};

/**
 * Une carte à jouer : fond clair, rang et enseigne dans la couleur du jeu
 * quatre couleurs, et l'enseigne reprise en grand derrière.
 *
 * Le fond reste clair quelle que soit l'enseigne : un pique à fond noir ne
 * se lirait pas, et c'est la couleur du rang qui porte l'information.
 */
function Carte({ carte }) {
  return (
    <span
      className="relative block h-[5.25rem] w-[3.75rem] shrink-0 overflow-hidden rounded-sm bg-[#f7f9fc] shadow-[0_4px_14px_rgba(0,0,0,0.55)]"
      style={{ color: carte.teinte }}
    >
      <span className="absolute left-2 top-1 text-[1.6rem] font-bold leading-none">
        {carte.rang}
      </span>
      <span className="absolute left-2 top-[1.9rem] text-[1rem] leading-none">
        {carte.symbole}
      </span>
      <span className="absolute -bottom-2 -right-1 text-[2.6rem] leading-none opacity-15">
        {carte.symbole}
      </span>
    </span>
  );
}

/**
 * Table en stade, cerclée d'un rail clair.
 *
 * Le rail fait de la table un objet posé sur la page : un trait fin sur un
 * fond de presque la même valeur donnait un schéma.
 */
export default function PokerTable({ heros, main, profondeur, scene }) {
  const sieges = placerSieges(heros);
  const cartes = cartesDe(main);
  const tapis = tapisDe(profondeur);
  const pot = potDe(scene, tapis, heros);
  const bouton = positionBouton(heros);

  return (
    // La marge laisse les plaques déborder sur le rail sans être rognées.
    <div className="relative w-full px-[7%] py-[9%]">
      <div className="relative w-full" style={{ aspectRatio: "16 / 9.5" }}>
        {/* Rail puis feutre */}
        <div className="absolute inset-0 rounded-full bg-surface-3 p-3 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)]">
          <div className="h-full w-full rounded-full bg-[#0c1e38] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),inset_0_14px_40px_rgba(0,0,0,0.45)]" />
        </div>

        {/* Pot */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="kicker mb-0.5">Pot</p>
          <p className="num text-[var(--fs-xl)] font-bold text-ink">
            {formatBb(pot)}
          </p>
        </div>

        {/* Bouton de donne */}
        {bouton ? (
          <span
            className="absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink text-[0.6rem] font-black text-bg-deep shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
            style={{ left: `${bouton.x}%`, top: `${bouton.y}%` }}
            aria-label="Bouton de donne"
          >
            D
          </span>
        ) : null}

        {/* Sièges */}
        {sieges.map((siege) => {
          const acte = scene?.actes?.[siege.position];
          const couche = acte === "fold";
          const badge = ACTES[acte];

          return (
            <div
              key={siege.position}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 ${
                couche ? "opacity-40" : ""
              }`}
              style={{ left: `${siege.x}%`, top: `${siege.y}%` }}
            >
              {siege.heros ? (
                <div className="mb-0.5 flex gap-1.5">
                  {cartes.map((carte, i) => (
                    <Carte key={i} carte={carte} />
                  ))}
                </div>
              ) : null}

              <span
                className={`flex items-center gap-2 whitespace-nowrap rounded-sm border px-2.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.5)] ${
                  siege.heros
                    ? "border-accent bg-surface-2"
                    : couche
                      ? "border-line/60 bg-surface/80"
                      : "border-line-strong bg-surface-2"
                }`}
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-xs text-[0.7rem] ${
                    siege.heros
                      ? "bg-accent text-accent-fg"
                      : "bg-surface-3 text-ink-muted"
                  }`}
                  aria-hidden
                >
                  ♠
                </span>
                <span
                  className={`text-[var(--fs-xs)] font-bold tracking-[0.06em] ${
                    siege.heros ? "text-accent-hover" : "text-ink-section"
                  }`}
                >
                  {siege.position}
                </span>
              </span>

              {badge ? (
                <span
                  className={`rounded-pill px-2 py-px text-[var(--fs-overline)] font-bold ${badge.classe}`}
                >
                  {badge.label}
                </span>
              ) : null}
            </div>
          );
        })}

        {/* Mises engagées, posées sur le feutre entre le joueur et le pot.
            Les blindes ne sont pas dessinées : elles ne sont pas une
            décision, et deux jetons de plus encombraient la table pour
            rien — le pot les compte déjà. */}
        {sieges.map((siege) => {
          const acte = scene?.actes?.[siege.position];
          const mise = miseDe(acte, tapis);
          if (mise <= 0) return null;

          return (
            <span
              key={`mise-${siege.position}`}
              className={`num absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-pill px-2 py-px text-[var(--fs-overline)] font-bold ring-1 ${
                acte === "shove"
                  ? "bg-negative text-[#2a0810] ring-negative/50"
                  : "bg-warning text-[#241a00] ring-warning/50"
              }`}
              style={{
                left: `${50 + (siege.x - 50) * 0.5}%`,
                top: `${50 + (siege.y - 50) * 0.5}%`,
              }}
            >
              {formatBb(mise)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
