// Calculs du compte bancaire — fonctions pures, indépendantes de Prisma.
//
// Le compte agrège trois sources et n'en recopie aucune :
//   · les mouvements saisis à la main (`BankEntry`) ;
//   · les dépôts et retraits poker (`Transaction`), en miroir ;
//   · les projets web encaissés (`Project` payé), en miroir.
//
// Le miroir est calculé à la lecture et jamais écrit. Un retrait recopié en
// base serait une seconde vérité : corriger le montant côté bankroll
// laisserait le compte sur l'ancien, sans que rien ne le signale.

import { round2 } from "./bankroll.js";
import { CATEGORIES_COMPTE } from "./constants.js";

/** Le mois en cours, au format « AAAA-MM ». */
export function moisCourant(ref = new Date()) {
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
}

/** Vrai si la chaîne est un mois bien formé et plausible. */
export function moisValide(key) {
  if (!/^\d{4}-\d{2}$/.test(String(key ?? ""))) return false;
  const [annee, mois] = key.split("-").map(Number);
  return annee >= 2000 && annee <= 2100 && mois >= 1 && mois <= 12;
}

/**
 * Bornes locales d'un mois : du 1er à 00 h 00 au 1er du mois suivant.
 * Tout est en heure locale — passer par `new Date("2026-10-01")` le lirait en
 * UTC et ferait basculer un mouvement du 1er sur le mois précédent.
 */
export function bornesMois(key) {
  const [annee, mois] = key.split("-").map(Number);
  return {
    debut: new Date(annee, mois - 1, 1),
    fin: new Date(annee, mois, 1),
  };
}

/** Le mois d'avant / d'après, au même format. */
export function moisDecale(key, pas) {
  const [annee, mois] = key.split("-").map(Number);
  const d = new Date(annee, mois - 1 + pas, 1);
  return moisCourant(d);
}

const MOIS_LONGS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** « octobre 2026 ». L'année est toujours écrite : on navigue dans le temps. */
export function libelleMois(key) {
  const [annee, mois] = key.split("-").map(Number);
  return `${MOIS_LONGS[mois - 1]} ${annee}`;
}

const CATEGORIE_FLOW = new Map(CATEGORIES_COMPTE.map((c) => [c.key, c.flow]));

/** Montant signé d'un mouvement : une dépense retranche. */
function signe(flow, amount) {
  const n = Math.abs(Number(amount ?? 0));
  return flow === "EXPENSE" ? -n : n;
}

/**
 * Tous les mouvements du compte, les plus récents d'abord.
 *
 * `transactions` attend les mouvements de bankroll avec leur `siteName` ;
 * seuls les dépôts et les retraits concernent le compte — rakeback, bonus,
 * tickets et transferts entre rooms ne le traversent jamais.
 *
 * `projects` attend les projets ; seuls ceux marqués payés, et dont la date
 * d'encaissement est connue, donnent une entrée.
 */
export function mouvementsDuCompte({
  entries = [],
  transactions = [],
  projects = [],
} = {}) {
  const manuels = entries.map((e) => ({
    id: e.id,
    date: e.date,
    label: e.label,
    flow: e.flow,
    montant: signe(e.flow, e.amount),
    category: e.category,
    note: e.note ?? null,
    origine: "manuel",
  }));

  const poker = transactions
    .filter((tx) => tx.type === "DEPOSIT" || tx.type === "WITHDRAWAL")
    .map((tx) => {
      const retrait = tx.type === "WITHDRAWAL";
      const flow = retrait ? "INCOME" : "EXPENSE";
      return {
        // Préfixé : l'identifiant vient d'une autre table, et rien ici ne
        // doit pouvoir le confondre avec celui d'un mouvement saisi.
        id: `poker:${tx.id}`,
        date: tx.date,
        label: `${retrait ? "Retrait" : "Dépôt"} ${tx.siteName ?? ""}`.trim(),
        flow,
        montant: signe(flow, tx.amount),
        category: retrait ? "poker" : "depot_poker",
        note: tx.note ?? null,
        origine: "poker",
      };
    });

  const projets = projects
    .filter((p) => p.billing === "PAYE" && p.paidAt)
    .map((p) => ({
      id: `projet:${p.id}`,
      date: p.paidAt,
      label: p.client ? `${p.name} · ${p.client}` : p.name,
      flow: "INCOME",
      montant: signe("INCOME", p.amount),
      category: "freelance",
      note: null,
      origine: "projet",
      projectId: p.id,
    }));

  return [...manuels, ...poker, ...projets].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
}

/**
 * Solde du compte = solde d'ouverture + tout ce qui a bougé depuis.
 *
 * Sans date d'ouverture, tous les mouvements comptent. Avec une date, ceux
 * d'avant sont ignorés : ils sont déjà dans le solde d'ouverture, les compter
 * une seconde fois les doublerait.
 */
export function soldeCompte({ mouvements = [], ouverture = 0, ouvertureAt = null }) {
  const seuil = ouvertureAt ? new Date(ouvertureAt).getTime() : -Infinity;
  const delta = mouvements
    .filter((m) => new Date(m.date).getTime() >= seuil)
    .reduce((s, m) => s + m.montant, 0);
  return round2(Number(ouverture ?? 0) + delta);
}

/** Les mouvements d'un mois donné. */
export function mouvementsDuMois(mouvements, mois) {
  const { debut, fin } = bornesMois(mois);
  return mouvements.filter((m) => {
    const t = new Date(m.date).getTime();
    return t >= debut.getTime() && t < fin.getTime();
  });
}

/** Entrées, dépenses et solde du mois. Les deux premiers sont positifs. */
export function resumeMois(mouvementsMois) {
  const entrees = mouvementsMois
    .filter((m) => m.montant > 0)
    .reduce((s, m) => s + m.montant, 0);
  const depenses = mouvementsMois
    .filter((m) => m.montant < 0)
    .reduce((s, m) => s - m.montant, 0);
  return {
    entrees: round2(entrees),
    depenses: round2(depenses),
    net: round2(entrees - depenses),
    count: mouvementsMois.length,
  };
}

/**
 * Ventilation par catégorie, la plus grosse d'abord, avec la part du total.
 * `flow` vaut « EXPENSE » ou « INCOME ».
 */
export function ventilation(mouvementsMois, flow) {
  const groupes = new Map();
  for (const m of mouvementsMois) {
    if ((CATEGORIE_FLOW.get(m.category) ?? m.flow) !== flow) continue;
    const g = groupes.get(m.category) ?? { category: m.category, total: 0, count: 0 };
    g.total += Math.abs(m.montant);
    g.count += 1;
    groupes.set(m.category, g);
  }

  const lignes = [...groupes.values()].sort((a, b) => b.total - a.total);
  const total = lignes.reduce((s, l) => s + l.total, 0);
  return lignes.map((l) => ({
    ...l,
    total: round2(l.total),
    part: total > 0 ? round2((l.total / total) * 100) : 0,
  }));
}

/**
 * Courbe du solde jour par jour sur le mois.
 *
 * On remonte depuis le solde actuel : le solde de fin de période est le seul
 * chiffre dont on soit sûr, la courbe doit donc y aboutir. Un point par jour
 * écoulé, pas un par mouvement — sinon trois dépenses le même jour feraient
 * une marche d'escalier là où il ne s'est rien passé le reste de la semaine.
 */
export function courbeDuMois({ mouvements, solde, mois }) {
  const { debut, fin } = bornesMois(mois);
  const maintenant = Date.now();
  const borneHaute = Math.min(fin.getTime(), maintenant);
  if (borneHaute <= debut.getTime()) return [];

  // Solde au début du mois = solde actuel − ce qui a bougé depuis.
  const depuisDebut = mouvements
    .filter((m) => new Date(m.date).getTime() >= debut.getTime())
    .reduce((s, m) => s + m.montant, 0);

  let courant = Number(solde) - depuisDebut;
  const points = [round2(courant)];

  const parJour = new Map();
  for (const m of mouvementsDuMois(mouvements, mois)) {
    const d = new Date(m.date);
    const jour = d.getDate();
    parJour.set(jour, (parJour.get(jour) ?? 0) + m.montant);
  }

  // `borneHaute` est une borne ouverte : pour un mois passé elle tombe sur le
  // 1er du mois suivant, dont le jour est 1. On recule d'une milliseconde
  // pour retomber sur le dernier jour du mois tracé.
  const dernierJour = new Date(borneHaute - 1).getDate();
  for (let jour = 1; jour <= dernierJour; jour += 1) {
    courant += parJour.get(jour) ?? 0;
    points.push(round2(courant));
  }
  return points;
}
