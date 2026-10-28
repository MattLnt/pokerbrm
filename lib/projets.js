// Calculs sur les projets web — fonctions pures, indépendantes de Prisma.

import { round2 } from "./bankroll.js";
import { DEVIS_RELANCE_JOURS, PROJECT_STAGES } from "./constants.js";

const VIVIER = new Set(
  PROJECT_STAGES.filter((s) => s.vivier).map((s) => s.key)
);

/** Vrai si l'état fait partie du vivier (piste, devis envoyé, devis refusé). */
export function estVivier(stage) {
  return VIVIER.has(stage);
}

const jours = (date) =>
  Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

/**
 * Jours écoulés depuis l'envoi du devis, si une relance est due.
 * `null` sinon — un devis parti hier n'attend rien de personne.
 */
export function relanceDue(projet) {
  if (projet.stage !== "DEVIS_ENVOYE" || !projet.devisAt) return null;
  const age = jours(projet.devisAt);
  return age >= DEVIS_RELANCE_JOURS ? age : null;
}

const somme = (liste) => round2(liste.reduce((s, p) => s + Number(p.amount), 0));

/**
 * Les chiffres qui comptent sur l'écran des projets.
 *
 * « À encaisser » réunit volontairement ce qui est à facturer et ce qui est
 * facturé mais pas payé : dans les deux cas l'argent n'est pas sur le compte,
 * et c'est le total qui dit si le mois est tenu. Les deux moitiés restent
 * données à part — l'une demande d'écrire une facture, l'autre d'attendre ou
 * de relancer.
 */
export function resumeProjets(projets = []) {
  const travail = projets.filter((p) => !estVivier(p.stage));
  const enCours = travail.filter((p) => p.stage === "EN_COURS");

  // Le devis refusé sort des comptes : ce n'est plus une perspective.
  const perspectives = projets.filter(
    (p) => p.stage === "IDEE" || p.stage === "DEVIS_ENVOYE"
  );

  const aFacturer = travail.filter((p) => p.billing === "A_FACTURER");
  const facture = travail.filter((p) => p.billing === "FACTURE");
  const paye = travail.filter((p) => p.billing === "PAYE");

  return {
    enCoursCount: enCours.length,
    enCoursTotal: somme(enCours),

    aFacturer: { count: aFacturer.length, total: somme(aFacturer) },
    facture: { count: facture.length, total: somme(facture) },
    aEncaisser: round2(somme(aFacturer) + somme(facture)),
    encaisse: somme(paye),

    vivier: {
      count: perspectives.length,
      total: somme(perspectives),
      devisEnvoyes: perspectives.filter((p) => p.stage === "DEVIS_ENVOYE").length,
      relances: perspectives.filter((p) => relanceDue(p) !== null).length,
    },
  };
}

/**
 * Les projets rangés par état, dans l'ordre du cycle de vie.
 * Un état sans projet garde sa case : la colonne vide dit elle aussi quelque
 * chose — un vivier vide est une information.
 */
export function parEtat(projets = []) {
  return PROJECT_STAGES.map((etat) => ({
    ...etat,
    projets: projets.filter((p) => p.stage === etat.key),
  }));
}
