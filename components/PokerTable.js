"use client";

import {
  placerSieges,
  cartesDe,
  tapisDe,
  miseDe,
  potDe,
  formatBb,
  BLINDES,
} from "@/lib/table";

/** Ce qu'on écrit dans le badge d'un siège, par acte. */
const ACTES = {
  open: { label: "Open", classe: "border-warning/40 bg-warning/15 text-warning" },
  "3bet": {
    label: "3bet",
    classe: "border-negative/40 bg-negative/15 text-negative",
  },
  shove: {
    label: "Tapis",
    classe: "border-negative/40 bg-negative/15 text-negative",
  },
};

/**
 * Une carte, dessinée comme une carte : rang en haut à gauche, couleur en
 * dessous, et le symbole repris en grand au centre. Deux petits rectangles
 * avec un rang et un pictogramme empilés ressemblaient à des boutons.
 */
function Carte({ carte }) {
  const teinte = carte.noire ? "text-[#11161f]" : "text-[#c0203a]";
  return (
    <span className="relative block h-[4.5rem] w-[3.25rem] rounded-sm bg-[#f4f6fa] shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
      <span
        className={`absolute left-1.5 top-1 text-[1.125rem] font-bold leading-none ${teinte}`}
      >
        {carte.rang}
      </span>
      <span
        className={`absolute left-1.5 top-[1.4rem] text-[0.8rem] leading-none ${teinte}`}
      >
        {carte.symbole}
      </span>
      <span
        className={`absolute bottom-1 right-1.5 text-[1.6rem] leading-none opacity-25 ${teinte}`}
      >
        {carte.symbole}
      </span>
    </span>
  );
}

/** Jeton de mise, posé devant un siège. */
function Jeton({ montant, tone = "neutre" }) {
  const tons = {
    neutre: "border-line-strong bg-surface-2 text-ink-section",
    mise: "border-warning/40 bg-warning/15 text-warning",
    tapis: "border-negative/40 bg-negative/15 text-negative",
  };
  return (
    <span
      className={`num whitespace-nowrap rounded-pill border px-1.5 py-px text-[var(--fs-overline)] font-bold ${tons[tone]}`}
    >
      {formatBb(montant)}
    </span>
  );
}

/**
 * Table de 8 joueurs, héros en bas.
 *
 * Elle ne décore pas : lire « BTN · Défense vs open · 25bb » demande de
 * reconstruire la scène de tête, alors qu'à table tout est sous les yeux —
 * qui a misé combien, ce qu'il y a au pot, et ce qu'on tient.
 */
export default function PokerTable({ heros, main, profondeur, scene }) {
  const sieges = placerSieges(heros);
  const cartes = cartesDe(main);
  const tapis = tapisDe(profondeur);
  const pot = potDe(scene, tapis, heros);
  const siegeBouton = sieges.find((s) => s.position === "BTN");

  return (
    <div className="relative w-full" style={{ aspectRatio: "16 / 9.5" }}>
      {/* Le rail, puis le feutre : deux anneaux valent mieux qu'un trait,
          c'est ce qui donne l'épaisseur d'une vraie table. */}
      <div className="absolute inset-[6%] rounded-[50%] border-2 border-line-strong bg-bg-deep p-[2.5%]">
        <div className="h-full w-full rounded-[50%] border border-line bg-bg-sunken" />
      </div>

      {/* Le pot, au centre, là où les jetons s'empilent vraiment. */}
      <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="kicker mb-1">Pot</p>
        <p className="num text-[var(--fs-lg)] font-bold text-ink">
          {formatBb(pot)}
        </p>
      </div>

      {/* Le bouton de donne : sans lui, rien ne dit où est la position. */}
      {siegeBouton ? (
        <span
          className="absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink text-[0.6rem] font-black text-bg-deep"
          style={{
            left: `${50 + (siegeBouton.x - 50) * 0.84}%`,
            top: `${50 + (siegeBouton.y - 50) * 0.84}%`,
          }}
          aria-label="Bouton de donne"
        >
          D
        </span>
      ) : null}

      {sieges.map((siege) => {
        const acte = scene?.actes?.[siege.position];
        const couche = acte === "fold";
        const badge = ACTES[acte];

        if (siege.heros) {
          return (
            <div
              key={siege.position}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
              style={{ left: `${siege.x}%`, top: `${siege.y}%` }}
            >
              <div className="flex gap-1.5">
                {cartes.map((carte, i) => (
                  <Carte key={i} carte={carte} />
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-pill border border-accent-line bg-accent-soft px-3 py-1">
                <span className="text-[var(--fs-xs)] font-bold tracking-[0.08em] text-accent-hover">
                  {siege.position}
                </span>
                <span className="num text-[var(--fs-xs)] text-ink">
                  {formatBb(tapis)}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div
            key={siege.position}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-opacity ${
              couche ? "opacity-35" : ""
            }`}
            style={{ left: `${siege.x}%`, top: `${siege.y}%` }}
          >
            <div
              className={`rounded-tile border px-2.5 py-1 text-center ${
                couche
                  ? "border-line/60 bg-surface/60"
                  : "border-line-strong bg-surface-2"
              }`}
            >
              <span className="block text-[var(--fs-overline)] font-bold tracking-[0.08em] text-ink-section">
                {siege.position}
              </span>
              <span
                className={`num block text-[var(--fs-overline)] ${
                  couche ? "text-ink-muted line-through" : "text-ink-muted"
                }`}
              >
                {formatBb(tapis)}
              </span>
            </div>

            {badge ? (
              <span
                className={`rounded-pill border px-2 py-px text-[var(--fs-overline)] font-bold ${badge.classe}`}
              >
                {badge.label}
              </span>
            ) : null}

          </div>
        );
      })}

      {/* Les mises, posées sur le feutre entre chaque joueur et le pot.
          Accrochées au siège, elles partaient vers l'extérieur de la table
          pour les joueurs des côtés. */}
      {sieges.map((siege) => {
        const acte = scene?.actes?.[siege.position];
        const mise = miseDe(acte, tapis);
        const blinde = BLINDES[siege.position] ?? 0;
        const montant = mise > 0 ? mise : acte === "fold" ? 0 : blinde;
        if (montant <= 0) return null;

        return (
          <span
            key={`mise-${siege.position}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${50 + (siege.x - 50) * 0.54}%`,
              top: `${50 + (siege.y - 50) * 0.54}%`,
            }}
          >
            <Jeton
              montant={montant}
              tone={acte === "shove" ? "tapis" : mise > 0 ? "mise" : "neutre"}
            />
          </span>
        );
      })}
    </div>
  );
}
