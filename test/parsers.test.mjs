import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { parseFiles } from "../lib/parsers/index.js";
import * as winamax from "../lib/parsers/winamax.js";
import * as betclic from "../lib/parsers/betclic.js";
import * as pokerstars from "../lib/parsers/pokerstars.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (p) => readFileSync(join(here, "fixtures", p), "utf8");

const WINAMAX = fixture("winamax/sample.txt");
const BETCLIC = fixture("betclic/sample.txt");

const parWinamax = Object.fromEntries(
  winamax.parse(WINAMAX).map((t) => [t.tournamentId, t])
);
const parBetclic = Object.fromEntries(
  betclic.parse(BETCLIC).map((t) => [t.tournamentId, t])
);

/* ------------------------------------------------------------------ */
/* Winamax — fixtures calquées sur le format réel des résumés          */
/* ------------------------------------------------------------------ */

test("winamax : un tournoi présent deux fois ne compte qu'une fois", () => {
  // Le fichier contient un bloc « Late Registration » et le bloc final.
  const tous = winamax.parse(WINAMAX);
  const ids = tous.map((t) => t.tournamentId);
  assert.equal(new Set(ids).size, ids.length, "aucun doublon");
  assert.equal(tous.length, 6);
});

test("winamax : Mystery et Space KO ne sont pas rangés en KO générique", () => {
  assert.equal(parWinamax["1099000002"].format, "MYSTERY");
  assert.equal(parWinamax["1099000003"].format, "SPACE_KO");
  // Celui-ci ne porte ni Mystery ni Space dans son nom : il reste KO.
  assert.equal(parWinamax["1100183164"].format, "KO");
});

test("winamax : la durée de niveau est lue dans la ligne Levels", () => {
  // 420 s sur la majorité des niveaux → 7 min. Le premier niveau, rallongé
  // par l'inscription tardive, ne doit pas fausser la lecture.
  assert.equal(parWinamax["1099000002"].levelMinutes, 7);
  assert.equal(parWinamax["1099000003"].levelMinutes, 3);
});

test("winamax : pas de ligne Levels, pas de durée inventée", () => {
  assert.equal(parWinamax["1042567871"].levelMinutes, null);
});

test("winamax : c'est le bloc final qui gagne, pas la late registration", () => {
  const t = parWinamax["1100183164"];
  assert.equal(t.finishPosition, 1, "1re place, et non 1328e");
  assert.equal(t.entrants, 2163, "effectif final, et non 1406");
  assert.equal(t.prize, 1260.7);
  assert.equal(t.bountiesWon, 504.84);
  assert.equal(t.totalCost, 10); // 4 + 5 + 1
  assert.equal(t.netResult, 1755.54);
});

test("winamax : « You won Bounty 3€ » n'est pas un gain de prize pool", () => {
  const t = parWinamax["1052493766"];
  assert.equal(t.prize, 0, "aucun gain de prize pool");
  assert.equal(t.bountiesWon, 3);
  assert.equal(t.netResult, -7); // 3 − 10
});

test("winamax : un tournoi sans ligne de gain est une perte sèche", () => {
  const t = parWinamax["1042567871"];
  assert.equal(t.prize, 0);
  assert.equal(t.bountiesWon, 0);
  assert.equal(t.netResult, -10);
  assert.equal(t.format, "CLASSIC");
  assert.equal(t.speed, "SEMITURBO");
});

test("winamax : le buy-in d'un KO se lit buy-in + prime + rake", () => {
  const t = parWinamax["1100183164"];
  assert.equal(t.buyIn, 4);
  assert.equal(t.bounty, 5);
  assert.equal(t.fee, 1);
  assert.equal(t.format, "KO");
});

test("winamax : un ticket gagné n'entre pas dans le résultat net", () => {
  const t = parWinamax["1099000001"];
  assert.equal(t.prize, 5);
  assert.equal(t.bountiesWon, 1);
  assert.equal(t.ticketWon, 20, "le ticket est suivi à part");
  assert.equal(t.totalCost, 5);
  assert.equal(t.netResult, 1, "5 + 1 − 5, sans le ticket");
});

test("winamax : l'Expresso est un Spin, pas un KO", () => {
  assert.equal(parWinamax["1099000001"].format, "SPIN");
});

test("winamax : la séquence \\u20ac est rendue en euro", () => {
  assert.equal(parWinamax["1099000001"].name, "EXPRESSO 5 €");
});

/* ------------------------------------------------------------------ */
/* Betclic — l'export est main par main, pas tournoi par tournoi       */
/* ------------------------------------------------------------------ */

test("betclic : les mains d'un même Game ID forment un seul tournoi", () => {
  const tous = betclic.parse(BETCLIC);
  assert.equal(tous.length, 3, "2 spins + 1 KO, pour 5 mains");
});

test("betclic : un spin gagné se lit sur la dernière main", () => {
  const t = parBetclic["01M4HZTFQ686VQP75WAFS9TVMP"];
  assert.equal(t.finishPosition, 1);
  assert.equal(t.prize, 60);
  assert.equal(t.totalCost, 20);
  assert.equal(t.netResult, 40);
  assert.equal(t.format, "SPIN");
  assert.equal(t.speed, "HYPER");
});

test("betclic : la date du tournoi est celle de sa première main", () => {
  const t = parBetclic["01M4HZTFQ686VQP75WAFS9TVMP"];
  assert.equal(t.date.toISOString(), "2026-10-10T04:06:15.000Z");
});

test("betclic : les primes du héros s'additionnent, pas celles des autres", () => {
  const t = parBetclic["01M4EZB900VXS2NTHRE1QECQX4"];
  // Le héros encaisse 1,25 € ; un adversaire en encaisse 3,12 € sur lui.
  assert.equal(t.bountiesWon, 1.25);
  assert.equal(t.finishPosition, 145);
  assert.equal(t.netResult, -3.75); // 1,25 − 5
  assert.equal(t.format, "KO");
});

test("betclic : un pseudo à espaces est lu correctement", () => {
  // Le héros s'appelle « jo DUPONT » : découper sur l'espace casserait tout.
  const t = parBetclic["01M4EEFBFPAG4H7GRECG5GHMB3"];
  assert.equal(t.finishPosition, 2);
  assert.equal(t.prize, 0, "le gain de 40 € est celui de l'adversaire");
  assert.equal(t.netResult, -10);
});

test("betclic : l'ordinal irrégulier « 221th » est accepté", () => {
  assert.equal(parBetclic["01M4EZB900VXS2NTHRE1QECQX4"].finishPosition, 145);
});

test("betclic : le nombre d'inscrits est absent de l'export", () => {
  for (const t of betclic.parse(BETCLIC)) assert.equal(t.entrants, null);
});

/* ------------------------------------------------------------------ */
/* PokerStars — site inactif, parser conservé                          */
/* ------------------------------------------------------------------ */

test("pokerstars : tournoi classique perdu", () => {
  const [t] = pokerstars.parse(fixture("pokerstars/sample.txt"));
  assert.equal(t.tournamentId, "3078018023");
  assert.equal(t.entrants, 2345);
  assert.equal(t.netResult, -22);
});

/* ------------------------------------------------------------------ */
/* Routage et déduplication du lot                                     */
/* ------------------------------------------------------------------ */

test("parseFiles : chaque fichier part vers le bon parser", () => {
  const report = parseFiles([
    { name: "wina.txt", content: WINAMAX },
    { name: "betclic.txt", content: BETCLIC },
    { name: "bizarre.txt", content: "contenu quelconque" },
  ]);

  const w = report.bySite.find((s) => s.site === "winamax");
  const b = report.bySite.find((s) => s.site === "betclic");
  assert.equal(w.newCount, 6);
  assert.equal(b.newCount, 3);
  assert.equal(b.needsSpec, false, "le format Betclic est maintenant codé");
  assert.equal(report.tournaments.length, 9);
  assert.ok(report.unrecognized.some((u) => u.name === "bizarre.txt"));
});

test("parseFiles : le même fichier deux fois ne double pas les tournois", () => {
  const report = parseFiles([
    { name: "a.txt", content: WINAMAX },
    { name: "copie.txt", content: WINAMAX },
  ]);
  const w = report.bySite.find((s) => s.site === "winamax");
  assert.equal(w.newCount, 6);
  assert.equal(w.duplicateCount, 6);
  assert.equal(report.tournaments.length, 6);
});

test("les tournois sortent du plus récent au plus ancien", () => {
  const report = parseFiles([
    { name: "wina.txt", content: WINAMAX },
    { name: "betclic.txt", content: BETCLIC },
  ]);
  const dates = report.tournaments.map((t) => t.date.getTime());
  assert.deepEqual(dates, [...dates].sort((a, b) => b - a));
});
