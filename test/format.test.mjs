import { test } from "node:test";
import assert from "node:assert/strict";

import { plural, formatEuro, formatPercent, formatRelativeDays } from "../lib/format.js";

test("pluriel : pas de « s » au singulier ni à zéro", () => {
  assert.equal(plural(0, "tournoi"), "0 tournoi");
  assert.equal(plural(1, "tournoi"), "1 tournoi");
  assert.equal(plural(2, "tournoi"), "2 tournois");
});

test("pluriel : forme irrégulière explicite", () => {
  assert.equal(plural(1, "nouveau", "nouveaux"), "1 nouveau");
  assert.equal(plural(3, "nouveau", "nouveaux"), "3 nouveaux");
  assert.equal(plural(2, "re-entry", "re-entries"), "2 re-entries");
});

test("pluriel : les milliers restent groupés", () => {
  assert.equal(plural(1234, "tournoi"), "1\u202f234 tournois");
});

test("montants : signe moins typographique, pas un tiret", () => {
  assert.equal(formatEuro(-90), "\u2212" + "90\u202f€");
  assert.equal(formatEuro(640, { sign: true }), "+640\u202f€");
  assert.equal(formatEuro(0, { sign: true }), "+0\u202f€");
  assert.equal(formatEuro(8420), "8\u202f420\u202f€");
});

test("pourcentages : virgule décimale française", () => {
  assert.equal(formatPercent(14.2), "14,2\u202f%");
  assert.equal(formatPercent(-5.31, { sign: true }), "\u2212" + "5,3\u202f%");
});

test("dates relatives : aujourd'hui, hier, puis en jours", () => {
  const j = (n) => new Date(Date.now() - n * 86400000);
  assert.equal(formatRelativeDays(j(0)), "aujourd'hui");
  assert.equal(formatRelativeDays(j(1)), "hier");
  assert.equal(formatRelativeDays(j(9)), "il y a 9\u202fj");
  assert.equal(formatRelativeDays(null), "jamais importé");
});
