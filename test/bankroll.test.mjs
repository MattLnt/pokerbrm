import { test } from "node:test";
import assert from "node:assert/strict";

import {
  filtrerFormatsComptes,
  computeSiteBalance,
  computePeriodResults,
  computePalier,
  montantSigne,
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
    { playedAt: daysAgo(2), format: "KO", netResult: 336, totalCost: 50, prize: 386, bountiesWon: 0 },
    { playedAt: daysAgo(5), format: "CLASSIC", netResult: -22, totalCost: 22, prize: 0, bountiesWon: 0 },
    { playedAt: daysAgo(99), format: "CLASSIC", netResult: 500, totalCost: 50, prize: 550, bountiesWon: 0 },
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
  assert.equal(r.roi, round(314 / 72 * 100));
});

const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

test("résultats : période vide ne divise pas par zéro", () => {
  const r = computePeriodResults({ tournaments: [], transactions: [], days: 7 });
  assert.equal(r.roi, 0);
  assert.equal(r.itm, 0);
});

// Un dépôt daté, de quoi amener la bankroll à un montant donné sans jouer.
const depot = (montant, jours) => ({
  date: daysAgo(jours),
  type: "DEPOSIT",
  amount: montant,
});

const tournoi = (cout, jours, format = "CLASSIC") => ({
  playedAt: daysAgo(jours),
  format,
  buyIn: cout - 1,
  fee: 1,
  bounty: 0,
  netResult: -cout,
  totalCost: cout,
  prize: 0,
});

test("palier : le solde de départ ouvre le plafond correspondant", () => {
  const p = computePalier({ transactions: [depot(6000, 100)] });
  assert.equal(p.buyInMax, 20);
  assert.equal(p.next.buyInMax, 50);
  assert.equal(p.required, 10000);
  assert.equal(p.stopLoss, 3000);
  assert.equal(p.fallbackBuyIn, 10);
  assert.deepEqual(
    p.echelle.map((e) => [e.buyInMax, e.autorise]),
    [[5, true], [10, true], [20, true], [50, false]]
  );
});

test("palier : sans historique, on démarre au plancher", () => {
  const p = computePalier();
  assert.equal(p.buyInMax, 5);
  assert.equal(p.required, 2000);
  assert.equal(p.stopLoss, null, "les 5 € sont le plancher : pas de descente");
  assert.equal(p.fallbackBuyIn, null);
});

test("palier : un gros gain peut faire sauter plusieurs paliers d'un coup", () => {
  const p = computePalier({
    transactions: [depot(500, 100)],
    tournaments: [
      { playedAt: daysAgo(50), format: "CLASSIC", buyIn: 4, fee: 1, bounty: 0, netResult: 9600 },
    ],
  });
  assert.equal(p.buyInMax, 50, "500 € puis 10 100 € : 5 → 50 € en une main");
  assert.equal(p.next, null);
});

test("palier : entre les deux seuils, le palier dépend du chemin parcouru", () => {
  // 1 800 € en montant depuis 1 000 € : le seuil de 2 000 n'a jamais été
  // franchi, on est encore au plafond de 5 €.
  const enMontant = computePalier({
    transactions: [depot(1000, 100), depot(800, 50)],
  });
  assert.equal(enMontant.buyInMax, 5);

  // 1 800 € en descendant depuis 2 500 € : le seuil de repli (1 500) n'est
  // pas atteint, le plafond de 10 € reste ouvert.
  const enDescendant = computePalier({
    transactions: [
      depot(2500, 100),
      { date: daysAgo(50), type: "WITHDRAWAL", amount: 700 },
    ],
  });
  assert.equal(enDescendant.buyInMax, 10);
});

test("palier : sous le seuil de repli, on redescend", () => {
  const p = computePalier({
    transactions: [
      depot(11000, 100),
      { date: daysAgo(50), type: "WITHDRAWAL", amount: 3600 },
    ],
  });
  assert.equal(p.buyInMax, 20, "7 400 € : les 50 € sautent, les 20 € restent");
  assert.equal(p.required, 10000, "il faut repasser 10 000 € pour y revenir");
});

test("palier : une chute brutale fait perdre plusieurs paliers", () => {
  const p = computePalier({
    transactions: [
      depot(11000, 100),
      { date: daysAgo(50), type: "WITHDRAWAL", amount: 9900 },
    ],
  });
  assert.equal(p.buyInMax, 5, "1 100 € : retour au plancher");
});

test("conformité : un tournoi est jugé sur le palier du jour où il est joué", () => {
  const p = computePalier({
    transactions: [depot(1900, 100)],
    // Joué à 1 900 € de solde, quand le plafond était à 5 €.
    tournaments: [tournoi(20, 10)],
  });
  assert.equal(p.compliant, false);
  assert.equal(p.offenders.length, 1);
});

test("conformité : un tournoi dans les clous le reste même après une chute", () => {
  const p = computePalier({
    transactions: [
      depot(6000, 100),
      // La bankroll s'effondre après coup : le palier du jour était bien
      // celui des 20 €.
      { date: daysAgo(2), type: "WITHDRAWAL", amount: 5000 },
    ],
    tournaments: [tournoi(20, 10)],
  });
  assert.equal(p.buyInMax, 5);
  assert.equal(p.compliant, true);
});

test("conformité : les écarts hors fenêtre ne remontent plus", () => {
  const p = computePalier({
    transactions: [depot(1900, 200)],
    tournaments: [tournoi(20, 90)],
  });
  assert.equal(p.compliant, true, "hors fenêtre de 30 jours");
});

test("conformité : les Spins ne sont pas jugés, ils ne sont pas suivis", () => {
  const p = computePalier({
    transactions: [depot(1900, 100)],
    tournaments: [tournoi(20, 10, "SPIN")],
  });
  assert.equal(p.compliant, true);
});

test("conformité : la prime compte dans le prix du ticket", () => {
  const p = computePalier({
    transactions: [depot(2500, 100)],
    // Un KO à 10 € : 4 € de buy-in, 1 € de rake, 5 € de prime. Pile dans
    // les clous du palier à 10 €.
    tournaments: [
      { playedAt: daysAgo(5), format: "KO", buyIn: 4, fee: 1, bounty: 5, netResult: -10 },
    ],
  });
  assert.equal(p.compliant, true);

  const trop = computePalier({
    transactions: [depot(2500, 100)],
    tournaments: [
      { playedAt: daysAgo(5), format: "KO", buyIn: 4, fee: 1, bounty: 10, netResult: -15 },
    ],
  });
  assert.equal(trop.compliant, false, "15 € le ticket, plafond à 10 €");
});

test("transfert : la sortie est comptée en négatif, saisie en positif", () => {
  assert.equal(montantSigne({ type: "TRANSFER_OUT", amount: 500 }), -500);
  assert.equal(montantSigne({ type: "TRANSFER_IN", amount: 500 }), 500);
  assert.equal(montantSigne({ type: "WITHDRAWAL", amount: 500 }), -500);
  assert.equal(montantSigne({ type: "DEPOSIT", amount: 500 }), 500);
});

test("transfert : il vide une room et remplit l'autre, total inchangé", () => {
  const depart = computeSiteBalance({
    transactions: [
      { type: "DEPOSIT", amount: 2500 },
      { type: "TRANSFER_OUT", amount: 1000 },
    ],
  });
  const arrivee = computeSiteBalance({
    transactions: [
      { type: "DEPOSIT", amount: 1500 },
      { type: "TRANSFER_IN", amount: 1000 },
    ],
  });
  assert.equal(depart, 1500);
  assert.equal(arrivee, 2500);
  assert.equal(depart + arrivee, 4000, "la bankroll totale n'a pas bougé");
});

test("transfert : c'est la manœuvre qui fait monter une room de palier", () => {
  // 1 500 € dans chaque room : les 5 € partout, alors qu'il y a 3 000 € en
  // tout. Concentrer l'argent ouvre les 10 € dans la room d'arrivée.
  const avant = computePalier({ transactions: [depot(1500, 100)] });
  assert.equal(avant.buyInMax, 5);

  const arrivee = computePalier({
    transactions: [
      depot(1500, 100),
      { date: daysAgo(10), type: "TRANSFER_IN", amount: 1000 },
    ],
  });
  assert.equal(arrivee.buyInMax, 10, "2 500 € : les 10 € s'ouvrent");

  const depart = computePalier({
    transactions: [
      depot(1500, 100),
      { date: daysAgo(10), type: "TRANSFER_OUT", amount: 1000 },
    ],
  });
  assert.equal(depart.buyInMax, 5, "500 € : la room de départ reste aux 5 €");
});

test("transfert : vider une room la fait redescendre de palier", () => {
  const p = computePalier({
    transactions: [
      depot(4500, 100),
      { date: daysAgo(10), type: "TRANSFER_OUT", amount: 2000 },
    ],
  });
  assert.equal(p.buyInMax, 10, "2 500 € restants : les 20 € se referment");
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
      { playedAt: daysAgo(1), format: "KO", netResult: -10, totalCost: 30, prize: 0, bountiesWon: 20 },
      // Place payée.
      { playedAt: daysAgo(1), format: "KO", netResult: 70, totalCost: 30, prize: 100, bountiesWon: 0 },
    ],
    transactions: [],
    days: 30,
  });
  assert.equal(r.itm, 50, "1 ITM sur 2, pas 2 sur 2");
});

test("les Spins sont exclus des résultats : seuls les MTT sont suivis", () => {
  const tournaments = [
    { playedAt: daysAgo(1), format: "CLASSIC", netResult: -22, totalCost: 22, prize: 0, bountiesWon: 0 },
    { playedAt: daysAgo(1), format: "SPIN", netResult: 980, totalCost: 20, prize: 1000, bountiesWon: 0 },
  ];
  const r = computePeriodResults({ tournaments, transactions: [], days: 30 });
  assert.equal(r.tournamentCount, 1, "le Spin ne compte pas");
  assert.equal(r.gameProfit, -22, "sa variance n'écrase pas le profit MTT");
  assert.equal(r.itm, 0);
});

test("le filtre de formats garde les MTT classiques et les KO", () => {
  const liste = [
    { format: "CLASSIC" },
    { format: "KO" },
    { format: "SPIN" },
  ];
  assert.deepEqual(
    filtrerFormatsComptes(liste).map((t) => t.format),
    ["CLASSIC", "KO"]
  );
});

test("le solde d'un site compte TOUS les tournois, Spins inclus", () => {
  // L'argent d'un Spin sort et rentre vraiment : il doit être dans le solde,
  // même s'il n'entre pas dans les statistiques de performance.
  const balance = computeSiteBalance({
    tournaments: [
      { format: "CLASSIC", netResult: -22 },
      { format: "SPIN", netResult: 980 },
    ],
    transactions: [],
  });
  assert.equal(balance, 958);
});
