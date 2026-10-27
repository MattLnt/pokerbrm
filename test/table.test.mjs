import { test } from "node:test";
import assert from "node:assert/strict";

import {
  placerSieges,
  scenario,
  cartesDe,
  ORDRE_PAROLE,
} from "../lib/table.js";

test("sièges : le héros est en bas, les suivants tournent vers la gauche", () => {
  const sieges = placerSieges("BTN");
  const heros = sieges.find((s) => s.heros);
  assert.equal(heros.position, "BTN");
  assert.equal(Math.round(heros.x), 50);
  // Plus bas que le centre : en CSS l'axe vertical descend.
  assert.ok(heros.y > 50, `héros à y=${heros.y}`);

  // L'action va vers la gauche de chacun : vu de dessus, le joueur qui
  // parle juste après le héros est du côté gauche de l'écran.
  const suivant = sieges.find((s) => s.rang === 1);
  assert.equal(suivant.position, "SB");
  assert.ok(suivant.x < 50, `SB à x=${suivant.x}`);

  // Et celui qui parle juste avant lui est du côté droit.
  const precedent = sieges.find((s) => s.rang === sieges.length - 1);
  assert.equal(precedent.position, "CO");
  assert.ok(precedent.x > 50, `CO à x=${precedent.x}`);

  assert.equal(sieges.length, ORDRE_PAROLE.length);
  assert.equal(new Set(sieges.map((s) => s.rang)).size, ORDRE_PAROLE.length);
});

test("sièges : une position inconnue ne place rien", () => {
  assert.deepEqual(placerSieges("INCONNUE"), []);
});

test("scène : en RFI tout le monde s'est couché devant", () => {
  const { actes } = scenario("RFI", "CO");
  assert.deepEqual(Object.values(actes), ["fold", "fold"]);
  assert.equal(actes.BTN, undefined, "les joueurs après le héros n'ont pas parlé");
});

test("scène : l'ouvreur est toujours avant le héros", () => {
  for (let i = 0; i < 50; i += 1) {
    const { actes } = scenario("DEF_VS_OPEN", "BB");
    const ouvreur = Object.entries(actes).find(([, a]) => a === "open")?.[0];
    assert.ok(ouvreur, "il faut un ouvreur");
    assert.ok(
      ORDRE_PAROLE.indexOf(ouvreur) < ORDRE_PAROLE.indexOf("BB"),
      `${ouvreur} parle après BB`
    );
  }
});

test("scène : depuis le lojack personne ne peut avoir ouvert avant", () => {
  const { actes, consigne } = scenario("DEF_VS_OPEN", "LJ");
  assert.ok(!Object.values(actes).includes("open"));
  assert.match(consigne, /Personne ne peut ouvrir/);
});

test("scène : face à un 3bet, le relanceur parle après le héros", () => {
  const { actes, herosAOuvert } = scenario("VS_3BET", "CO");
  assert.equal(herosAOuvert, true);
  const releveur = Object.entries(actes).find(([, a]) => a === "3bet")?.[0];
  assert.ok(
    ORDRE_PAROLE.indexOf(releveur) > ORDRE_PAROLE.indexOf("CO"),
    `${releveur} parle avant CO`
  );
});

test("cartes : assorties partagent la couleur, dépareillées non", () => {
  const assortie = cartesDe("AKs");
  assert.equal(assortie[0].cle, assortie[1].cle);
  assert.deepEqual(
    assortie.map((c) => c.rang),
    ["A", "K"]
  );

  for (const main of ["AKo", "QJo", "T9o", "72o"]) {
    const [a, b] = cartesDe(main);
    assert.notEqual(a.cle, b.cle, main);
  }

  // Une paire ne peut pas tenir deux fois la même carte.
  for (const main of ["AA", "KK", "22"]) {
    const [a, b] = cartesDe(main);
    assert.notEqual(a.cle, b.cle, main);
  }
});

test("cartes : la même main rend toujours les mêmes couleurs", () => {
  assert.deepEqual(cartesDe("AKs"), cartesDe("AKs"));
  assert.deepEqual(cartesDe("72o"), cartesDe("72o"));
  assert.deepEqual(cartesDe(""), []);
});
