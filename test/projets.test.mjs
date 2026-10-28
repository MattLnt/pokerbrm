import { test } from "node:test";
import assert from "node:assert/strict";

import { resumeProjets, relanceDue, estVivier, parEtat } from "../lib/projets.js";

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

const projet = (over) => ({
  id: Math.random().toString(36).slice(2),
  name: "Projet",
  amount: 1000,
  stage: "EN_COURS",
  billing: "A_FACTURER",
  devisAt: null,
  paidAt: null,
  ...over,
});

test("à encaisser : ce qui est à facturer plus ce qui est facturé", () => {
  const r = resumeProjets([
    projet({ amount: 3200, stage: "EN_COURS", billing: "A_FACTURER" }),
    projet({ amount: 5400, stage: "EN_COURS", billing: "FACTURE" }),
    projet({ amount: 900, stage: "TERMINE", billing: "PAYE" }),
  ]);

  assert.equal(r.aFacturer.total, 3200);
  assert.equal(r.facture.total, 5400);
  assert.equal(r.aEncaisser, 8600, "les deux moitiés, l'argent n'est pas arrivé");
  assert.equal(r.encaisse, 900);
  assert.equal(r.enCoursCount, 2);
  assert.equal(r.enCoursTotal, 8600);
});

test("le vivier ne compte pas dans la facturation", () => {
  const r = resumeProjets([
    projet({ amount: 7500, stage: "DEVIS_ENVOYE", devisAt: daysAgo(3) }),
    projet({ amount: 4200, stage: "IDEE" }),
    projet({ amount: 1000, stage: "EN_COURS", billing: "A_FACTURER" }),
  ]);

  assert.equal(r.aEncaisser, 1000, "un devis n'est pas une facture");
  assert.equal(r.vivier.total, 11700);
  assert.equal(r.vivier.devisEnvoyes, 1);
});

test("un devis refusé sort des perspectives", () => {
  const r = resumeProjets([
    projet({ amount: 7500, stage: "DEVIS_REFUSE", devisAt: daysAgo(60) }),
  ]);
  assert.equal(r.vivier.count, 0);
  assert.equal(r.vivier.total, 0);
});

test("relance : seulement un devis envoyé resté sans réponse", () => {
  assert.equal(relanceDue(projet({ stage: "DEVIS_ENVOYE", devisAt: daysAgo(30) })), 30);
  assert.equal(relanceDue(projet({ stage: "DEVIS_ENVOYE", devisAt: daysAgo(4) })), null);
  assert.equal(
    relanceDue(projet({ stage: "EN_COURS", devisAt: daysAgo(90) })),
    null,
    "un projet accepté n'attend plus de réponse"
  );
  assert.equal(relanceDue(projet({ stage: "DEVIS_ENVOYE", devisAt: null })), null);
});

test("le vivier s'arrête aux devis", () => {
  assert.equal(estVivier("IDEE"), true);
  assert.equal(estVivier("DEVIS_ENVOYE"), true);
  assert.equal(estVivier("DEVIS_REFUSE"), true);
  assert.equal(estVivier("EN_COURS"), false);
  assert.equal(estVivier("TERMINE"), false);
});

test("par état : les cinq états sont rendus, même vides", () => {
  const etats = parEtat([projet({ stage: "EN_COURS" })]);
  assert.equal(etats.length, 5);
  assert.equal(etats.find((e) => e.key === "EN_COURS").projets.length, 1);
  assert.equal(etats.find((e) => e.key === "IDEE").projets.length, 0);
});
