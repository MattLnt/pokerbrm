import { test } from "node:test";
import assert from "node:assert/strict";

import {
  spotKey,
  parseSpotKey,
  adversairesPossibles,
  actionPossible,
  adversaireValide,
} from "../lib/spots.js";
import { lireRangeTexte } from "../lib/hands.js";
import { scenario } from "../lib/table.js";

test("clé de spot : sans adversaire, la forme à trois morceaux ne bouge pas", () => {
  assert.equal(
    spotKey({ position: "BTN", action: "RFI", stackDepth: "40BB" }),
    "BTN|RFI|40BB"
  );
  assert.deepEqual(parseSpotKey("BTN|RFI|40BB"), {
    position: "BTN",
    action: "RFI",
    stackDepth: "40BB",
    vsPosition: "",
  });
});

test("clé de spot : l'adversaire fait l'aller-retour", () => {
  const spot = {
    position: "BB",
    action: "DEF_VS_OPEN",
    stackDepth: "25BB",
    vsPosition: "BTN",
  };
  assert.equal(spotKey(spot), "BB|DEF_VS_OPEN|25BB|BTN");
  assert.deepEqual(parseSpotKey(spotKey(spot)), spot);
});

test("adversaires : l'ouvreur est devant, le 3betteur derrière", () => {
  assert.deepEqual(adversairesPossibles("DEF_VS_OPEN", "BB"), [
    "LJ",
    "HJ",
    "CO",
    "BTN",
    "SB",
  ]);
  assert.deepEqual(adversairesPossibles("3BET", "CO"), ["LJ", "HJ"]);
  assert.deepEqual(adversairesPossibles("VS_3BET", "BTN"), ["SB", "BB"]);
  assert.deepEqual(adversairesPossibles("RFI", "BTN"), []);
});

test("actions impossibles : personne devant le LJ, la BB n'ouvre pas", () => {
  assert.equal(actionPossible("3BET", "LJ"), false);
  assert.equal(actionPossible("DEF_VS_OPEN", "LJ"), false);
  assert.equal(actionPossible("RFI", "BB"), false);
  assert.equal(actionPossible("VS_3BET", "BB"), false);
  assert.equal(actionPossible("RFI", "LJ"), true);
  assert.equal(actionPossible("3BET", "SB"), true);
});

test("adversaire valide : vide toujours, sinon dans la liste", () => {
  assert.equal(adversaireValide("3BET", "BTN", ""), true);
  assert.equal(adversaireValide("3BET", "BTN", "CO"), true);
  assert.equal(adversaireValide("3BET", "BTN", "BB"), false);
  assert.equal(adversaireValide("RFI", "BTN", "CO"), false);
});

test("scène du trainer : l'adversaire de la range joue", () => {
  for (let i = 0; i < 20; i++) {
    const { actes } = scenario("DEF_VS_OPEN", "BB", Math.random, "CO");
    assert.equal(actes.CO, "open");
  }
});

const lire = (t) =>
  lireRangeTexte(t).mains.map(({ main, frequence }) =>
    frequence == null ? main : `${main}:${frequence}`
  );

test("texte : paires, plus et tirets", () => {
  assert.deepEqual(lire("TT+"), ["AA", "KK", "QQ", "JJ", "TT"]);
  assert.deepEqual(lire("77-99"), ["99", "88", "77"]);
  assert.deepEqual(lire("A5s-A3s"), ["A5s", "A4s", "A3s"]);
  assert.deepEqual(lire("KTo+"), ["KQo", "KJo", "KTo"]);
});

test("texte : sans suffixe, suited et offsuit", () => {
  assert.deepEqual(lire("AK"), ["AKs", "AKo"]);
});

test("texte : fréquence en pourcentage ou en proportion", () => {
  assert.deepEqual(lire("A5s:50, AKo:0.25"), ["A5s:50", "AKo:25"]);
});

test("texte : casse et séparateurs indifférents", () => {
  assert.deepEqual(lire("a2S+;kq"), [
    "AKs",
    "AQs",
    "AJs",
    "ATs",
    "A9s",
    "A8s",
    "A7s",
    "A6s",
    "A5s",
    "A4s",
    "A3s",
    "A2s",
    "KQs",
    "KQo",
  ]);
});

test("texte : les morceaux illisibles sont rendus, pas devinés", () => {
  const { mains, illisibles } = lireRangeTexte("98s, AKx, ZZ, A5s:300");
  assert.deepEqual(
    mains.map((m) => m.main),
    ["98s"]
  );
  assert.deepEqual(illisibles, ["AKx", "ZZ", "A5s:300"]);
});
