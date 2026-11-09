/**
 * Répétition espacée, SM-2 simplifié.
 * Une main ratée revient tout de suite ; une main réussie s'éloigne de plus
 * en plus. Les intervalles sont en jours.
 */

export function review(state, correct) {
  const easiness = state?.easiness ?? 2.5;
  const repetition = state?.repetition ?? 0;
  const interval = state?.interval ?? 0;

  if (!correct) {
    // Échec : on repart de zéro et la main revient dès la session suivante.
    return {
      easiness: Math.max(1.3, easiness - 0.2),
      repetition: 0,
      interval: 0,
      dueAt: new Date(),
    };
  }

  const nextRepetition = repetition + 1;
  let nextInterval;
  if (nextRepetition === 1) nextInterval = 1;
  else if (nextRepetition === 2) nextInterval = 3;
  else nextInterval = Math.round(interval * easiness);

  return {
    easiness: Math.min(3, easiness + 0.1),
    repetition: nextRepetition,
    interval: nextInterval,
    dueAt: new Date(Date.now() + nextInterval * 86400000),
  };
}

/**
 * Tire une main dans une range, en privilégiant celles qui sont dues.
 * `due` : mains déjà échouées et à revoir ; `pool` : toutes les mains du spot.
 */
export function pickHand(pool, due = [], random = Math.random) {
  if (pool.length === 0) return null;
  // 60 % du temps on ressert une main due, si elle existe.
  if (due.length > 0 && random() < 0.6) {
    return due[Math.floor(random() * due.length)];
  }
  return pool[Math.floor(random() * pool.length)];
}

/**
 * Loosifie et Tightifie ne sont pas des actions à part : ce sont des
 * raises, marqués « loose » ou « tight ». Au trainer, on répond Raise.
 */
export const VARIANTES_RAISE = { loosifie: "loose", tightifie: "tight" };

/** L'action à jouer pour une clé de pinceau : les variantes valent raise. */
export function actionJouee(cle) {
  return VARIANTES_RAISE[cle] ? "raise" : cle;
}

/**
 * Les réponses acceptées en plus du raise sur une main marquée :
 * - loose : la main n'entre que quand on ouvre son jeu → fold accepté ;
 * - tight : la main sort quand on resserre son jeu → fold ou call acceptés.
 */
const ALTERNATIVES = {
  loosifie: ["fold"],
  tightifie: ["fold", "call"],
};

/**
 * La précision à donner sur une main marquée loose ou tight, selon ce qui
 * a été répondu. Null quand la main n'a rien de marqué.
 */
export function nuanceRaise(actions, reponse) {
  const standard = actions?.raise ?? 0;
  const loose = actions?.loosifie ?? 0;
  const tight = actions?.tightifie ?? 0;
  if (loose === 0 && tight === 0) return null;

  const parts = [
    ...(standard > 0 ? [`raise standard ${standard} %`] : []),
    ...(loose > 0 ? [`loose ${loose} %`] : []),
    ...(tight > 0 ? [`tight ${tight} %`] : []),
  ];
  const melange = parts.length > 1 ? ` (${parts.join(", ")})` : "";

  if (reponse === "raise") {
    if (loose > 0 && standard === 0 && tight === 0) {
      return "Raise loose : tu la joues quand tu ouvres ton jeu, sinon fold.";
    }
    if (tight > 0 && standard === 0 && loose === 0) {
      return "Raise tight : la main se joue, mais tu peux la lâcher quand tu resserres ton jeu.";
    }
    return `Raise mixé${melange}.`;
  }
  if (loose > 0 && reponse === "fold") {
    return `Accepté : c'est un raise loose${melange}, à jouer seulement quand tu ouvres ton jeu.`;
  }
  if (tight > 0 && (reponse === "fold" || reponse === "call")) {
    return `Accepté : c'est une main tight${melange} — raise en temps normal, ${
      reponse === "call" ? "call" : "fold"
    } quand tu resserres ton jeu.`;
  }
  return loose > 0
    ? `C'est un raise loose${melange} : raise si tu ouvres ton jeu, fold sinon.`
    : `C'est une main tight${melange} : raise, ou fold/call si tu resserres ton jeu.`;
}

/**
 * Compare la réponse à la range : correcte si l'action choisie a une
 * fréquence non nulle sur cette main. Raise couvre aussi les mains
 * Loosifie et Tightifie ; sur ces mains, le fold (loose) ou le fold et le
 * call (tight) sont acceptés — `accepte` le signale. `nuance` explique.
 */
export function gradeAnswer(cells, hand, answer) {
  const actions = cells?.[hand] ?? {};
  const expected = Object.entries(actions).filter(([, f]) => f > 0);

  if (expected.length === 0) {
    // Main hors range : la bonne réponse est fold.
    return {
      correct: answer === "fold",
      accepte: false,
      expected: { fold: 100 },
      nuance: null,
    };
  }

  const direct = expected.some(([cle]) => actionJouee(cle) === answer);
  const alternative =
    !direct &&
    expected.some(([cle]) => (ALTERNATIVES[cle] ?? []).includes(answer));
  return {
    correct: direct || alternative,
    accepte: alternative,
    expected: Object.fromEntries(expected),
    nuance: nuanceRaise(actions, answer),
  };
}

/** Mélange une liste sans la modifier (Fisher-Yates). */
function melanger(liste, hasard = Math.random) {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(hasard() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/**
 * Compose la liste des questions d'une session.
 *
 * Les mains dues passent en premier — ce sont celles qu'on a ratées, ou
 * dont l'intervalle de révision est écoulé. C'est tout l'intérêt de la
 * répétition espacée : une erreur doit revenir, mais à la session suivante
 * et pas trois coups plus tard.
 *
 * Une main ne figure qu'une fois : revoir deux fois la même dans un même
 * lancer donne l'impression de tourner en rond.
 *
 * `seulementDues` sert à la session de révision pure, quand on revient
 * exprès pour reprendre ses erreurs.
 */
export function construireSession({
  spots,
  dues = [],
  mains,
  longueur,
  seulementDues = false,
  hasard = Math.random,
}) {
  if (spots.length === 0 || longueur <= 0) return [];

  const retenus = new Set(spots);
  const prises = new Set();
  const questions = [];

  for (const due of melanger(dues, hasard)) {
    if (questions.length >= longueur) break;
    if (!retenus.has(due.spot) || prises.has(due.main)) continue;
    prises.add(due.main);
    questions.push({ spot: due.spot, main: due.main, due: true });
  }

  if (!seulementDues) {
    const libres = melanger(
      mains.filter((main) => !prises.has(main)),
      hasard
    );
    for (const main of libres) {
      if (questions.length >= longueur) break;
      const spot = spots[Math.floor(hasard() * spots.length)];
      questions.push({ spot, main, due: false });
    }
  }

  // Les mains dues sont ajoutées en bloc : sans ce dernier brassage, on
  // saurait qu'on est en train de revoir une erreur avant même de lire la
  // main, ce qui fausse la réponse.
  return melanger(questions, hasard);
}
