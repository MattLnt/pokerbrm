/**
 * Mise en scène d'un spot sur une table.
 *
 * Le trainer posait une question en texte : « Ta main : AKs ». À table on ne
 * lit pas « AKs », on voit deux cartes, une position, un tapis, et quelqu'un
 * qui vient d'ouvrir. Ce module traduit un spot de range en ce qu'on verrait
 * vraiment, pour que l'entraînement ressemble à la situation qu'il prépare.
 */

import { POSITIONS, STACK_DEPTHS } from "./constants.js";

/** Ordre de parole d'une main, du premier au dernier. */
export const ORDRE_PAROLE = POSITIONS;

/** Tapis affiché, par profondeur de range. */
const TAPIS = {
  "60BB_PLUS": 75,
  "40BB": 40,
  "25BB": 25,
  "15_20BB": 18,
  "SUB_12BB": 10,
};

export function tapisDe(profondeur) {
  return TAPIS[profondeur] ?? 40;
}

export function libelleProfondeur(profondeur) {
  return STACK_DEPTHS.find((d) => d.key === profondeur)?.label ?? profondeur;
}

/** Proportions de la table, en unités de largeur. */
const RATIO = 9.5 / 16;

/**
 * Place les sièges le long d'un stade — côtés droits, bouts arrondis —
 * et non d'une ellipse.
 *
 * C'est la forme des tables des logiciels d'entraînement, et elle n'est pas
 * décorative : sur une ellipse, les sièges des côtés se tassent et ceux du
 * haut s'écartent. Sur un stade, l'écart entre deux voisins reste le même
 * tout autour, parce qu'on répartit le long du périmètre.
 *
 * Le héros est toujours en bas au centre : c'est la seule disposition qu'on
 * lit sans réfléchir. Les autres suivent l'ordre de parole vers la droite.
 */
export function placerSieges(heros) {
  const depart = ORDRE_PAROLE.indexOf(heros);
  if (depart === -1) return [];

  const total = ORDRE_PAROLE.length;
  const h = 100 * RATIO; // hauteur dans les mêmes unités que la largeur
  const r = h / 2; // rayon des bouts arrondis
  const L = Math.max(0, 100 - 2 * r); // longueur d'un côté droit
  const perimetre = 2 * L + 2 * Math.PI * r;

  /** Point du périmètre à la distance `s` du bas-centre, vers la droite. */
  function point(s) {
    let d = ((s % perimetre) + perimetre) % perimetre;

    // Demi-côté bas, du centre vers la droite.
    if (d < L / 2) return { x: 50 + d, y: h };
    d -= L / 2;

    // Bout droit, du bas vers le haut.
    if (d < Math.PI * r) {
      const angle = d / r; // 0 en bas, π en haut
      return {
        x: 50 + L / 2 + r * Math.sin(angle),
        y: h / 2 + r * Math.cos(angle),
      };
    }
    d -= Math.PI * r;

    // Côté haut, de droite à gauche.
    if (d < L) return { x: 50 + L / 2 - d, y: 0 };
    d -= L;

    // Bout gauche, du haut vers le bas.
    if (d < Math.PI * r) {
      const angle = d / r;
      return {
        x: 50 - L / 2 - r * Math.sin(angle),
        y: h / 2 - r * Math.cos(angle),
      };
    }
    d -= Math.PI * r;

    // Demi-côté bas, de la gauche vers le centre.
    return { x: 50 - L / 2 + d, y: h };
  }

  return ORDRE_PAROLE.map((position, i) => {
    const rang = (i - depart + total) % total;
    const { x, y } = point((rang * perimetre) / total);
    return {
      position,
      rang,
      heros: rang === 0,
      x,
      // Ramené en pourcentage de la hauteur de la boîte.
      y: (y / h) * 100,
    };
  });
}

/**
 * Ce que les autres joueurs ont fait avant que le héros ne parle.
 *
 * L'action d'une range dit à quelle situation elle répond ; on en déduit la
 * scène. `vsPosition` existe dans le modèle mais l'éditeur ne le remplit pas
 * encore : l'adversaire est donc tiré au hasard parmi les positions
 * plausibles, et il est tiré une fois par main pour ne pas sauter d'un
 * rendu à l'autre.
 */
export function scenario(action, heros, tirage = Math.random) {
  const rangHeros = ORDRE_PAROLE.indexOf(heros);
  const avant = ORDRE_PAROLE.slice(0, rangHeros);
  const apres = ORDRE_PAROLE.slice(rangHeros + 1);

  const au_hasard = (liste) =>
    liste.length === 0 ? null : liste[Math.floor(tirage() * liste.length)];

  // Un joueur qui a agi avant le héros ne peut venir que d'avant lui. Depuis
  // UTG il n'y a personne : la scène se contente de le dire.

  switch (action) {
    case "RFI":
      return {
        consigne: "Personne n'est entré. À toi de parler.",
        actes: Object.fromEntries(avant.map((p) => [p, "fold"])),
      };

    case "DEF_VS_OPEN":
    case "3BET": {
      const ouvreur = au_hasard(avant);
      return {
        consigne: ouvreur
          ? `${ouvreur} ouvre. Les autres se couchent.`
          : "Personne ne peut ouvrir avant toi depuis cette position.",
        actes: Object.fromEntries(
          ORDRE_PAROLE.filter((p) => p !== heros).map((p) => [
            p,
            p === ouvreur ? "open" : "fold",
          ])
        ),
      };
    }

    case "VS_3BET": {
      // Le héros a ouvert, quelqu'un derrière relance.
      const releveur = au_hasard(apres) ?? au_hasard(avant);
      return {
        consigne: releveur
          ? `Tu as ouvert, ${releveur} 3bet.`
          : "Tu as ouvert, un joueur 3bet.",
        actes: Object.fromEntries(
          ORDRE_PAROLE.filter((p) => p !== heros).map((p) => [
            p,
            p === releveur ? "3bet" : "fold",
          ])
        ),
        herosAOuvert: true,
      };
    }

    case "SHOVE":
      return {
        consigne: "Tapis court, personne n'est entré.",
        actes: Object.fromEntries(avant.map((p) => [p, "fold"])),
      };

    case "CALL_SHOVE": {
      const pousseur = au_hasard(avant);
      return {
        consigne: pousseur
          ? `${pousseur} fait tapis.`
          : "Personne ne peut faire tapis avant toi depuis cette position.",
        actes: Object.fromEntries(
          ORDRE_PAROLE.filter((p) => p !== heros).map((p) => [
            p,
            p === pousseur ? "shove" : "fold",
          ])
        ),
      };
    }

    default:
      return { consigne: "", actes: {} };
  }
}

/**
 * Jeu en quadrichromie : chaque couleur a la sienne, et la carte entière la
 * porte. Deux cartes blanches à pips noirs se confondent d'un coup d'œil ;
 * une verte et une bleue, jamais. Les teintes sont celles de la charte,
 * assombries pour qu'un rang blanc s'y lise.
 */
const COULEURS = [
  { cle: "s", symbole: "♠", face: "#1f8a5f" },
  { cle: "h", symbole: "♥", face: "#c23a52" },
  { cle: "d", symbole: "♦", face: "#1f6fb2" },
  { cle: "c", symbole: "♣", face: "#9a6b1c" },
];

/**
 * Deux cartes à partir d'un code de main (« AKs », « AKo », « AA »).
 *
 * Les couleurs sont choisies à partir du code lui-même et non au hasard :
 * la même main doit montrer les mêmes cartes d'un rendu à l'autre, sinon
 * elles clignotent à chaque re-rendu de React.
 */
export function cartesDe(main) {
  if (typeof main !== "string" || main.length < 2) return [];

  const [haute, basse] = [main[0], main[1]];
  const assorti = main.endsWith("s");

  // Graine stable : somme des codes de caractères du libellé.
  const graine = [...main].reduce((somme, c) => somme + c.charCodeAt(0), 0);
  const i = graine % COULEURS.length;
  const premiere = COULEURS[i];
  // Dépareillée : le décalage vaut 1, 2 ou 3, jamais 0 — les deux couleurs
  // ne peuvent donc pas tomber sur la même.
  const seconde = assorti
    ? premiere
    : COULEURS[(i + 1 + (graine % 3)) % COULEURS.length];

  return [
    { rang: haute, ...premiere },
    { rang: basse, ...seconde },
  ];
}

/** Blindes postées, en grosses blindes. */
export const BLINDES = { SB: 0.5, BB: 1 };

/** Tailles de mise habituelles, en grosses blindes. */
const MISES = { open: 2.2, "3bet": 7.5 };

export function miseDe(acte, tapis) {
  if (acte === "shove") return tapis;
  return MISES[acte] ?? 0;
}

/**
 * Pot avant que le héros ne parle.
 *
 * Une table sans pot ne dit pas ce qu'on joue : la décision dépend de ce
 * qu'il y a à gagner et de ce qu'il faut payer. La blinde déjà postée est
 * retranchée de la mise, sinon elle serait comptée deux fois.
 */
export function potDe(scene, tapis, heros) {
  let pot = BLINDES.SB + BLINDES.BB;

  for (const [position, acte] of Object.entries(scene?.actes ?? {})) {
    const mise = miseDe(acte, tapis);
    if (mise > 0) pot += mise - (BLINDES[position] ?? 0);
  }

  // Dans un spot « face au 3bet », le héros a ouvert avant d'être relancé.
  if (scene?.herosAOuvert) {
    pot += MISES.open - (BLINDES[heros] ?? 0);
  }

  return Math.round(pot * 10) / 10;
}

/** Montant en grosses blindes, au format français : « 2,2 bb ». */
export function formatBb(montant) {
  const arrondi = Math.round(montant * 10) / 10;
  return `${String(arrondi).replace(".", ",")} bb`;
}
