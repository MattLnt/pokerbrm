// Calculs de l'agenda — fonctions pures, indépendantes de Prisma.
//
// Un créneau est un segment d'une journée : un type, une minute de début, une
// minute de fin. Les minutes comptent depuis minuit du jour du créneau, et la
// fin peut dépasser 1440 — un grind terminé à 2 h appartient à la soirée qui
// l'a commencé, pas au lendemain matin. C'est ce qui permet de lire une
// journée de jeu d'un seul coup d'œil au lieu de la couper en deux.
//
// Le jour, lui, est manipulé partout comme une chaîne « AAAA-MM-JJ ». Aucune
// arithmétique sur des `Date` locales : un décalage de trente jours qui
// traverse un changement d'heure sauterait une journée.

import { AGENDA_JOURS, PLAN_KINDS } from "./constants.js";

export const MINUTES_JOUR = 1440;

const pad = (n) => String(n).padStart(2, "0");

/** Le jour d'aujourd'hui, en heure locale, au format « AAAA-MM-JJ ». */
export function jourLocal(ref = new Date()) {
  const d = new Date(ref);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Le jour d'une colonne `@db.Date`, relu en UTC.
 *
 * Prisma rend une colonne `DATE` à minuit UTC. La lire avec les accesseurs
 * locaux la ferait basculer d'un jour à l'ouest de Greenwich.
 */
export function jourStocke(valeur) {
  if (typeof valeur === "string") return valeur.slice(0, 10);
  const d = new Date(valeur);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** La `Date` à écrire en base pour un jour « AAAA-MM-JJ ». */
export function dateStockee(jour) {
  return new Date(`${jour}T00:00:00.000Z`);
}

export function jourValide(jour) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(jour ?? ""))) return false;
  return jourStocke(dateStockee(jour)) === jour;
}

/** Le jour décalé de `pas` jours. Calculé en UTC, insensible à l'heure d'été. */
export function jourDecale(jour, pas) {
  const d = dateStockee(jour);
  d.setUTCDate(d.getUTCDate() + pas);
  return jourStocke(d);
}

/** Nombre de jours de `depuis` à `jusqu` — négatif si `jusqu` est avant. */
export function ecartJours(depuis, jusqu) {
  return Math.round(
    (dateStockee(jusqu).getTime() - dateStockee(depuis).getTime()) / 86400000
  );
}

/** Les jours de la fenêtre glissante, du départ inclus aux suivants. */
export function fenetre(depart = jourLocal(), jours = AGENDA_JOURS) {
  return Array.from({ length: jours }, (_, i) => jourDecale(depart, i));
}

/** Le lundi de la semaine d'un jour. */
export function lundiDe(jour) {
  const d = dateStockee(jour);
  // getUTCDay() rend 0 pour dimanche ; on veut 6, pour que lundi vaille 0.
  const decalage = (d.getUTCDay() + 6) % 7;
  return jourDecale(jour, -decalage);
}

/** Vrai le samedi et le dimanche. */
export function estWeekend(jour) {
  const n = dateStockee(jour).getUTCDay();
  return n === 0 || n === 6;
}

/* ------------------------------------------------------------------ */
/* Heures                                                              */
/* ------------------------------------------------------------------ */

/**
 * Minutes depuis minuit, lues d'une saisie libre : « 21:30 », « 21h30 »,
 * « 21 h 30 », « 2130 », « 21 ». `null` si ce n'est pas une heure.
 *
 * Saisie libre et non une liste d'heures rondes : un grind commence à 18 h 45
 * aussi bien qu'à 19 h, et une liste au quart d'heure ne sait pas écrire les
 * minutes qu'on croise vraiment.
 */
export function minutesDepuisTexte(v) {
  const brut = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s/g, "");
  if (!brut) return null;

  let heures;
  let minutes;

  const separe = brut.match(/^(\d{1,2})[:h.,](\d{0,2})$/);
  const collee = brut.match(/^(\d{1,2})(\d{2})$/);
  const seule = brut.match(/^(\d{1,2})h?$/);

  if (separe) {
    heures = Number(separe[1]);
    minutes = Number(separe[2] || 0);
  } else if (collee) {
    heures = Number(collee[1]);
    minutes = Number(collee[2]);
  } else if (seule) {
    heures = Number(seule[1]);
    minutes = 0;
  } else {
    return null;
  }

  // 24:00 est accepté : c'est la fin de journée, et « minuit » comme heure de
  // fin ne veut pas dire la même chose que 00:00 comme heure de début.
  if (heures > 24 || minutes > 59) return null;
  const total = heures * 60 + minutes;
  return total > MINUTES_JOUR ? null : total;
}

/** « 21:30 ». Les minutes au-delà de 24 h retombent sur l'heure du matin. */
export function texteDepuisMinutes(m) {
  const n = Math.round(Number(m ?? 0));
  const dans = ((n % MINUTES_JOUR) + MINUTES_JOUR) % MINUTES_JOUR;
  // 24 h pile reste « 24:00 » plutôt que « 00:00 » : sur une heure de fin,
  // les deux ne se lisent pas pareil.
  if (n > 0 && dans === 0) return "24:00";
  return `${pad(Math.floor(dans / 60))}:${pad(dans % 60)}`;
}

/**
 * La fin ramenée après le début. Une fin plus petite que le début veut dire
 * « le lendemain » : 21 h → 2 h fait 1260 → 1560, pas une durée négative.
 */
export function normaliserFin(debut, fin) {
  return fin <= debut ? fin + MINUTES_JOUR : fin;
}

export function duree(bloc) {
  return Math.max(0, bloc.endMinute - bloc.startMinute);
}

/** « 21:00 → 02:00 ». */
export function libelleCreneau(bloc) {
  return `${texteDepuisMinutes(bloc.startMinute)} → ${texteDepuisMinutes(bloc.endMinute)}`;
}

/**
 * « jeu. 29 » — le libellé d'une ligne de la grille.
 *
 * Sans le mois : il tient dans la colonne de gauche sur un téléphone, et
 * c'est l'en-tête de semaine qui porte le mois.
 */
export function libelleJourGrille(jour) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateStockee(jour));
}

/** « lundi 3 novembre 2026 » */
export function libelleJourLong(jour) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateStockee(jour));
}

/** « 3 nov. » */
export function libelleJourCourt(jour) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(dateStockee(jour));
}

/* ------------------------------------------------------------------ */
/* Axe des heures                                                      */
/* ------------------------------------------------------------------ */

const AMPLITUDE_MINIMALE = 8 * 60;
const AXE_PAR_DEFAUT = { debut: 9 * 60, fin: 25 * 60 };

/**
 * Les bornes de l'axe horizontal, déduites des créneaux de la fenêtre.
 *
 * Un axe figé de 0 h à 24 h gaspillerait la moitié de la largeur sur des
 * heures où rien n'arrive jamais, et écraserait les créneaux du soir sur le
 * dernier tiers. L'axe se cale donc sur ce qui est planifié, arrondi à
 * l'heure, avec huit heures d'amplitude au minimum — sans quoi deux créneaux
 * d'une heure feraient deux barres longues comme la journée.
 */
export function bornesAxe(blocs = []) {
  if (blocs.length === 0) return { ...AXE_PAR_DEFAUT };

  const debut = Math.floor(Math.min(...blocs.map((b) => b.startMinute)) / 60) * 60;
  let fin = Math.ceil(Math.max(...blocs.map((b) => b.endMinute)) / 60) * 60;

  if (fin - debut < AMPLITUDE_MINIMALE) {
    fin = debut + AMPLITUDE_MINIMALE;
  }
  return { debut, fin };
}

/** Le pas des graduations : cinq à huit repères, jamais plus. */
export function pasAxe({ debut, fin }) {
  const amplitude = fin - debut;
  if (amplitude <= 8 * 60) return 60;
  if (amplitude <= 14 * 60) return 120;
  if (amplitude <= 21 * 60) return 180;
  return 240;
}

/**
 * Les graduations de l'axe, alignées sur le pas. La borne de droite est
 * exclue : son étiquette déborderait de la piste.
 */
export function graduations(axe) {
  const pas = pasAxe(axe);
  const reperes = [];
  for (let m = Math.ceil(axe.debut / pas) * pas; m < axe.fin; m += pas) {
    reperes.push(m);
  }
  return reperes;
}

/** La place d'un créneau sur l'axe, en pourcentages. */
export function position(bloc, axe) {
  const amplitude = Math.max(1, axe.fin - axe.debut);
  const depart = Math.max(axe.debut, bloc.startMinute);
  const arrivee = Math.min(axe.fin, bloc.endMinute);
  return {
    gauche: ((depart - axe.debut) / amplitude) * 100,
    largeur: (Math.max(0, arrivee - depart) / amplitude) * 100,
  };
}

/* ------------------------------------------------------------------ */
/* Fenêtre                                                             */
/* ------------------------------------------------------------------ */

export function chevauchent(a, b) {
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

const ordreBlocs = (a, b) =>
  a.startMinute - b.startMinute || a.endMinute - b.endMinute;

function totaux(blocs) {
  const par = Object.fromEntries(PLAN_KINDS.map((k) => [k.key, 0]));
  for (const b of blocs) {
    if (par[b.kind] === undefined) continue;
    par[b.kind] += duree(b);
  }
  return par;
}

/**
 * La fenêtre, jour par jour, chaque jour avec ses créneaux.
 *
 * Un jour vide garde sa ligne : c'est elle qu'on tape pour y poser quelque
 * chose, et une semaine trouée se voit mieux quand les trous sont dessinés.
 */
export function construireFenetre({
  blocs = [],
  depart = jourLocal(),
  jours = AGENDA_JOURS,
} = {}) {
  const parJour = new Map();
  for (const b of blocs) {
    const cle = b.jour ?? jourStocke(b.date);
    if (!parJour.has(cle)) parJour.set(cle, []);
    parJour.get(cle).push(b);
  }

  return fenetre(depart, jours).map((jour) => {
    const duJour = (parJour.get(jour) ?? []).slice().sort(ordreBlocs);
    // Deux créneaux qui se chevauchent sont presque toujours une erreur de
    // saisie : on ne grind pas et n'étudie pas à la même heure.
    const conflit = duJour.some((a, i) =>
      duJour.slice(i + 1).some((b) => chevauchent(a, b))
    );

    return {
      jour,
      blocs: duJour,
      parType: totaux(duJour),
      total: duJour.reduce((s, b) => s + duree(b), 0),
      conflit,
      aujourdhui: jour === depart,
      weekend: estWeekend(jour),
    };
  });
}

/** La fenêtre regroupée par semaine, lundi en tête. */
export function parSemaine(jours = []) {
  const semaines = [];
  for (const j of jours) {
    const lundi = lundiDe(j.jour);
    let courante = semaines.at(-1);
    if (!courante || courante.lundi !== lundi) {
      courante = { lundi, jours: [] };
      semaines.push(courante);
    }
    courante.jours.push(j);
  }

  return semaines.map((s) => {
    const blocs = s.jours.flatMap((j) => j.blocs);
    return {
      ...s,
      parType: totaux(blocs),
      total: blocs.reduce((somme, b) => somme + duree(b), 0),
    };
  });
}

/**
 * Les chiffres de l'en-tête : combien d'heures de quoi sur la fenêtre.
 *
 * La moyenne est donnée par semaine et non par jour : c'est à la semaine
 * qu'on se juge sur un volume de jeu ou d'étude, et « 2 h 10 par jour » ne
 * dit rien de la façon dont c'est posé.
 */
export function resumeAgenda(jours = []) {
  const blocs = jours.flatMap((j) => j.blocs);
  const semaines = Math.max(1, jours.length / 7);

  const parType = totaux(blocs);
  const moyennes = Object.fromEntries(
    Object.entries(parType).map(([k, v]) => [k, Math.round(v / semaines)])
  );

  return {
    parType,
    moyennes,
    total: blocs.reduce((s, b) => s + duree(b), 0),
    joursPlanifies: jours.filter((j) => j.blocs.length > 0).length,
    jours: jours.length,
    conflits: jours.filter((j) => j.conflit).length,
  };
}

/**
 * Les heures de chaque type telles qu'elles sont déjà posées dans la fenêtre,
 * au plus proche. Servent à préremplir le formulaire.
 *
 * C'est la seule valeur par défaut qui ne soit pas inventée : des heures
 * rondes choisies d'avance ne correspondraient à aucune de ses journées, et
 * il faudrait les corriger à chaque saisie. Sans précédent, pas de défaut.
 */
export function habitudes(jours = []) {
  const par = {};
  for (const j of jours) {
    for (const b of j.blocs) {
      if (par[b.kind]) continue;
      par[b.kind] = {
        start: texteDepuisMinutes(b.startMinute),
        end: texteDepuisMinutes(b.endMinute),
      };
    }
  }
  return par;
}
