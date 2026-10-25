import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeSiteBalance,
  computePeriodResults,
  computeBuyInLimits,
  checkBuyInCompliance,
  computeLevelProgress,
  buildBankrollCurve,
} from "../lib/bankroll.js";

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

test("solde : les retraits sont soustraits même saisis en positif", () => {
  const balance = computeSiteBalance({
    tournaments: [{ netResult: 336 }, { netResult: -22 }],
    transactions: [
      { type: "DEPOSIT", amount: 1000 },
      { type: "WITHDRAWAL", amount: 200 },
      { type: "RAKEBACK", amount: 50 },
    ],
  });
  assert.equal(balance, 1164); // 1000 − 200 + 50 + 336 − 22
});

test("résultats : le hors-jeu est séparé du profit de jeu", () => {
  const tournaments = [
    { playedAt: daysAgo(2), netResult: 336, totalCost: 50, prize: 386, bountiesWon: 0 },
    { playedAt: daysAgo(5), netResult: -22, totalCost: 22, prize: 0, bountiesWon: 0 },
    { playedAt: daysAgo(99), netResult: 500, totalCost: 50, prize: 550, bountiesWon: 0 },
  ];
  const transactions = [
    { date: daysAgo(3), type: "RAKEBACK", amount: 185 },
    { date: daysAgo(3), type: "DEPOSIT", amount: 1000 },
  ];

  const r = computePeriodResults({ tournaments, transactions, days: 30 });
  assert.equal(r.tournamentCount, 2, "le tournoi à 99 j est hors période");
  assert.equal(r.gameProfit, 314);
  assert.equal(r.offGame, 185, "le dépôt n'est pas un revenu hors jeu");
  assert.equal(r.variation, 499);
  assert.equal(r.itm, 50);
  assert.equal(r.abi, 36);
  assert.equal(r.roi, round(314 / 72 * 100));
});

const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

test("résultats : période vide ne divise pas par zéro", () => {
  const r = computePeriodResults({ tournaments: [], transactions: [], days: 7 });
  assert.equal(r.roi, 0);
  assert.equal(r.itm, 0);
  assert.equal(r.abi, 0);
});

test("buy-in max : bankroll / nombre de caves, arrondi au plancher", () => {
  const limits = computeBuyInLimits(8420);
  assert.deepEqual(
    limits.map((l) => [l.format, l.maxBuyIn]),
    [["CLASSIC", 42], ["KO", 56], ["SPIN", 84]]
  );
});

test("buy-in max : les règles personnalisées priment", () => {
  const limits = computeBuyInLimits(10000, [
    { format: "CLASSIC", buyInsRequired: 100 },
  ]);
  assert.equal(limits.find((l) => l.format === "CLASSIC").maxBuyIn, 100);
  assert.equal(limits.find((l) => l.format === "KO").maxBuyIn, 66);
});

test("conformité : un tournoi récent au-dessus de la limite déclenche l'alerte", () => {
  const limits = computeBuyInLimits(8420);
  const ok = checkBuyInCompliance(
    [{ playedAt: daysAgo(1), format: "CLASSIC", buyIn: 20, fee: 2, bounty: 0 }],
    limits
  );
  assert.equal(ok.compliant, true);

  const ko = checkBuyInCompliance(
    [{ playedAt: daysAgo(1), format: "CLASSIC", buyIn: 100, fee: 10, bounty: 0 }],
    limits
  );
  assert.equal(ko.compliant, false);
  assert.equal(ko.offenders.length, 1);

  const vieux = checkBuyInCompliance(
    [{ playedAt: daysAgo(90), format: "CLASSIC", buyIn: 100, fee: 10, bounty: 0 }],
    limits
  );
  assert.equal(vieux.compliant, true, "hors fenêtre de 30 jours");
});

test("paliers : palier courant, suivant et seuil de descente", () => {
  const levels = [
    { targetAbi: 25, bankrollRequired: 5000, stopLoss: 3500 },
    { targetAbi: 50, bankrollRequired: 10000, stopLoss: 6500 },
    { targetAbi: 100, bankrollRequired: 20000, stopLoss: 13000 },
  ];
  const p = computeLevelProgress(8420, levels);
  assert.equal(Number(p.current.targetAbi), 25);
  assert.equal(Number(p.next.targetAbi), 50);
  assert.equal(p.required, 10000);
  // Le seuil de descente est celui du palier joué actuellement, pas du suivant.
  assert.equal(p.stopLoss, 3500);
});

test("paliers : au-dessus du dernier palier, il n'y a plus de suivant", () => {
  const p = computeLevelProgress(50000, [
    { targetAbi: 50, bankrollRequired: 10000, stopLoss: 6500 },
  ]);
  assert.equal(p.next, null);
  assert.equal(p.required, null);
});

test("courbe : elle se termine sur la bankroll actuelle", () => {
  const curve = buildBankrollCurve({
    currentBankroll: 8420,
    tournaments: [
      { playedAt: daysAgo(10), netResult: 300 },
      { playedAt: daysAgo(2), netResult: -100 },
    ],
    transactions: [{ date: daysAgo(5), type: "RAKEBACK", amount: 185 }],
    days: 30,
  });
  assert.equal(curve.at(-1), 8420);
  assert.equal(curve[0], 8420 - (300 - 100 + 185));
  assert.equal(curve.length, 4);
});

test("ITM : une prime KO sans place payée ne compte pas", () => {
  const r = computePeriodResults({
    tournaments: [
      // Éliminé avant la bulle, mais a ramassé deux primes.
      { playedAt: daysAgo(1), netResult: -10, totalCost: 30, prize: 0, bountiesWon: 20 },
      // Place payée.
      { playedAt: daysAgo(1), netResult: 70, totalCost: 30, prize: 100, bountiesWon: 0 },
    ],
    transactions: [],
    days: 30,
  });
  assert.equal(r.itm, 50, "1 ITM sur 2, pas 2 sur 2");
});
