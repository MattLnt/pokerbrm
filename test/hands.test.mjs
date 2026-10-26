import { test } from "node:test";
import assert from "node:assert/strict";

import {
  handAt,
  ALL_HANDS,
  combosOf,
  rangeStats,
  cellBackground,
  couvertureCase,
  melanger,
  basculerSelection,
  basculerSelectionRapide,
  selectionPosee,
  QUICK_SELECTS,
  TOTAL_COMBOS,
} from "../lib/hands.js";
import { RANGE_BRUSHES } from "../lib/constants.js";

test("la grille place paires, suited et offsuit aux bons endroits", () => {
  assert.equal(handAt(0, 0), "AA");
  assert.equal(handAt(12, 12), "22");
  assert.equal(handAt(0, 1), "AKs", "au-dessus de la diagonale");
  assert.equal(handAt(1, 0), "AKo", "en dessous de la diagonale");
  assert.equal(handAt(3, 7), "J7s");
  assert.equal(handAt(7, 3), "J7o");
});

test("169 mains distinctes, 1326 combos au total", () => {
  assert.equal(ALL_HANDS.length, 169);
  assert.equal(new Set(ALL_HANDS).size, 169);
  const total = ALL_HANDS.reduce((s, h) => s + combosOf(h), 0);
  assert.equal(total, TOTAL_COMBOS);
});

test("combos : 6 par paire, 4 suited, 12 offsuit", () => {
  assert.equal(combosOf("AA"), 6);
  assert.equal(combosOf("AKs"), 4);
  assert.equal(combosOf("AKo"), 12);
});

test("stats : une range pleine vaut 100 %", () => {
  const cells = Object.fromEntries(
    ALL_HANDS.map((h) => [h, { raise: 100 }])
  );
  const stats = rangeStats(cells);
  assert.equal(stats.combos, TOTAL_COMBOS);
  assert.equal(stats.percent, 100);
});

test("stats : les fréquences partielles comptent au prorata", () => {
  // AA à 50 % = 3 combos, AKs à 100 % = 4 combos.
  const stats = rangeStats({ AA: { raise: 50 }, AKs: { raise: 100 } });
  assert.equal(stats.combos, 7);
  assert.equal(stats.byAction.raise.combos, 7);
});

test("stats : plusieurs actions sur une main sont ventilées", () => {
  const stats = rangeStats({ AKs: { raise: 60, call: 40 } });
  assert.equal(stats.byAction.raise.combos, 2.4);
  assert.equal(stats.byAction.call.combos, 1.6);
  assert.equal(stats.combos, 4);
});

test("stats : fold ne compte pas dans la range", () => {
  const stats = rangeStats({ AA: { fold: 100 }, KK: { raise: 100 } });
  assert.equal(stats.combos, 6);
  assert.equal(stats.byAction.fold, undefined);
});

test("fond de case : couleur pleine, partielle, puis bandes", () => {
  // Les couleurs se lisent sur les pinceaux : la charte peut changer de
  // palette sans casser ce test.
  const couleur = (key) => RANGE_BRUSHES.find((b) => b.key === key).color;

  const plein = cellBackground({ raise: 100 }, RANGE_BRUSHES);
  assert.ok(plein.includes(`${couleur("raise")} 0% 100%`));
  assert.ok(!plein.includes("transparent"));

  // Ce qui n'est pas peint laisse voir le fond de la case.
  const partiel = cellBackground({ raise: 50 }, RANGE_BRUSHES);
  assert.ok(partiel.includes(`${couleur("raise")} 0% 50%`));
  assert.ok(partiel.includes("transparent 50% 100%"));

  const mixte = cellBackground({ raise: 60, call: 40 }, RANGE_BRUSHES);
  assert.ok(mixte.includes(`${couleur("raise")} 0% 60%`));
  assert.ok(mixte.includes(`${couleur("call")} 60% 100%`));
  assert.ok(!mixte.includes("transparent"));

  // 50 raise + 30 call : les 20 restants ne sont pas peints.
  const avecFold = cellBackground({ raise: 50, call: 30 }, RANGE_BRUSHES);
  assert.ok(avecFold.includes(`${couleur("raise")} 0% 50%`));
  assert.ok(avecFold.includes(`${couleur("call")} 50% 80%`));
  assert.ok(avecFold.includes("transparent 80% 100%"));

  assert.equal(cellBackground({}, RANGE_BRUSHES), null);
  assert.equal(cellBackground({ fold: 100 }, RANGE_BRUSHES), null);
});

test("mélange : le pinceau n'efface pas les actions qui tiennent encore", () => {
  assert.deepEqual(melanger({ raise: 50 }, "call", 30), { call: 30, raise: 50 });
  assert.deepEqual(melanger(undefined, "raise", 50), { raise: 50 });
});

test("mélange : les autres actions sont rabotées pour tenir dans 100 %", () => {
  // raise seul remplissait la case : il laisse la place au call.
  assert.deepEqual(melanger({ raise: 100 }, "call", 30), {
    call: 30,
    raise: 70,
  });
  // Deux actions à raboter gardent leur équilibre relatif.
  assert.deepEqual(melanger({ raise: 60, call: 40 }, "shove", 50), {
    shove: 50,
    raise: 30,
    call: 20,
  });
});

test("mélange : repasser le même pinceau remplace sa propre fréquence", () => {
  assert.deepEqual(melanger({ raise: 50, call: 30 }, "raise", 80), {
    raise: 80,
    call: 20,
  });
});

test("mélange : un pinceau à 100 % chasse tout le reste", () => {
  assert.deepEqual(melanger({ raise: 50, call: 50 }, "shove", 100), {
    shove: 100,
  });
});

test("sélection rapide : le second appui relâche les mains", () => {
  const vide = {};
  const posee = basculerSelection(vide, ["AA", "KK"], "raise", 100);
  assert.deepEqual(posee, { AA: { raise: 100 }, KK: { raise: 100 } });

  assert.equal(selectionPosee(posee, ["AA", "KK"], "raise", 100), true);
  assert.deepEqual(basculerSelection(posee, ["AA", "KK"], "raise", 100), {});
});

test("sélection rapide : relâcher ne retire que la part du pinceau", () => {
  const depart = { AA: { raise: 50, call: 30 }, KK: { raise: 50 } };
  assert.deepEqual(basculerSelection(depart, ["AA", "KK"], "raise", 50), {
    AA: { call: 30 },
  });
});

test("sélection rapide : une seule main en trop et le bouton repose", () => {
  const partiel = { AA: { raise: 100 } };
  assert.equal(selectionPosee(partiel, ["AA", "KK"], "raise", 100), false);
  assert.deepEqual(basculerSelection(partiel, ["AA", "KK"], "raise", 100), {
    AA: { raise: 100 },
    KK: { raise: 100 },
  });
});

test("sélection rapide : relâcher un ensemble n'emporte pas celui d'à côté", () => {
  const mains = (cle) => QUICK_SELECTS.find((q) => q.key === cle).hands();
  const axs = mains("ax-s");
  const connecteurs = mains("suited-connectors");
  const communes = axs.filter((h) => connecteurs.includes(h));
  assert.ok(communes.length > 0, "les deux ensembles doivent se recouvrir");

  let cells = basculerSelectionRapide({}, "ax-s", "raise", 100);
  cells = basculerSelectionRapide(cells, "suited-connectors", "raise", 100);
  assert.equal(selectionPosee(cells, axs, "raise", 100), true);
  assert.equal(selectionPosee(cells, connecteurs, "raise", 100), true);

  // On relâche Ax suited : les connecteurs tiennent toujours debout.
  cells = basculerSelectionRapide(cells, "ax-s", "raise", 100);
  assert.equal(selectionPosee(cells, connecteurs, "raise", 100), true);
  assert.equal(selectionPosee(cells, axs, "raise", 100), false);
  // Seules les mains qui n'appartenaient qu'à Ax suited sont parties.
  for (const hand of axs.filter((h) => !connecteurs.includes(h))) {
    assert.equal(cells[hand], undefined, hand);
  }

  // Puis les connecteurs, que plus rien ne retient.
  cells = basculerSelectionRapide(cells, "suited-connectors", "raise", 100);
  assert.deepEqual(cells, {});
});

test("couverture : somme des actions, fold exclu, plafonnée à 100", () => {
  assert.equal(couvertureCase(undefined), 0);
  assert.equal(couvertureCase({ fold: 100 }), 0);
  assert.equal(couvertureCase({ raise: 50 }), 50);
  assert.equal(couvertureCase({ raise: 50, call: 30 }), 80);
  assert.equal(couvertureCase({ raise: 80, call: 80 }), 100);
});
