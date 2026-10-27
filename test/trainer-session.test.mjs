import { test } from "node:test";
import assert from "node:assert/strict";

import { construireSession } from "../lib/spaced.js";
import { ALL_HANDS } from "../lib/hands.js";

const SPOTS = ["BTN|RFI|60BB_PLUS", "BB|DEF_VS_OPEN|25BB"];

/** Hasard déterministe, pour que les tests ne dépendent pas d'un tirage. */
function hasardFige(suite) {
  let i = 0;
  return () => suite[i++ % suite.length];
}

test("session : les mains dues sont toutes reprises", () => {
  const dues = [
    { spot: SPOTS[0], main: "AKs" },
    { spot: SPOTS[1], main: "72o" },
    { spot: SPOTS[0], main: "QQ" },
  ];
  const questions = construireSession({
    spots: SPOTS,
    dues,
    mains: ALL_HANDS,
    longueur: 20,
  });

  assert.equal(questions.length, 20);
  for (const due of dues) {
    assert.ok(
      questions.some((q) => q.main === due.main && q.spot === due.spot),
      `${due.main} doit revenir`
    );
  }
});

test("session : aucune main ne figure deux fois", () => {
  const dues = ALL_HANDS.slice(0, 10).map((main) => ({ spot: SPOTS[0], main }));
  const questions = construireSession({
    spots: SPOTS,
    dues,
    mains: ALL_HANDS,
    longueur: 50,
  });

  const mains = questions.map((q) => q.main);
  assert.equal(new Set(mains).size, mains.length);
});

test("session : une main due hors des spots retenus est ignorée", () => {
  const questions = construireSession({
    spots: [SPOTS[0]],
    dues: [{ spot: SPOTS[1], main: "72o" }],
    mains: ALL_HANDS,
    longueur: 5,
  });

  assert.ok(questions.every((q) => q.spot === SPOTS[0]));
  // 72o peut sortir au hasard, mais jamais rattachée au spot écarté.
  assert.ok(!questions.some((q) => q.main === "72o" && q.spot === SPOTS[1]));
});

test("session de révision : rien que les mains dues", () => {
  const dues = [
    { spot: SPOTS[0], main: "AKs" },
    { spot: SPOTS[1], main: "72o" },
  ];
  const questions = construireSession({
    spots: SPOTS,
    dues,
    mains: ALL_HANDS,
    longueur: 20,
    seulementDues: true,
  });

  assert.equal(questions.length, 2);
  assert.deepEqual(
    questions.map((q) => q.main).sort(),
    ["72o", "AKs"]
  );
});

test("session : la longueur demandée borne même les mains dues", () => {
  const dues = ALL_HANDS.slice(0, 40).map((main) => ({ spot: SPOTS[0], main }));
  const questions = construireSession({
    spots: SPOTS,
    dues,
    mains: ALL_HANDS,
    longueur: 20,
  });

  assert.equal(questions.length, 20);
  assert.ok(questions.every((q) => q.due));
});

test("session : sans spot ni longueur, rien à jouer", () => {
  assert.deepEqual(
    construireSession({ spots: [], mains: ALL_HANDS, longueur: 20 }),
    []
  );
  assert.deepEqual(
    construireSession({ spots: SPOTS, mains: ALL_HANDS, longueur: 0 }),
    []
  );
});

test("session : les mains dues ne restent pas groupées en tête", () => {
  // Avec un hasard qui ne mélange rien, les dues seraient toutes en tête ;
  // le brassage final doit au moins pouvoir les déplacer.
  const dues = ALL_HANDS.slice(0, 5).map((main) => ({ spot: SPOTS[0], main }));
  const questions = construireSession({
    spots: SPOTS,
    dues,
    mains: ALL_HANDS,
    longueur: 20,
    hasard: hasardFige([0.9, 0.1, 0.5, 0.3, 0.7]),
  });

  const positions = questions
    .map((q, i) => (q.due ? i : null))
    .filter((i) => i !== null);
  assert.equal(positions.length, 5);
  assert.ok(
    positions.some((i) => i >= 5),
    "au moins une main due doit sortir du bloc de tête"
  );
});
