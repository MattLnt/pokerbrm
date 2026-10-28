import { test } from "node:test";
import assert from "node:assert/strict";

import {
  mouvementsDuCompte,
  soldeCompte,
  mouvementsDuMois,
  resumeMois,
  ventilation,
  courbeDuMois,
  bornesMois,
  moisDecale,
  moisValide,
  libelleMois,
} from "../lib/compte.js";

/** Un jour du mois affiché, à midi — hors de portée des décalages de fuseau. */
const leJour = (mois, jour) => {
  const [a, m] = mois.split("-").map(Number);
  return new Date(a, m - 1, jour, 12);
};

const MOIS = "2026-06";

test("miroir : seuls les dépôts et retraits poker traversent le compte", () => {
  const mouvements = mouvementsDuCompte({
    transactions: [
      { id: "a", type: "WITHDRAWAL", amount: 500, date: leJour(MOIS, 10), siteName: "Winamax" },
      { id: "b", type: "DEPOSIT", amount: 200, date: leJour(MOIS, 12), siteName: "Betclic" },
      { id: "c", type: "RAKEBACK", amount: 96, date: leJour(MOIS, 13), siteName: "Winamax" },
      { id: "d", type: "TRANSFER_OUT", amount: 300, date: leJour(MOIS, 14), siteName: "Winamax" },
    ],
  });

  assert.equal(mouvements.length, 2, "rakeback et transfert restent dans la bankroll");

  const retrait = mouvements.find((m) => m.id === "poker:a");
  assert.equal(retrait.montant, 500, "un retrait entre sur le compte");
  assert.equal(retrait.label, "Retrait Winamax");
  assert.equal(retrait.origine, "poker");

  const depot = mouvements.find((m) => m.id === "poker:b");
  assert.equal(depot.montant, -200, "un dépôt sort du compte");
  assert.equal(depot.category, "depot_poker");
});

test("miroir : un projet payé donne une entrée, les autres non", () => {
  const mouvements = mouvementsDuCompte({
    projects: [
      { id: "p1", name: "Refonte", client: "Atelier", amount: 3200, billing: "PAYE", paidAt: leJour(MOIS, 8) },
      { id: "p2", name: "Boutique", amount: 5400, billing: "FACTURE", paidAt: null },
      // Marqué payé mais sans date : on ne sait pas sur quel mois le poser.
      { id: "p3", name: "Landing", amount: 900, billing: "PAYE", paidAt: null },
    ],
  });

  assert.deepEqual(
    mouvements.map((m) => m.id),
    ["projet:p1"]
  );
  assert.equal(mouvements[0].montant, 3200);
  assert.equal(mouvements[0].label, "Refonte · Atelier");
});

test("dépense saisie en positif : elle compte en négatif", () => {
  const [m] = mouvementsDuCompte({
    entries: [
      { id: "e1", date: leJour(MOIS, 3), label: "Loyer", amount: 780, flow: "EXPENSE", category: "loyer" },
    ],
  });
  assert.equal(m.montant, -780);
});

test("solde : les mouvements antérieurs au relevé de départ sont ignorés", () => {
  const mouvements = mouvementsDuCompte({
    entries: [
      { id: "vieux", date: leJour("2026-01", 15), label: "Courses", amount: 100, flow: "EXPENSE", category: "courses" },
      { id: "recent", date: leJour(MOIS, 15), label: "Courses", amount: 50, flow: "EXPENSE", category: "courses" },
    ],
  });

  assert.equal(
    soldeCompte({ mouvements, ouverture: 2000, ouvertureAt: leJour("2026-03", 1) }),
    1950,
    "seule la dépense postérieure au relevé bouge le solde"
  );
  assert.equal(
    soldeCompte({ mouvements, ouverture: 2000, ouvertureAt: null }),
    1850,
    "sans date de relevé, tout compte"
  );
});

test("résumé du mois : entrées et dépenses positives, net signé", () => {
  const mouvements = mouvementsDuCompte({
    entries: [
      { id: "e1", date: leJour(MOIS, 2), label: "Virement", amount: 1200, flow: "INCOME", category: "freelance" },
      { id: "e2", date: leJour(MOIS, 5), label: "Loyer", amount: 780, flow: "EXPENSE", category: "loyer" },
      { id: "e3", date: leJour(MOIS, 9), label: "Courses", amount: 120, flow: "EXPENSE", category: "courses" },
      // Hors mois : ne doit rien peser.
      { id: "e4", date: leJour("2026-07", 1), label: "Loyer", amount: 780, flow: "EXPENSE", category: "loyer" },
    ],
  });

  const r = resumeMois(mouvementsDuMois(mouvements, MOIS));
  assert.equal(r.count, 3);
  assert.equal(r.entrees, 1200);
  assert.equal(r.depenses, 900);
  assert.equal(r.net, 300);
});

test("ventilation : regroupée par catégorie, la plus grosse d'abord", () => {
  const mouvements = mouvementsDuCompte({
    entries: [
      { id: "e1", date: leJour(MOIS, 2), label: "Courses", amount: 100, flow: "EXPENSE", category: "courses" },
      { id: "e2", date: leJour(MOIS, 6), label: "Courses", amount: 200, flow: "EXPENSE", category: "courses" },
      { id: "e3", date: leJour(MOIS, 7), label: "Loyer", amount: 700, flow: "EXPENSE", category: "loyer" },
      { id: "e4", date: leJour(MOIS, 8), label: "Virement", amount: 500, flow: "INCOME", category: "freelance" },
    ],
  });

  const lignes = ventilation(mouvementsDuMois(mouvements, MOIS), "EXPENSE");
  assert.deepEqual(
    lignes.map((l) => [l.category, l.total, l.count]),
    [
      ["loyer", 700, 1],
      ["courses", 300, 2],
    ]
  );
  assert.equal(lignes[0].part, 70, "la part est calculée sur le total du sens");
  assert.equal(
    ventilation(mouvementsDuMois(mouvements, MOIS), "INCOME").length,
    1,
    "les entrées ne se mélangent pas aux dépenses"
  );
});

test("courbe : elle part du solde de début de mois et finit sur le solde actuel", () => {
  const mois = "2026-06";
  const mouvements = mouvementsDuCompte({
    entries: [
      { id: "e1", date: leJour(mois, 5), label: "Loyer", amount: 500, flow: "EXPENSE", category: "loyer" },
      { id: "e2", date: leJour(mois, 20), label: "Virement", amount: 300, flow: "INCOME", category: "freelance" },
    ],
  });

  const courbe = courbeDuMois({ mouvements, solde: 1800, mois });
  // 30 jours de juin, plus le point de départ.
  assert.equal(courbe.length, 31);
  assert.equal(courbe[0], 2000, "1800 − (−500 + 300)");
  assert.equal(courbe.at(-1), 1800, "la courbe aboutit sur le solde connu");
  assert.equal(courbe[5], 1500, "le loyer du 5 a été retiré");
});

test("bornes de mois : locales, du 1er au 1er suivant", () => {
  const { debut, fin } = bornesMois("2026-02");
  assert.equal(debut.getFullYear(), 2026);
  assert.equal(debut.getMonth(), 1);
  assert.equal(debut.getDate(), 1);
  assert.equal(fin.getMonth(), 2, "la borne haute est le 1er mars");
});

test("navigation : le mois décalé franchit l'année", () => {
  assert.equal(moisDecale("2026-01", -1), "2025-12");
  assert.equal(moisDecale("2026-12", 1), "2027-01");
});

test("un mois mal formé est refusé", () => {
  assert.equal(moisValide("2026-06"), true);
  assert.equal(moisValide("2026-13"), false);
  assert.equal(moisValide("juin"), false);
  assert.equal(moisValide(undefined), false);
});

test("libellé de mois : le mois en clair et toujours l'année", () => {
  assert.equal(libelleMois("2026-08"), "août 2026");
});
