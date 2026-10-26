// Grille 13×13 : paires sur la diagonale, suited au-dessus, offsuit en dessous.

export const RANKS = [
  "A",
  "K",
  "Q",
  "J",
  "T",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
];

/** Nom canonique de la main à la case (row, col). */
export function handAt(row, col) {
  const a = RANKS[row];
  const b = RANKS[col];
  if (row === col) return `${a}${a}`;
  return row < col ? `${a}${b}s` : `${b}${a}o`;
}

/** Les 169 mains, dans l'ordre de lecture de la grille. */
export const ALL_HANDS = RANKS.flatMap((_, row) =>
  RANKS.map((__, col) => handAt(row, col))
);

/** Nombre de combos d'une main : 6 pour une paire, 4 suited, 12 offsuit. */
export function combosOf(hand) {
  if (hand.length === 2) return 6;
  return hand.endsWith("s") ? 4 : 12;
}

export const TOTAL_COMBOS = 1326;

export function isPair(hand) {
  return hand.length === 2;
}

export function isSuited(hand) {
  return hand.endsWith("s");
}

/**
 * Sélections rapides de l'éditeur.
 * Chaque entrée renvoie la liste des mains concernées.
 */
export const QUICK_SELECTS = [
  {
    key: "pairs",
    label: "Toutes les paires",
    hands: () => ALL_HANDS.filter(isPair),
  },
  {
    key: "ax-s",
    label: "Ax suited",
    hands: () => ALL_HANDS.filter((h) => h.startsWith("A") && isSuited(h)),
  },
  {
    key: "ax-o",
    label: "Ax offsuit",
    hands: () => ALL_HANDS.filter((h) => h.startsWith("A") && h.endsWith("o")),
  },
  {
    key: "broadway",
    label: "Broadway",
    hands: () =>
      ALL_HANDS.filter((h) =>
        [...h.slice(0, 2)].every((r) => "AKQJT".includes(r))
      ),
  },
  {
    key: "suited-connectors",
    label: "Connecteurs assortis",
    hands: () =>
      ALL_HANDS.filter((h) => {
        if (!isSuited(h)) return false;
        const i = RANKS.indexOf(h[0]);
        const j = RANKS.indexOf(h[1]);
        return Math.abs(i - j) === 1;
      }),
  },
  {
    key: "suited",
    label: "Tout suited",
    hands: () => ALL_HANDS.filter(isSuited),
  },
];

/**
 * Statistiques d'une range.
 * `cells` : { "AKs": { raise: 60, call: 40 }, ... } — fréquences en %.
 */
export function rangeStats(cells = {}) {
  const byAction = {};
  let weightedCombos = 0;

  for (const [hand, actions] of Object.entries(cells)) {
    const combos = combosOf(hand);
    for (const [action, freq] of Object.entries(actions ?? {})) {
      if (action === "fold" || !freq) continue;
      const part = (combos * freq) / 100;
      byAction[action] = (byAction[action] ?? 0) + part;
      weightedCombos += part;
    }
  }

  return {
    combos: Math.round(weightedCombos * 10) / 10,
    percent: Math.round((weightedCombos / TOTAL_COMBOS) * 1000) / 10,
    byAction: Object.fromEntries(
      Object.entries(byAction).map(([k, v]) => [
        k,
        {
          combos: Math.round(v * 10) / 10,
          percent: Math.round((v / TOTAL_COMBOS) * 1000) / 10,
        },
      ])
    ),
  };
}

/** Couleur de fond d'une case : dégradé vertical si plusieurs actions. */
export function cellBackground(actions, brushes) {
  const entries = Object.entries(actions ?? {}).filter(
    ([action, freq]) => action !== "fold" && freq > 0
  );
  if (entries.length === 0) return null;

  const colorOf = (key) =>
    brushes.find((b) => b.key === key)?.color ?? "#38bdf8";

  if (entries.length === 1) {
    const [action, freq] = entries[0];
    if (freq >= 100) return colorOf(action);
    // Fréquence partielle : la couleur ne remplit qu'une partie de la case.
    return `linear-gradient(to top, ${colorOf(action)} ${freq}%, transparent ${freq}%)`;
  }

  // Plusieurs actions : bandes empilées proportionnelles.
  const total = entries.reduce((s, [, f]) => s + f, 0) || 100;
  let cursor = 0;
  const stops = entries.map(([action, freq]) => {
    const start = cursor;
    cursor += (freq / total) * 100;
    return `${colorOf(action)} ${start}% ${cursor}%`;
  });
  return `linear-gradient(to top, ${stops.join(", ")})`;
}
