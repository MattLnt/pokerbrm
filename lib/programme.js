/**
 * Programme d'étude par défaut.
 *
 * Chaque objectif est un travail, pas une saisie. Écrire une range est de la
 * préparation : ça remplit une grille, ça ne fait pas progresser. Ce qui
 * fait progresser, c'est de driller jusqu'à un seuil, de revoir ses propres
 * mains et d'aller chercher la réponse dans sa base — trois choses que
 * l'app sait mesurer.
 *
 * Les seuils sont volontairement écrits dans le libellé : « 200 mains à
 * 90 % » se vérifie, « travailler les RFI » ne se vérifie pas.
 */
export const THEMES = [
  { title: "RFI par position et par tapis", block: "Préflop par profondeur", weekFrom: 1, weekTo: 2,
    objectives: [
      { label: "Drill RFI toutes positions : 200 mains à 90 %", done: false },
      { label: "Revoir 10 opens où tu as hésité en session", done: false },
      { label: "Relever tes 5 plus gros écarts entre ce que tu ouvres et ce que tu joues vraiment", done: false },
    ] },
  { title: "Défense BB vs open", block: "Préflop par profondeur", weekFrom: 3, weekTo: 4,
    objectives: [
      { label: "Drill défense BB : 150 mains à 85 %", done: false },
      { label: "Revoir 10 défenses BB jouées en session", done: false },
      { label: "Calculer ton seuil de cote vs un open 2,2x et vs 2,5x", done: false },
    ] },
  { title: "Stratégie SB et 3bet vs flat", block: "Préflop par profondeur", weekFrom: 3, weekTo: 4,
    objectives: [
      { label: "Drill SB : 150 mains à 85 %", done: false },
      { label: "Revoir 5 mains où tu as flat en SB plutôt que 3bet", done: false },
      { label: "Mesurer dans ta base ce que te rapportent tes flats SB sur 3 mois", done: false },
    ] },
  { title: "Push/fold et resteal sous 20bb", block: "Préflop par profondeur", weekFrom: 4, weekTo: 4,
    objectives: [
      { label: "Drill push/fold 12–20bb : 200 mains à 95 %", done: false },
      { label: "Revoir 10 shoves limites joués en session", done: false },
    ] },
  { title: "C-bet BTN/CO vs BB par texture", block: "Postflop pots simples", weekFrom: 5, weekTo: 6,
    objectives: [
      { label: "Classer 20 flops en trois familles et fixer une fréquence de c-bet par famille", done: false },
      { label: "Revoir 10 c-bets joués, en cherchant ce que la texture disait", done: false },
      { label: "Jouer une session en appliquant la grille, puis la revoir à froid", done: false },
    ] },
  { title: "Défense BB vs c-bet et jeu du turn", block: "Postflop pots simples", weekFrom: 7, weekTo: 8,
    objectives: [
      { label: "Revoir 15 mains où tu as fold le turn", done: false },
      { label: "Identifier dans ta base tes 3 situations de turn les plus coûteuses", done: false },
    ] },
  { title: "Pots 3bet et décisions rivière", block: "Pots 3bet et rivière", weekFrom: 9, weekTo: 10,
    objectives: [
      { label: "Revoir 10 pots 3bet allés jusqu'à la rivière", done: false },
      { label: "Écrire ta règle de bluff-catch rivière, puis la confronter à 5 mains jouées", done: false },
    ] },
  { title: "ICM : bulle, ITM, table finale", block: "ICM", weekFrom: 11, weekTo: 12,
    objectives: [
      { label: "Drill push/fold ICM : 150 mains à 90 %", done: false },
      { label: "Revoir 10 décisions de bulle, gagnantes comme perdantes", done: false },
      { label: "Comparer ton ROI en table finale avant et après le thème", done: false },
    ] },
];
