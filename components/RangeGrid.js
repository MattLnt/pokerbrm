"use client";

import { useCallback, useRef } from "react";

import { RANKS, handAt, cellBackground } from "@/lib/hands";

/**
 * Grille 13×13 éditable.
 * Tap = peint la main avec le pinceau courant, glisser = peint en continu.
 * Appui long = ouvre le réglage de fréquence.
 */
export default function RangeGrid({ cells, brushes, onPaint, onLongPress }) {
  const painting = useRef(false);
  const lastHand = useRef(null);
  const longPressTimer = useRef(null);

  const handFromEvent = useCallback((e) => {
    const touch = e.touches?.[0] ?? e.changedTouches?.[0];
    const x = touch ? touch.clientX : e.clientX;
    const y = touch ? touch.clientY : e.clientY;
    const el = document.elementFromPoint(x, y);
    return el?.dataset?.hand ?? null;
  }, []);

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function start(e) {
    const hand = handFromEvent(e);
    if (!hand) return;
    painting.current = true;
    lastHand.current = hand;
    onPaint(hand);

    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      painting.current = false;
      onLongPress(hand);
    }, 500);
  }

  function move(e) {
    if (!painting.current) return;
    const hand = handFromEvent(e);
    if (!hand || hand === lastHand.current) return;
    clearLongPress(); // un glissement n'est plus un appui long
    lastHand.current = hand;
    onPaint(hand);
  }

  function end() {
    painting.current = false;
    lastHand.current = null;
    clearLongPress();
  }

  return (
    <div
      className="grid touch-none select-none gap-[2px]"
      style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      role="grid"
      aria-label="Grille des 169 mains"
    >
      {RANKS.map((_, row) =>
        RANKS.map((__, col) => {
          const hand = handAt(row, col);
          const background = cellBackground(cells[hand], brushes);
          const painted = Boolean(background);
          return (
            <button
              key={hand}
              type="button"
              data-hand={hand}
              role="gridcell"
              aria-label={hand}
              className={`relative aspect-square rounded-[3px] text-[var(--fs-overline)] font-semibold leading-none transition-colors ${
                painted ? "text-white" : "bg-surface-2 text-ink-muted"
              }`}
              style={background ? { background } : undefined}
            >
              <span className="pointer-events-none absolute inset-0 grid place-items-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
                {hand}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
