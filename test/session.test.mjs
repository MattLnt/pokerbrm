import { test } from "node:test";
import assert from "node:assert/strict";

import {
  totauxSession,
  coutInscription,
  grouperParHeure,
  libelleTranche,
  libelleHeure,
} from "../lib/session.js";

test("engagé compte aussi les tournois encore en cours", () => {
  // L'argent sort à l'inscription, pas à la sortie du tournoi.
  const t = totauxSession([
    { format: "KO", totalCost: 10, prize: 0, bountiesWon: 0, inProgress: true },
    { format: "KO", totalCost: 10, prize: 25, bountiesWon: 5, inProgress: false },
  ]);
  assert.equal(t.engage, 20);
  assert.equal(t.recupere, 30, "seuls les tournois terminés rapportent");
  assert.equal(t.net, 10);
  assert.equal(t.enCours, 1);
  assert.equal(t.termines, 1);
});

test("une session sans tournoi ne divise pas par zéro", () => {
  const t = totauxSession([]);
  assert.equal(t.engage, 0);
  assert.equal(t.roi, 0);
  assert.equal(t.itm, 0);
});

test("l'ITM ne porte que sur les tournois terminés", () => {
  const t = totauxSession([
    { format: "KO", totalCost: 10, prize: 40, bountiesWon: 0, inProgress: false },
    { format: "KO", totalCost: 10, prize: 0, bountiesWon: 0, inProgress: false },
    { format: "KO", totalCost: 10, prize: 0, bountiesWon: 0, inProgress: true },
  ]);
  assert.equal(t.itm, 50, "1 sur 2 terminés, le troisième ne compte pas");
});

test("le ROI de session ignore les Spins, l'engagé non", () => {
  const t = totauxSession([
    { format: "CLASSIC", totalCost: 10, prize: 0, bountiesWon: 0, inProgress: false },
    { format: "SPIN", totalCost: 20, prize: 0, bountiesWon: 0, inProgress: false },
  ]);
  assert.equal(t.engage, 30, "le Spin a bien coûté 20 €");
  assert.equal(t.net, -30);
  // ROI rapporté au seul engagement MTT : −30 / 10
  assert.equal(t.roi, -300);
});

test("une prime KO sans place payée n'est pas un ITM", () => {
  const t = totauxSession([
    { format: "KO", totalCost: 10, prize: 0, bountiesWon: 5, inProgress: false },
  ]);
  assert.equal(t.itm, 0);
  assert.equal(t.recupere, 5);
});

test("le coût d'inscription inclut la prime et les re-entries", () => {
  assert.equal(coutInscription({ buyIn: 3, fee: 0.5, bounty: 1.5 }), 5);
  assert.equal(coutInscription({ buyIn: 3, fee: 0.5, bounty: 1.5 }, 2), 15);
});

test("la grille est classée par heure de début, dans l'ordre", () => {
  const tranches = grouperParHeure([
    { name: "soir", usualHour: 20, position: 0 },
    { name: "matin", usualHour: 9, position: 1 },
    { name: "aprem", usualHour: 15, position: 2 },
  ]);
  assert.deepEqual(
    tranches.map((t) => t.heure),
    [9, 15, 20]
  );
  assert.deepEqual(
    tranches.map((t) => t.tournois[0].name),
    ["matin", "aprem", "soir"]
  );
});

test("dans une tranche, la minute passe devant l'ordre de la grille", () => {
  const [tranche] = grouperParHeure([
    { name: "et quart", usualHour: 19, usualMinute: 15, position: 0 },
    { name: "pile", usualHour: 19, usualMinute: 0, position: 2 },
    { name: "et demie", usualHour: 19, usualMinute: 30, position: 1 },
  ]);
  assert.deepEqual(
    tranche.tournois.map((t) => t.name),
    ["pile", "et quart", "et demie"]
  );
});

test("une minute absente vaut l'heure pile", () => {
  const [tranche] = grouperParHeure([
    { name: "et demie", usualHour: 19, usualMinute: 30, position: 0 },
    { name: "sans minute", usualHour: 19, position: 1 },
  ]);
  assert.deepEqual(
    tranche.tournois.map((t) => t.name),
    ["sans minute", "et demie"]
  );
});

test("l'heure de lancement ne s'écrit avec sa minute que s'il y en a une", () => {
  assert.equal(libelleHeure(19, 0), "19 h");
  assert.equal(libelleHeure(19, null), "19 h", "pas de minute : heure pile");
  assert.equal(libelleHeure(19, 30), "19 h 30");
  assert.equal(libelleHeure(9, 5), "9 h 05", "la minute est sur deux chiffres");
  assert.equal(libelleHeure(0, 15), "0 h 15");
  assert.equal(libelleHeure(null, 30), null, "sans heure, rien à écrire");
});

test("les tournois d'une même heure forment une seule tranche", () => {
  const tranches = grouperParHeure([
    { name: "a", usualHour: 19, position: 1 },
    { name: "b", usualHour: 19, position: 0 },
    { name: "c", usualHour: 21, position: 2 },
  ]);
  assert.equal(tranches.length, 2);
  // À heure égale, l'ordre de la grille départage.
  assert.deepEqual(
    tranches[0].tournois.map((t) => t.name),
    ["b", "a"]
  );
});

test("les tournois sans heure ferment la marche", () => {
  const tranches = grouperParHeure([
    { name: "inconnu", usualHour: null, position: 0 },
    { name: "minuit", usualHour: 0, position: 1 },
    { name: "soir", usualHour: 22, position: 2 },
  ]);
  assert.deepEqual(
    tranches.map((t) => t.heure),
    [0, 22, null]
  );
});

test("minuit est une heure comme une autre, pas une absence d'heure", () => {
  // 0 est falsy : le confondre avec null mettrait les tournois de minuit
  // à la fin au lieu du début.
  const tranches = grouperParHeure([{ name: "minuit", usualHour: 0 }]);
  assert.equal(tranches[0].heure, 0);
  assert.equal(libelleTranche(0), "0 h");
  assert.equal(libelleTranche(null), "Sans heure");
});

test("une grille vide ne produit aucune tranche", () => {
  assert.deepEqual(grouperParHeure([]), []);
});
