import { test } from "node:test";
import assert from "node:assert/strict";

import { totauxSession, coutInscription, trierGrille } from "../lib/session.js";

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

test("la grille remonte les tournois dont l'heure approche", () => {
  const modeles = [
    { name: "matin", usualHour: 10, position: 0 },
    { name: "soir", usualHour: 20, position: 1 },
    { name: "sans heure", usualHour: null, position: 2 },
  ];
  const a20h = trierGrille(modeles, new Date("2026-10-25T20:00:00Z"));
  assert.equal(a20h[0].name, "soir");
  assert.equal(a20h.at(-1).name, "sans heure");
});

test("l'heure est cyclique : 23 h est proche de 1 h", () => {
  const modeles = [
    { name: "midi", usualHour: 12, position: 0 },
    { name: "minuit", usualHour: 1, position: 1 },
  ];
  const a23h = trierGrille(modeles, new Date("2026-10-25T23:00:00Z"));
  assert.equal(a23h[0].name, "minuit", "2 h d'écart, pas 22");
});

test("à heure égale, la grille garde son ordre", () => {
  const modeles = [
    { name: "b", usualHour: 20, position: 1 },
    { name: "a", usualHour: 20, position: 0 },
  ];
  const t = trierGrille(modeles, new Date("2026-10-25T20:00:00Z"));
  assert.deepEqual(t.map((m) => m.name), ["a", "b"]);
});
