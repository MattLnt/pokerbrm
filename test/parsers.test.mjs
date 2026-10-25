import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { parseFiles } from "../lib/parsers/index.js";
import * as winamax from "../lib/parsers/winamax.js";
import * as pokerstars from "../lib/parsers/pokerstars.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (p) => readFileSync(join(here, "fixtures", p), "utf8");

test("winamax : tournoi classique", () => {
  const [t] = winamax.parse(fixture("winamax/sample.txt"));
  assert.equal(t.tournamentId, "123456789");
  assert.equal(t.name, "Monster Stack 50 €");
  assert.equal(t.buyIn, 45);
  assert.equal(t.fee, 5);
  assert.equal(t.bounty, 0);
  assert.equal(t.format, "CLASSIC");
  assert.equal(t.speed, "NORMAL");
  assert.equal(t.finishPosition, 14);
  assert.equal(t.entrants, 1234);
  assert.equal(t.totalCost, 50);
  assert.equal(t.netResult, 336); // 386 − 50
});

test("winamax : KO hyper avec re-entries et bounties", () => {
  const [, t] = winamax.parse(fixture("winamax/sample.txt"));
  assert.equal(t.tournamentId, "987654321");
  assert.equal(t.buyIn, 4);
  assert.equal(t.bounty, 5);
  assert.equal(t.fee, 1);
  assert.equal(t.reEntries, 2);
  assert.equal(t.format, "KO");
  assert.equal(t.speed, "HYPER");
  assert.equal(t.bountiesWon, 20);
  assert.equal(t.prize, 18); // 38 total − 20 de bounties
  assert.equal(t.totalCost, 30); // (4+5+1) × 3
  assert.equal(t.netResult, 8); // 18 + 20 − 30
});

test("pokerstars : tournoi classique perdu", () => {
  const [t] = pokerstars.parse(fixture("pokerstars/sample.txt"));
  assert.equal(t.tournamentId, "3078018023");
  assert.equal(t.buyIn, 20);
  assert.equal(t.fee, 2);
  assert.equal(t.entrants, 2345);
  assert.equal(t.finishPosition, 412);
  assert.equal(t.currency, "EUR");
  assert.equal(t.netResult, -22);
});

test("pokerstars : PKO avec bounty et re-entry", () => {
  const [, t] = pokerstars.parse(fixture("pokerstars/sample.txt"));
  assert.equal(t.buyIn, 13.5);
  assert.equal(t.bounty, 13.5);
  assert.equal(t.fee, 3);
  assert.equal(t.reEntries, 1);
  assert.equal(t.format, "KO");
  assert.equal(t.prize, 420);
  assert.equal(t.bountiesWon, 145);
  assert.equal(t.totalCost, 60); // 30 × 2
  assert.equal(t.netResult, 505);
});

test("parseFiles : routage, dédup et PMU à valider", () => {
  const report = parseFiles([
    { name: "wina.txt", content: fixture("winamax/sample.txt") },
    { name: "wina-copie.txt", content: fixture("winamax/sample.txt") },
    { name: "ps.txt", content: fixture("pokerstars/sample.txt") },
    { name: "pmu.txt", content: fixture("pmu/sample.txt") },
    { name: "bizarre.txt", content: "contenu quelconque" },
  ]);

  const wina = report.bySite.find((s) => s.site === "winamax");
  assert.equal(wina.newCount, 2);
  assert.equal(wina.duplicateCount, 2, "le second fichier est un doublon");
  assert.equal(wina.net, 344); // 336 + 8

  const pmu = report.bySite.find((s) => s.site === "pmu");
  assert.equal(pmu.needsSpec, true);
  assert.equal(pmu.newCount, 0);

  assert.equal(report.tournaments.length, 4);
  assert.ok(
    report.unrecognized.some((u) => u.reason === "format à valider"),
    "PMU est signalé sans bloquer les autres"
  );
  assert.ok(report.unrecognized.some((u) => u.name === "bizarre.txt"));
});

test("les tournois sortent du plus récent au plus ancien", () => {
  const report = parseFiles([
    { name: "wina.txt", content: fixture("winamax/sample.txt") },
    { name: "ps.txt", content: fixture("pokerstars/sample.txt") },
  ]);
  const dates = report.tournaments.map((t) => t.date.getTime());
  assert.deepEqual(dates, [...dates].sort((a, b) => b - a));
});
