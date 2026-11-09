"use client";

import {
  placerSieges,
  positionBouton,
  cartesDe,
  tapisDe,
  miseDe,
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
  const bouton = positionBouton(heros);

  return (
    // La marge laisse les plaques déborder sur le rail sans être rognées.
    <div className="@container relative w-full px-[7%] py-[9%]">
      <div className="relative w-full" style={{ aspectRatio: "16 / 9.5" }}>
        {/* Rail puis feutre. Un feutre vert profond : sur le fond bleu nuit
            de l'app, une table bleue se fondait dans la page. Le rail est
            un dégradé sombre avec un liseré clair, comme un bord rembourré. */}
        <div className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,#323d5c_0%,#161d30_55%,#0e1424_100%)] p-[1.4%] shadow-[0_28px_60px_-24px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.12)]">
          <div
            className="relative h-full w-full rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5),inset_0_18px_48px_rgba(0,0,0,0.5)]"
            style={{
              background:
                "radial-gradient(ellipse 70% 65% at 50% 42%, #1f7a5c 0%, #145a44 48%, #0c3d2f 100%)",
            }}
          >
            {/* Ligne de mise, à peine tracée */}
            <div className="absolute inset-[10%] rounded-full border border-white/[0.07]" />
          </div>
        </div>

        {/* Filigrane. Le pot n'y était pas utile — en préflop il vaut
            toujours la même chose pour un spot donné. À la place, la marque
            de l'app : pas le logo d'une room, la table n'est rattachée à
            aucun site et une marque déposée n'a pas sa place ici. */}
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[clamp(3rem,11cqw,7rem)] leading-none text-black/[0.18]"
          aria-hidden
        >
          ♠
        </span>

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
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 ${
                couche ? "opacity-40" : ""
              }`}
              style={{ left: `${siege.x}%`, top: `${siege.y}%` }}
            >
              {siege.heros ? (
                <div className="mb-2 flex gap-2">
                  {cartes.map((carte, i) => (
                    <Carte key={i} carte={carte} />
                  ))}
                </div>
              ) : null}

              <span
                className={`flex min-w-[4.5rem] flex-col items-center whitespace-nowrap rounded-[10px] border px-3 py-1.5 leading-none shadow-[0_6px_16px_-6px_rgba(0,0,0,0.8)] backdrop-blur-sm ${
                  siege.heros
                    ? "border-accent bg-[#0b2234]/95 shadow-[0_0_0_3px_rgba(56,189,248,0.18),0_6px_18px_-6px_rgba(0,0,0,0.8)]"
                    : couche
                      ? "border-white/5 bg-[#0b111e]/80"
                      : "border-white/15 bg-[#0d1424]/95"
                }`}
              >
                <span
                  className={`text-xs font-bold tracking-[0.08em] ${
                    siege.heros ? "text-accent-hover" : "text-ink"
                  }`}
                >
                  {siege.position}
                </span>
                <span className="num mt-1 text-2xs text-ink-muted">
                  {formatBb(tapis)}
                </span>
              </span>

              {badge ? (
                <span
                  className={`rounded-pill px-2 py-px text-2xs font-bold ${badge.classe}`}
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
              className="num absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-pill bg-black/45 py-0.5 pl-0.5 pr-2.5 text-2xs font-bold text-white ring-1 ring-white/10"
              style={{
                left: `${50 + (siege.x - 50) * 0.5}%`,
                top: `${50 + (siege.y - 50) * 0.5}%`,
              }}
            >
              {/* Le jeton : un disque cerclé de pointillés */}
              <span
                className={`size-4 rounded-full border-2 border-dashed border-white/70 ${
                  acte === "shove" ? "bg-negative" : "bg-warning"
                }`}
                aria-hidden
              />
              {formatBb(mise)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
