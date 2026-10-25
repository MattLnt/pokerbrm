import { test } from "node:test";
import assert from "node:assert/strict";

import { review, pickHand, gradeAnswer } from "../lib/spaced.js";

test("échec : la main revient immédiatement et l'aisance baisse", () => {
  const next = review({ easiness: 2.5, repetition: 4, interval: 20 }, false);
  assert.equal(next.repetition, 0);
  assert.equal(next.interval, 0);
  assert.equal(next.easiness, 2.3);
  assert.ok(next.dueAt.getTime() <= Date.now() + 1000);
});

test("échec répété : l'aisance ne descend pas sous 1,3", () => {
  let state = { easiness: 1.4, repetition: 0, interval: 0 };
  for (let i = 0; i < 5; i += 1) state = review(state, false);
  assert.equal(state.easiness, 1.3);
});

test("réussites : les intervalles s'allongent 1 → 3 → ×aisance", () => {
  let state = review(null, true);
  assert.equal(state.interval, 1);

  state = review(state, true);
  assert.equal(state.interval, 3);

  state = review(state, true);
  assert.equal(state.interval, Math.round(3 * state.easiness));
  assert.equal(state.repetition, 3);
});

test("l'aisance est plafonnée à 3", () => {
  let state = { easiness: 2.9, repetition: 5, interval: 30 };
  for (let i = 0; i < 5; i += 1) state = review(state, true);
  assert.equal(state.easiness, 3);
});

test("tirage : sans main due, on pioche dans le pool", () => {
  const hand = pickHand(["AA", "KK"], [], () => 0);
  assert.equal(hand, "AA");
});

test("tirage : une main due sort en priorité", () => {
  // random() < 0.6 → branche « due »
  const hand = pickHand(["AA", "KK", "QQ"], ["72o"], () => 0.1);
  assert.equal(hand, "72o");
  // random() >= 0.6 → branche « pool »
  const autre = pickHand(["AA", "KK", "QQ"], ["72o"], () => 0.9);
  assert.notEqual(autre, "72o");
});

test("tirage : pool vide renvoie null", () => {
  assert.equal(pickHand([], ["AA"]), null);
});

test("correction : toute action de fréquence non nulle est acceptée", () => {
  const cells = { AKs: { raise: 60, call: 40 } };
  assert.equal(gradeAnswer(cells, "AKs", "raise").correct, true);
  assert.equal(gradeAnswer(cells, "AKs", "call").correct, true);
  assert.equal(gradeAnswer(cells, "AKs", "fold").correct, false);
  assert.deepEqual(gradeAnswer(cells, "AKs", "raise").expected, {
    raise: 60,
    call: 40,
  });
});

test("correction : hors range, la bonne réponse est fold", () => {
  const r = gradeAnswer({ AA: { raise: 100 } }, "72o", "fold");
  assert.equal(r.correct, true);
  assert.deepEqual(r.expected, { fold: 100 });

  assert.equal(gradeAnswer({ AA: { raise: 100 } }, "72o", "raise").correct, false);
});
