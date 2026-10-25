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
 * Compare la réponse à la range : correcte si l'action choisie a une
 * fréquence non nulle sur cette main. Renvoie aussi la fréquence attendue.
 */
export function gradeAnswer(cells, hand, answer) {
  const actions = cells?.[hand] ?? {};
  const expected = Object.entries(actions).filter(([, f]) => f > 0);

  if (expected.length === 0) {
    // Main hors range : la bonne réponse est fold.
    return {
      correct: answer === "fold",
      expected: { fold: 100 },
    };
  }

  const frequency = actions[answer] ?? 0;
  return {
    correct: frequency > 0,
    expected: Object.fromEntries(expected),
  };
}
