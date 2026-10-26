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

/**
 * Place les sièges autour d'une ellipse, le héros toujours en bas.
 *
 * Le héros en bas est la seule disposition qu'on lit sans réfléchir : c'est
 * celle de toutes les tables, réelles comme en ligne. Les autres suivent
 * l'ordre de parole dans le sens horaire, donc le joueur à gauche du héros
 * — celui qui parle juste après lui — est à sa droite à l'écran.
 */
export function placerSieges(heros) {
  const depart = ORDRE_PAROLE.indexOf(heros);
  if (depart === -1) return [];

  const total = ORDRE_PAROLE.length;
  return ORDRE_PAROLE.map((position, i) => {
    // Décalage du siège par rapport au héros, dans l'ordre de parole.
    const rang = (i - depart + total) % total;
    // Le héros (rang 0) est à 90°, ramené en bas par le signe du sinus :
    // en CSS l'axe vertical descend. Les suivants tournent vers la droite.
    const angle = 90 - (rang * 360) / total;
    const radians = (angle * Math.PI) / 180;
    return {
      position,
      rang,
      heros: rang === 0,
      // Coordonnées en pourcentage du conteneur, ellipse plus large que haute.
      x: 50 + 42 * Math.cos(radians),
      y: 50 + 34 * Math.sin(radians),
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

const COULEURS = [
  { cle: "s", symbole: "♠", noire: true },
  { cle: "h", symbole: "♥", noire: false },
  { cle: "d", symbole: "♦", noire: false },
  { cle: "c", symbole: "♣", noire: true },
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
