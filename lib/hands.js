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

/**
 * Couleur de fond d'une case.
 *
 * Les bandes sont en pourcentage absolu de la hauteur, pas normalisées sur le
 * total : 50 % raise et 30 % call occupent vraiment la moitié puis trois
 * dixièmes de la case, et les 20 % qui restent se lisent comme du fold. C'est
 * la seule façon de voir le mélange d'un coup d'œil.
 *
 */
export function cellBackground(actions, brushes) {
  // Triées dans l'ordre des pinceaux, pas dans celui où elles ont été
  // peintes : sinon les bandes d'une même case changent de place selon le
  // geste, et la grille devient illisible d'une main à l'autre.
  const entries = Object.entries(actions ?? {})
    .filter(([action, freq]) => action !== "fold" && freq > 0)
    .sort(
      ([a], [b]) =>
        brushes.findIndex((x) => x.key === a) -
        brushes.findIndex((x) => x.key === b)
    );
  if (entries.length === 0) return null;

  const teinte = (key) =>
    brushes.find((x) => x.key === key)?.color ?? "#7dd3fc";

  let curseur = 0;
  const stops = [];
  for (const [action, freq] of entries) {
    const debut = curseur;
    curseur = Math.min(100, curseur + freq);
    stops.push(`${teinte(action)} ${debut}% ${curseur}%`);
    if (curseur >= 100) break;
  }

  // Une seule action qui remplit tout : un aplat suffit, pas de dégradé.
  if (stops.length === 1 && curseur >= 100) return teinte(entries[0][0]);

  if (curseur < 100) stops.push(`${teinte("fold")} ${curseur}% 100%`);
  return `linear-gradient(to top, ${stops.join(", ")})`;
}

/**
 * Pose `pinceau` à `frequence` sur une main sans effacer le reste.
 *
 * Peindre remplaçait toute la case : impossible de composer un 50 % raise /
 * 30 % call. Les autres actions sont donc conservées, et seulement rabotées
 * si elles ne tiennent plus dans les 100 % — proportionnellement, pour garder
 * leur équilibre entre elles. Ce qui reste sous 100 % est du fold.
 */
export function melanger(existante, pinceau, frequence) {
  const autres = Object.entries(existante ?? {}).filter(
    ([action, f]) => action !== pinceau && f > 0
  );
  const suivante = { [pinceau]: frequence };

  const place = Math.max(0, 100 - frequence);
  const total = autres.reduce((s, [, f]) => s + f, 0);
  if (total === 0) return suivante;

  const facteur = total > place ? place / total : 1;
  for (const [action, f] of autres) {
    // Pas de 5 : c'est celui du réglage de fréquence, autant rester dessus.
    const valeur = Math.round((f * facteur) / 5) * 5;
    if (valeur > 0) suivante[action] = valeur;
  }
  return suivante;
}

/**
 * Vrai si toutes ces mains portent déjà ce pinceau à cette fréquence.
 * Sert à savoir si une sélection rapide pose ou retire.
 */
export function selectionPosee(cells, hands, pinceau, frequence) {
  if (hands.length === 0) return false;
  return hands.every((h) => (cells?.[h] ?? {})[pinceau] === frequence);
}

/**
 * Sélection rapide : pose le pinceau sur toutes ces mains, ou le retire si
 * elles le portent déjà toutes — un deuxième appui sur « Toutes les paires »
 * doit les relâcher, sinon le bouton ne sait que donner.
 *
 * Retirer n'efface que la part de ce pinceau : une main qui mélangeait
 * plusieurs actions garde les autres, et ne disparaît que si elle se retrouve
 * vide.
 */
export function basculerSelection(
  cells,
  hands,
  pinceau,
  frequence,
  protegees = new Set()
) {
  const suivant = { ...(cells ?? {}) };
  const retire = selectionPosee(cells, hands, pinceau, frequence);

  for (const hand of hands) {
    if (retire) {
      if (protegees.has(hand)) continue;
      const { [pinceau]: _retiree, ...reste } = suivant[hand] ?? {};
      if (Object.keys(reste).length === 0) delete suivant[hand];
      else suivant[hand] = reste;
    } else {
      suivant[hand] = melanger(suivant[hand], pinceau, frequence);
    }
  }
  return suivant;
}

/**
 * Mains qu'un autre ensemble encore posé revendique.
 *
 * Les ensembles se recouvrent : AKo, AQo, AJo et ATo sont à la fois des Ax
 * offsuit et des Broadway. Relâcher « Ax offsuit » les emportait, et
 * « Broadway » tombait avec elles. Elles restent donc en place tant qu'un
 * autre ensemble posé les contient.
 */
export function mainsProtegees(cells, cle, pinceau, frequence) {
  const protegees = new Set();
  for (const ensemble of QUICK_SELECTS) {
    if (ensemble.key === cle) continue;
    const hands = ensemble.hands();
    if (!selectionPosee(cells, hands, pinceau, frequence)) continue;
    for (const hand of hands) protegees.add(hand);
  }
  return protegees;
}

/** Bascule d'un bouton de sélection rapide, recouvrements compris. */
export function basculerSelectionRapide(cells, cle, pinceau, frequence) {
  const ensemble = QUICK_SELECTS.find((q) => q.key === cle);
  if (!ensemble) return cells ?? {};
  return basculerSelection(
    cells,
    ensemble.hands(),
    pinceau,
    frequence,
    mainsProtegees(cells, cle, pinceau, frequence)
  );
}
