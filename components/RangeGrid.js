"use client";

import { useCallback, useRef } from "react";

import {
  RANKS,
  handAt,
  cellBackground,
  couvertureCase,
} from "@/lib/hands";

const TAILLE = RANKS.length; // 13

/**
 * Cases traversées en allant de `a` à `b`, algorithme de Bresenham.
 *
 * C'est tout l'intérêt : sur une diagonale parfaite, il avance d'une ligne
 * ET d'une colonne à chaque pas, donc il ne passe jamais par la case du
 * dessus ou du dessous. Un simple « quelle case est sous le doigt » les
 * attrapait au passage, et c'est ce qui rendait la sélection en diagonale
 * imprévisible. Il comble aussi les trous quand le doigt va plus vite que
 * les événements.
 *
 * `a` est exclu : il vient d'être peint au pas précédent.
 */
function ligne(a, b) {
  const cases = [];
  let { row, col } = a;
  const dRow = Math.abs(b.row - row);
  const dCol = Math.abs(b.col - col);
  const pasRow = row < b.row ? 1 : -1;
  const pasCol = col < b.col ? 1 : -1;
  let err = dCol - dRow;

  for (;;) {
    if (row !== a.row || col !== a.col) cases.push({ row, col });
    if (row === b.row && col === b.col) return cases;
    const e2 = 2 * err;
    if (e2 > -dRow) {
      err -= dRow;
      col += pasCol;
    }
    if (e2 < dCol) {
      err += dCol;
      row += pasRow;
    }
  }
}

/**
 * Grille 13×13 éditable.
 * Tap = peint la main avec le pinceau courant, glisser = peint en continu.
 * Appui long = ouvre le réglage de fréquence.
 */
export default function RangeGrid({ cells, brushes, onPaint, onLongPress }) {
  const grilleRef = useRef(null);
  const peinture = useRef(false);
  const derniereCase = useRef(null);
  const timerAppuiLong = useRef(null);

  /**
   * La case se déduit de la géométrie de la grille, pas de l'élément sous le
   * pointeur : les 2 px de gouttière entre les cases renvoyaient le
   * conteneur, et le trait sautait.
   */
  const caseSous = useCallback((e) => {
    const rect = grilleRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * TAILLE);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * TAILLE);
    if (row < 0 || row >= TAILLE || col < 0 || col >= TAILLE) return null;
    return { row, col };
  }, []);

  function annulerAppuiLong() {
    if (timerAppuiLong.current) {
      clearTimeout(timerAppuiLong.current);
      timerAppuiLong.current = null;
    }
  }

  function start(e) {
    const c = caseSous(e);
    if (!c) return;
    // Capture : le glissement continue de suivre le doigt même s'il sort de
    // la grille, et revient dedans sans avoir à relever.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    peinture.current = true;
    derniereCase.current = c;
    // `true` : c'est ce premier appui qui décide si le glissement peint ou
    // efface. Sans ça, repasser sur une case déjà peinte l'effaçait en
    // plein milieu d'un trait.
    onPaint(handAt(c.row, c.col), true);

    annulerAppuiLong();
    timerAppuiLong.current = setTimeout(() => {
      peinture.current = false;
      onLongPress(handAt(c.row, c.col));
    }, 500);
  }

  function move(e) {
    if (!peinture.current) return;
    const c = caseSous(e);
    if (!c) return;
    const precedente = derniereCase.current;
    if (c.row === precedente.row && c.col === precedente.col) return;

    annulerAppuiLong(); // un glissement n'est plus un appui long
    for (const etape of ligne(precedente, c)) {
      onPaint(handAt(etape.row, etape.col), false);
    }
    derniereCase.current = c;
  }

  function end() {
    peinture.current = false;
    derniereCase.current = null;
    annulerAppuiLong();
  }

  return (
    // Le plateau : un fond creusé autour des cases, qui les pose comme des
    // touches. `@container` : l'étiquette suit la taille de la grille, pas
    // celle de l'écran.
    <div className="@container rounded-card border border-line bg-bg-sunken p-1.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)] sm:p-2">
      <div
        ref={grilleRef}
        className="grid touch-none select-none gap-[3px] sm:gap-1"
        style={{ gridTemplateColumns: `repeat(${TAILLE}, minmax(0, 1fr))` }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        role="grid"
        aria-label="Grille des 169 mains"
      >
        {RANKS.map((_, row) =>
          RANKS.map((__, col) => {
            const hand = handAt(row, col);
            const fond = cellBackground(cells[hand], brushes);
            const couverture = couvertureCase(cells[hand]);
            // 65 % et non 50 : l'étiquette est centrée mais elle a une
            // hauteur, et son haut court vers 62 % de la case. En dessous,
            // elle déborderait sur le fond sombre, où du texte sombre ne se
            // lit plus — elle reste donc claire.
            const etiquette =
              couverture >= 65
                ? "text-bg-deep"
                : couverture > 0
                  ? "text-ink"
                  : "text-ink-muted";
            // Trois fonds à peine différents : paires sur la diagonale,
            // suited au-dessus, offsuit en dessous. La structure de la
            // grille se lit sans qu'on y pense.
            const famille =
              row === col
                ? "bg-surface-3"
                : row < col
                  ? "bg-surface-2"
                  : "bg-surface";
            const peinte = couverture > 0;
            const [rangs, suffixe] = [hand.slice(0, 2), hand.slice(2)];
            return (
              <button
                key={hand}
                type="button"
                data-hand={hand}
                role="gridcell"
                aria-label={hand}
                className={`relative aspect-square overflow-hidden rounded-[22%] font-semibold leading-none transition-[box-shadow,filter] duration-100 hover:brightness-125 ${famille} ${etiquette} ${
                  peinte
                    ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.35)]"
                    : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]"
                }`}
                style={fond ? { backgroundImage: fond } : undefined}
              >
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(8px,2.15cqw,13px)] tracking-[-0.02em]">
                  {rangs}
                  {suffixe ? (
                    <span className="text-[0.78em] font-medium opacity-70">
                      {suffixe}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
