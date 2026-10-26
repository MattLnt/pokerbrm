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
  open: { label: "Open", classe: "bg-warning text-[#241a00]" },
  "3bet": { label: "3bet", classe: "bg-negative text-[#2a0810]" },
  shove: { label: "Tapis", classe: "bg-negative text-[#2a0810]" },
};

/**
 * Une carte, pleine de la couleur de son enseigne.
 *
 * Le rang en blanc par-dessus se lit de loin, et deux cartes ne se
 * confondent jamais : c'est tout l'intérêt de la quadrichromie.
 */
function Carte({ carte, taille = "grand" }) {
  const dimensions =
    taille === "grand" ? "h-[4.75rem] w-[3.4rem]" : "h-[3.25rem] w-[2.35rem]";
  return (
    <span
      className={`relative block shrink-0 rounded-sm shadow-[0_3px_10px_rgba(0,0,0,0.55)] ${dimensions}`}
      style={{ background: carte.face }}
    >
      <span
        className={`absolute left-1.5 top-1 leading-none text-white/80 ${
          taille === "grand" ? "text-[0.8rem]" : "text-[0.6rem]"
        }`}
      >
        {carte.symbole}
      </span>
      <span
        className={`absolute inset-0 grid place-items-center font-bold leading-none text-white ${
          taille === "grand" ? "text-[1.9rem]" : "text-[1.3rem]"
        }`}
      >
        {carte.rang}
      </span>
    </span>
  );
}

/**
 * Plaque de joueur : pastille d'avatar à gauche, position et tapis à droite.
 * C'est la forme qu'on voit sur toutes les tables en ligne, et elle tient
 * deux informations dans la place qu'un rond n'en tient qu'une.
 */
function Plaque({ position, tapis, heros, couche }) {
  return (
    <div
      className={`flex items-center gap-2 whitespace-nowrap rounded-sm border px-2 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.5)] ${
        heros
          ? "border-accent bg-surface-2"
          : couche
            ? "border-line/60 bg-surface/80"
            : "border-line-strong bg-surface-2"
      }`}
    >
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-xs text-[0.75rem] ${
          heros ? "bg-accent text-accent-fg" : "bg-surface-3 text-ink-muted"
        }`}
        aria-hidden
      >
        ♠
      </span>
      <span className="leading-tight">
        <span
          className={`block text-[var(--fs-overline)] font-bold tracking-[0.06em] ${
            heros ? "text-accent-hover" : "text-ink-section"
          }`}
        >
          {position}
        </span>
        <span className="num block text-[var(--fs-overline)] text-ink-muted">
          {formatBb(tapis)}
        </span>
      </span>
    </div>
  );
}

/** Jeton de mise posé sur le feutre. */
function Jeton({ montant, tone = "neutre" }) {
  const tons = {
    neutre: "bg-bg-deep text-ink-section ring-line-strong",
    mise: "bg-warning text-[#241a00] ring-warning/50",
    tapis: "bg-negative text-[#2a0810] ring-negative/50",
  };
  return (
    <span
      className={`num whitespace-nowrap rounded-pill px-2 py-px text-[var(--fs-overline)] font-bold ring-1 ${tons[tone]}`}
    >
      {formatBb(montant)}
    </span>
  );
}

/**
 * Table en stade, cerclée d'un rail clair.
 *
 * Le rail n'est pas un ornement : c'est lui qui fait de la table un objet
 * posé sur la page. Un simple trait sur un fond presque de la même valeur
 * ne se voyait pas, et la table ressemblait à un schéma.
 */
export default function PokerTable({ heros, main, profondeur, scene }) {
  const sieges = placerSieges(heros);
  const cartes = cartesDe(main);
  const tapis = tapisDe(profondeur);
  const pot = potDe(scene, tapis, heros);
  const siegeBouton = sieges.find((s) => s.position === "BTN");

  return (
    // La marge laisse les plaques déborder sur le rail sans être rognées.
    <div className="relative w-full px-[7%] py-[9%]">
      <div className="relative w-full" style={{ aspectRatio: "16 / 9.5" }}>
        {/* Rail puis feutre */}
        <div className="absolute inset-0 rounded-full bg-surface-3 p-[0.75rem] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)]">
          <div className="h-full w-full rounded-full bg-[#0c1e38] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),inset_0_14px_40px_rgba(0,0,0,0.45)]" />
        </div>

        {/* Pot */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="kicker mb-0.5">Pot</p>
          <p className="num text-[var(--fs-xl)] font-bold text-ink">
            {formatBb(pot)}
          </p>
        </div>

        {/* Bouton de donne, décalé le long du rail pour ne pas tomber sur
            les cartes quand le héros est lui-même au bouton. */}
        {siegeBouton ? (
          <span
            className="absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink text-[0.6rem] font-black text-bg-deep shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
            style={{
              left: `${50 + (siegeBouton.x - 50) * 0.72}%`,
              top: `${50 + (siegeBouton.y - 50) * 0.72}%`,
            }}
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

              <Plaque
                position={siege.position}
                tapis={tapis}
                heros={siege.heros}
                couche={couche}
              />

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

        {/* Mises, posées sur le feutre entre le joueur et le pot */}
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
                left: `${50 + (siege.x - 50) * 0.5}%`,
                top: `${50 + (siege.y - 50) * 0.5}%`,
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
    </div>
  );
}
