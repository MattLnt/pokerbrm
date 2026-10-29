import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MINUTES_JOUR,
  jourStocke,
  dateStockee,
  jourValide,
  jourDecale,
  ecartJours,
  fenetre,
  lundiDe,
  estWeekend,
  minutesDepuisTexte,
  texteDepuisMinutes,
  normaliserFin,
  duree,
  libelleCreneau,
  bornesAxe,
  graduations,
  position,
  chevauchent,
  construireFenetre,
  parSemaine,
  resumeAgenda,
  habitudes,
} from "../lib/agenda.js";

const bloc = (jour, kind, debut, fin, over = {}) => ({
  id: `${jour}-${kind}-${debut}`,
  jour,
  kind,
  startMinute: debut,
  endMinute: normaliserFin(debut, fin),
  projectId: null,
  note: null,
  ...over,
});

const h = (heures, minutes = 0) => heures * 60 + minutes;

/* ---- Jours ---------------------------------------------------------- */

test("un jour stocké se relit à l'identique, quel que soit le fuseau", () => {
  assert.equal(jourStocke(dateStockee("2026-11-03")), "2026-11-03");
  // Prisma rend une colonne DATE à minuit UTC ; une lecture locale à l'ouest
  // de Greenwich la ferait basculer sur la veille.
  assert.equal(jourStocke(new Date("2026-11-03T00:00:00.000Z")), "2026-11-03");
  assert.equal(jourStocke("2026-11-03T00:00:00.000Z"), "2026-11-03");
});

test("un jour mal formé ou impossible est refusé", () => {
  assert.equal(jourValide("2026-11-03"), true);
  assert.equal(jourValide("2026-02-30"), false, "le 30 février n'existe pas");
  assert.equal(jourValide("03/11/2026"), false);
  assert.equal(jourValide(null), false);
});

test("le décalage de jours traverse le changement d'heure sans sauter de jour", () => {
  // Dernier dimanche d'octobre 2026 : l'heure d'hiver arrive dans la nuit.
  assert.equal(jourDecale("2026-10-24", 1), "2026-10-25");
  assert.equal(jourDecale("2026-10-25", 1), "2026-10-26");
  assert.equal(jourDecale("2026-03-28", 2), "2026-03-30");
  assert.equal(jourDecale("2027-01-01", -1), "2026-12-31");
  assert.equal(ecartJours("2026-10-01", "2026-10-31"), 30);
  assert.equal(ecartJours("2026-10-31", "2026-10-01"), -30);
});

test("la fenêtre fait trente jours, le départ compris", () => {
  const jours = fenetre("2026-10-29");
  assert.equal(jours.length, 30);
  assert.equal(jours[0], "2026-10-29");
  assert.equal(jours.at(-1), "2026-11-27");
  assert.equal(new Set(jours).size, 30, "pas de doublon");
});

test("le lundi d'une semaine, et le week-end", () => {
  // 2026-11-03 est un mardi.
  assert.equal(lundiDe("2026-11-03"), "2026-11-02");
  assert.equal(lundiDe("2026-11-02"), "2026-11-02");
  assert.equal(lundiDe("2026-11-08"), "2026-11-02", "le dimanche clôt la semaine");
  assert.equal(estWeekend("2026-11-07"), true);
  assert.equal(estWeekend("2026-11-08"), true);
  assert.equal(estWeekend("2026-11-09"), false);
});

/* ---- Heures --------------------------------------------------------- */

test("l'heure se saisit librement, pas dans une liste", () => {
  for (const saisie of ["21:30", "21h30", "21 h 30", "2130", "21.30", "21,30"]) {
    assert.equal(minutesDepuisTexte(saisie), h(21, 30), saisie);
  }
  assert.equal(minutesDepuisTexte("9"), h(9));
  assert.equal(minutesDepuisTexte("9h"), h(9));
  assert.equal(minutesDepuisTexte("09:05"), h(9, 5));
  assert.equal(minutesDepuisTexte("0:00"), 0);
  assert.equal(minutesDepuisTexte("24:00"), MINUTES_JOUR, "la fin de journée");
});

test("une heure impossible n'est pas lue", () => {
  for (const saisie of ["", null, "25:00", "12:75", "abc", "12:3:4", "-1"]) {
    assert.equal(minutesDepuisTexte(saisie), null, String(saisie));
  }
});

test("les minutes se réécrivent en heure lisible", () => {
  assert.equal(texteDepuisMinutes(h(21, 30)), "21:30");
  assert.equal(texteDepuisMinutes(0), "00:00");
  assert.equal(texteDepuisMinutes(MINUTES_JOUR), "24:00", "une fin, pas un début");
  assert.equal(texteDepuisMinutes(h(26)), "02:00", "le lendemain matin");
});

test("une fin avant le début veut dire le lendemain", () => {
  assert.equal(normaliserFin(h(21), h(2)), h(26));
  assert.equal(normaliserFin(h(14), h(18)), h(18));
  assert.equal(
    normaliserFin(h(21), h(21)),
    h(45),
    "une fin égale au début est repoussée, pas annulée"
  );

  const grind = bloc("2026-11-03", "GRIND", h(21), h(2));
  assert.equal(duree(grind), h(5));
  assert.equal(libelleCreneau(grind), "21:00 → 02:00");
});

/* ---- Axe ------------------------------------------------------------ */

test("l'axe se cale sur ce qui est planifié, arrondi à l'heure", () => {
  const axe = bornesAxe([
    bloc("2026-11-03", "ETUDE", h(14, 30), h(16)),
    bloc("2026-11-03", "GRIND", h(19), h(1, 15)),
  ]);
  assert.equal(axe.debut, h(14), "arrondi vers le bas");
  assert.equal(axe.fin, h(26), "arrondi vers le haut, au-delà de minuit");
});

test("l'axe garde huit heures d'amplitude au minimum", () => {
  const axe = bornesAxe([bloc("2026-11-03", "ETUDE", h(14), h(15))]);
  assert.equal(axe.fin - axe.debut, h(8));
});

test("une fenêtre vide garde un axe par défaut", () => {
  const axe = bornesAxe([]);
  assert.ok(axe.fin > axe.debut);
  assert.equal(axe.fin - axe.debut, h(16));
});

test("les graduations restent dans la piste", () => {
  const axe = { debut: h(14), fin: h(26) };
  const reperes = graduations(axe);
  assert.ok(reperes.length >= 4 && reperes.length <= 8, `${reperes.length} repères`);
  assert.ok(reperes.every((m) => m >= axe.debut && m < axe.fin));
  assert.equal(reperes[0] % 60, 0, "alignées sur l'heure");
});

test("un créneau se place en pourcentages de l'axe", () => {
  const axe = { debut: h(12), fin: h(24) };
  const p = position(bloc("2026-11-03", "GRIND", h(18), h(21)), axe);
  assert.equal(p.gauche, 50);
  assert.equal(p.largeur, 25);

  // Un créneau qui dépasse l'axe est rogné, pas débordé.
  const tard = position(bloc("2026-11-03", "GRIND", h(22), h(2)), axe);
  assert.equal(Math.round(tard.gauche + tard.largeur), 100);
});

/* ---- Fenêtre -------------------------------------------------------- */

test("deux créneaux se chevauchent dès qu'ils partagent une minute", () => {
  const a = bloc("2026-11-03", "GRIND", h(19), h(23));
  assert.equal(chevauchent(a, bloc("2026-11-03", "ETUDE", h(22), h(23, 30))), true);
  assert.equal(
    chevauchent(a, bloc("2026-11-03", "ETUDE", h(23), h(24))),
    false,
    "bout à bout n'est pas un chevauchement"
  );
  assert.equal(chevauchent(a, bloc("2026-11-03", "ETUDE", h(14), h(16))), false);
});

test("la fenêtre range les créneaux par jour et par heure", () => {
  const jours = construireFenetre({
    depart: "2026-11-03",
    jours: 3,
    blocs: [
      bloc("2026-11-04", "GRIND", h(19), h(1)),
      bloc("2026-11-03", "GRIND", h(19), h(23)),
      bloc("2026-11-03", "ETUDE", h(14), h(16)),
      // Hors fenêtre : ignoré, sans erreur.
      bloc("2026-12-25", "ETUDE", h(10), h(11)),
    ],
  });

  assert.equal(jours.length, 3);
  assert.equal(jours[0].jour, "2026-11-03");
  assert.equal(jours[0].aujourdhui, true);
  assert.deepEqual(
    jours[0].blocs.map((b) => b.startMinute),
    [h(14), h(19)],
    "triés par heure de début"
  );
  assert.equal(jours[0].total, h(6));
  assert.equal(jours[0].parType.GRIND, h(4));
  assert.equal(jours[0].parType.ETUDE, h(2));
  assert.equal(jours[0].parType.PROJET, 0);
  assert.equal(jours[2].blocs.length, 0, "un jour vide garde sa ligne");
  assert.equal(jours[2].total, 0);
});

test("un créneau posé sur un autre est signalé", () => {
  const [jour] = construireFenetre({
    depart: "2026-11-03",
    jours: 1,
    blocs: [
      bloc("2026-11-03", "GRIND", h(19), h(23)),
      bloc("2026-11-03", "ETUDE", h(22), h(23)),
    ],
  });
  assert.equal(jour.conflit, true);

  const [calme] = construireFenetre({
    depart: "2026-11-03",
    jours: 1,
    blocs: [
      bloc("2026-11-03", "ETUDE", h(14), h(16)),
      bloc("2026-11-03", "GRIND", h(19), h(23)),
    ],
  });
  assert.equal(calme.conflit, false);
});

test("un créneau lu de la base porte une date, pas une chaîne de jour", () => {
  const [jour] = construireFenetre({
    depart: "2026-11-03",
    jours: 1,
    blocs: [
      {
        id: "a",
        date: new Date("2026-11-03T00:00:00.000Z"),
        kind: "GRIND",
        startMinute: h(19),
        endMinute: h(23),
      },
    ],
  });
  assert.equal(jour.blocs.length, 1);
});

test("les semaines commencent le lundi, même quand la fenêtre démarre en plein milieu", () => {
  // 2026-11-05 est un jeudi : la première semaine ne compte que quatre jours.
  const semaines = parSemaine(
    construireFenetre({
      depart: "2026-11-05",
      jours: 14,
      blocs: [
        bloc("2026-11-05", "GRIND", h(19), h(23)),
        bloc("2026-11-10", "ETUDE", h(14), h(16)),
      ],
    })
  );

  assert.equal(semaines[0].lundi, "2026-11-02");
  assert.equal(semaines[0].jours.length, 4, "du jeudi au dimanche");
  assert.equal(semaines[0].parType.GRIND, h(4));
  assert.equal(semaines[1].jours.length, 7);
  assert.equal(semaines[1].parType.ETUDE, h(2));
  assert.equal(
    semaines.reduce((s, x) => s + x.jours.length, 0),
    14,
    "aucun jour perdu dans le regroupement"
  );
});

test("le résumé compte les heures par type et la moyenne par semaine", () => {
  const jours = construireFenetre({
    depart: "2026-11-02",
    jours: 28,
    blocs: [
      bloc("2026-11-02", "GRIND", h(19), h(0)),
      bloc("2026-11-03", "GRIND", h(19), h(0)),
      bloc("2026-11-03", "ETUDE", h(14), h(15, 30)),
      bloc("2026-11-04", "PROJET", h(9), h(12)),
    ],
  });

  const r = resumeAgenda(jours);
  assert.equal(r.parType.GRIND, h(10));
  assert.equal(r.parType.ETUDE, h(1, 30));
  assert.equal(r.parType.PROJET, h(3));
  assert.equal(r.total, h(14, 30));
  assert.equal(r.joursPlanifies, 3);
  assert.equal(r.jours, 28);
  assert.equal(r.conflits, 0);
  // 28 jours = 4 semaines : 10 h de grind font 2 h 30 par semaine.
  assert.equal(r.moyennes.GRIND, h(2, 30));
});

test("les heures habituelles viennent du créneau le plus proche, par type", () => {
  const jours = construireFenetre({
    depart: "2026-11-03",
    jours: 5,
    blocs: [
      bloc("2026-11-03", "GRIND", h(19), h(1, 30)),
      bloc("2026-11-04", "GRIND", h(20), h(23)),
      bloc("2026-11-05", "ETUDE", h(14, 30), h(16)),
    ],
  });

  const par = habitudes(jours);
  assert.deepEqual(par.GRIND, { start: "19:00", end: "01:30" }, "le plus proche");
  assert.deepEqual(par.ETUDE, { start: "14:30", end: "16:00" });
  assert.equal(par.PROJET, undefined, "sans précédent, pas de défaut inventé");
});
