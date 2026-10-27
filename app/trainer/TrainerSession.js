"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  X,
  RotateCcw,
  Play,
  Settings2,
  TrendingDown,
} from "lucide-react";

import { Card, SectionTitle, Button, ProgressBar, StatTile } from "@/components/ui";
import PokerTable from "@/components/PokerTable";
import {
  RANGE_BRUSHES,
  RANGE_ACTIONS,
  STACK_DEPTHS,
  POSITIONS,
} from "@/lib/constants";
import { ALL_HANDS } from "@/lib/hands";
import { gradeAnswer, construireSession } from "@/lib/spaced";
import { scenario } from "@/lib/table";
import { formatPercent, formatDuree } from "@/lib/format";

const LONGUEURS = [20, 50, 100];
const ANSWERS = RANGE_BRUSHES;

function decouper(cle) {
  const [position, action, profondeur] = cle.split("|");
  return { position, action, profondeur };
}

function libelleAction(cle) {
  return RANGE_ACTIONS.find((a) => a.key === cle)?.label ?? cle;
}

function libelleProfondeur(cle) {
  return STACK_DEPTHS.find((d) => d.key === cle)?.label ?? cle;
}

function spotLabel(cle) {
  const { position, action, profondeur } = decouper(cle);
  return `${position} · ${libelleAction(action)} · ${libelleProfondeur(profondeur)}`;
}

/**
 * Trois paliers de réussite, une seule fois : 85 % et plus c'est acquis,
 * 70 % ça tient, en dessous il faut y retourner. Les classes sont écrites
 * en toutes lettres — Tailwind lit le source, pas les chaînes construites.
 */
function texteSelon(reussite) {
  if (reussite >= 85) return "text-positive";
  if (reussite >= 70) return "text-warning";
  return "text-negative";
}

function bordureSelon(reussite) {
  if (reussite >= 85) return "border-positive/50";
  if (reussite >= 70) return "border-warning/50";
  return "border-negative/50";
}

function tonSelon(reussite) {
  if (reussite >= 85) return "positive";
  if (reussite >= 70) return "warning";
  return "negative";
}

/** Pastille d'action, dans la couleur de son pinceau. */
function Pastille({ cle, frequence, efface = false }) {
  const brosse = ANSWERS.find((x) => x.key === cle);
  return (
    <span
      className={`num whitespace-nowrap rounded-pill px-2.5 py-0.5 text-sm font-bold text-[#0a0f1c] ${
        efface ? "opacity-55" : ""
      }`}
      style={{ background: brosse?.color ?? "#93a0ba" }}
    >
      {brosse?.label ?? cle}
      {frequence === undefined ? "" : ` ${frequence} %`}
    </span>
  );
}

/** Pastille de sélection, reprise de l'éditeur de ranges. */
function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[40px] shrink-0 rounded-pill border px-4 text-sm transition-colors ${
        active
          ? "border-negative/40 bg-negative/15 text-negative"
          : "border-line bg-surface-2 text-ink-section"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Écran de réglage : ce qu'on drille.
 *
 * Le trainer imposait un spot à la fois, choisi dans un menu déroulant. On
 * ne joue jamais un seul spot à table : ce qui est dur, c'est justement de
 * reconnaître lequel on a sous les yeux. On sélectionne donc des positions,
 * des actions et des profondeurs, et la session pioche dedans.
 */
function Reglage({
  spots,
  dues,
  choix,
  setChoix,
  longueur,
  setLongueur,
  onLancer,
}) {
  // On ne propose que des valeurs qui existent vraiment dans les ranges
  // saisies : une pastille qui ne mène à rien est une fausse piste.
  const disponibles = useMemo(() => {
    const positions = new Set();
    const actions = new Set();
    const profondeurs = new Set();
    for (const cle of spots) {
      const d = decouper(cle);
      positions.add(d.position);
      actions.add(d.action);
      profondeurs.add(d.profondeur);
    }
    return { positions, actions, profondeurs };
  }, [spots]);

  function basculer(famille, valeur) {
    setChoix((precedent) => {
      const courant = new Set(precedent[famille]);
      if (courant.has(valeur)) courant.delete(valeur);
      else courant.add(valeur);
      return { ...precedent, [famille]: courant };
    });
  }

  const retenus = spots.filter((cle) => {
    const d = decouper(cle);
    return (
      (choix.positions.size === 0 || choix.positions.has(d.position)) &&
      (choix.actions.size === 0 || choix.actions.has(d.action)) &&
      (choix.profondeurs.size === 0 || choix.profondeurs.has(d.profondeur))
    );
  });

  // Les mains dues qui tombent dans les spots retenus : c'est ce qu'on
  // reverra au prochain lancer.
  const aRevoir = dues.filter((due) => retenus.includes(due.spot)).length;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
      <Card className="p-4">
        <p className="kicker mb-2">Position</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {POSITIONS.filter((p) => disponibles.positions.has(p)).map((p) => (
            <Chip
              key={p}
              active={choix.positions.has(p)}
              onClick={() => basculer("positions", p)}
            >
              {p}
            </Chip>
          ))}
        </div>

        <p className="kicker mb-2">Action</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {RANGE_ACTIONS.filter((a) => disponibles.actions.has(a.key)).map((a) => (
            <Chip
              key={a.key}
              active={choix.actions.has(a.key)}
              onClick={() => basculer("actions", a.key)}
            >
              {a.label}
            </Chip>
          ))}
        </div>

        <p className="kicker mb-2">Profondeur</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {STACK_DEPTHS.filter((d) => disponibles.profondeurs.has(d.key)).map(
            (d) => (
              <Chip
                key={d.key}
                active={choix.profondeurs.has(d.key)}
                onClick={() => basculer("profondeurs", d.key)}
              >
                {d.label}
              </Chip>
            )
          )}
        </div>

        <p className="kicker mb-2">Longueur</p>
        <div className="flex flex-wrap gap-2">
          {LONGUEURS.map((n) => (
            <Chip key={n} active={longueur === n} onClick={() => setLongueur(n)}>
              <span className="num">{n} mains</span>
            </Chip>
          ))}
        </div>
      </Card>

      <div className="max-lg:mt-4 lg:sticky lg:top-6">
        <SectionTitle tight>Au programme</SectionTitle>
        <Card className="p-4">
          <p className="num text-2xl font-bold">
            {retenus.length}
            <span className="ml-2 text-base font-normal text-ink-muted">
              {retenus.length > 1 ? "spots retenus" : "spot retenu"}
            </span>
          </p>
          <p className="mt-2 text-sm leading-[var(--lh-normal)] text-ink-muted">
            {choix.positions.size === 0 &&
            choix.actions.size === 0 &&
            choix.profondeurs.size === 0
              ? "Aucun filtre : la session pioche dans toutes tes ranges."
              : "La session pioche au hasard parmi ces spots, en resservant plus souvent les mains que tu rates."}
          </p>

          {retenus.length > 0 && retenus.length <= 8 ? (
            <ul className="scroll-fin mt-3 max-h-40 space-y-1 overflow-auto">
              {retenus.map((cle) => (
                <li key={cle} className="text-sm text-ink-section">
                  {spotLabel(cle)}
                </li>
              ))}
            </ul>
          ) : null}

          {aRevoir > 0 ? (
            <p className="mt-3 rounded-tile border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              {aRevoir} {aRevoir > 1 ? "mains" : "main"} à revoir — elles
              reviendront dans la session.
            </p>
          ) : null}

          <Button
            type="button"
            variant="primary"
            className="mt-4 w-full"
            disabled={retenus.length === 0}
            onClick={() => onLancer(retenus, false)}
          >
            <Play size={18} />
            Lancer la session
          </Button>

          {aRevoir > 0 ? (
            <Button
              type="button"
              className="mt-2 w-full"
              onClick={() => onLancer(retenus, true)}
            >
              <RotateCcw size={18} />
              Revoir mes {aRevoir} erreurs
            </Button>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

export default function TrainerSession({ ranges, dues, demo, initialSpot }) {
  const spots = useMemo(() => Object.keys(ranges), [ranges]);

  const [choix, setChoix] = useState(() => {
    // Un spot passé dans l'URL (depuis les faiblesses) pré-remplit le
    // réglage plutôt que de lancer une session dans le dos de l'utilisateur.
    if (initialSpot && ranges[initialSpot]) {
      const d = decouper(initialSpot);
      return {
        positions: new Set([d.position]),
        actions: new Set([d.action]),
        profondeurs: new Set([d.profondeur]),
      };
    }
    return { positions: new Set(), actions: new Set(), profondeurs: new Set() };
  });
  const [longueur, setLongueur] = useState(LONGUEURS[0]);

  const [pool, setPool] = useState(null); // spots retenus pour la session
  const [session, setSession] = useState([]); // les questions, dans l'ordre
  const [revision, setRevision] = useState(false);
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);
  // Le détail de chaque réponse : c'est lui qui nourrit le bilan. Un
  // pourcentage ne dit pas quelle main on a ratée ni dans quel spot.
  const [journal, setJournal] = useState([]);
  const [debut, setDebut] = useState(null);
  const [duree, setDuree] = useState(0);

  const poser = useCallback((questions, rang) => {
    const question = questions[rang];
    const { action, position } = decouper(question.spot);
    setQuestion({ ...question, scene: scenario(action, position) });
    setVerdict(null);
  }, []);

  function demarrer(spotsRetenus, questions) {
    if (questions.length === 0) return;
    setPool(spotsRetenus);
    setSession(questions);
    setIndex(0);
    setScore({ right: 0, wrong: 0 });
    setJournal([]);
    setFinished(false);
    setDebut(Date.now());
    setDuree(0);
    poser(questions, 0);
  }

  function lancer(spotsRetenus, seulementDues = false) {
    setRevision(seulementDues);
    demarrer(
      spotsRetenus,
      construireSession({
        spots: spotsRetenus,
        dues,
        mains: ALL_HANDS,
        longueur,
        seulementDues,
      })
    );
  }

  /** Rejoue exactement les mains ratées de la session qui vient de finir. */
  function rejouerRatees() {
    const ratees = journal
      .filter((ligne) => !ligne.correct)
      .map(({ spot, main }) => ({ spot, main, due: true }));
    setRevision(true);
    demarrer(pool, ratees);
  }

  function repondre(cle) {
    if (verdict || !question) return;
    const resultat = gradeAnswer(ranges[question.spot], question.main, cle);
    setVerdict({ ...resultat, given: cle });

    setScore((s) => ({
      right: s.right + (resultat.correct ? 1 : 0),
      wrong: s.wrong + (resultat.correct ? 0 : 1),
    }));
    setJournal((lignes) => [
      ...lignes,
      {
        spot: question.spot,
        main: question.main,
        donnee: cle,
        attendu: resultat.expected,
        correct: resultat.correct,
      },
    ]);

    if (!demo) {
      // Historique persistant : c'est lui qui alimente les faiblesses.
      fetch("/api/drill-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spot: question.spot,
          hand: question.main,
          answer: cle,
          correct: resultat.correct,
        }),
      }).catch(() => {});
    }
  }

  // La session fait la taille de sa liste : une révision pure peut être
  // plus courte que la longueur choisie s'il y a moins d'erreurs à revoir.
  const longueurEffective = session.length;

  function suivante() {
    if (index + 1 >= longueurEffective) {
      setDuree(debut ? (Date.now() - debut) / 60000 : 0);
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    poser(session, index + 1);
  }

  const total = score.right + score.wrong;
  const reussite = total > 0 ? (score.right / total) * 100 : 0;

  if (!pool) {
    return (
      <Reglage
        spots={spots}
        dues={dues}
        choix={choix}
        setChoix={setChoix}
        longueur={longueur}
        setLongueur={setLongueur}
        onLancer={lancer}
      />
    );
  }

  if (finished) {
    // Réussite par spot : c'est la seule lecture qui dit quoi retravailler.
    // Un pourcentage global mélange un spot acquis et un spot qu'on découvre.
    const parSpot = new Map();
    for (const ligne of journal) {
      const compte = parSpot.get(ligne.spot) ?? { joue: 0, juste: 0 };
      compte.joue += 1;
      if (ligne.correct) compte.juste += 1;
      parSpot.set(ligne.spot, compte);
    }
    const spotsClasses = [...parSpot.entries()]
      .map(([cle, c]) => ({
        cle,
        ...c,
        reussite: Math.round((c.juste / c.joue) * 100),
      }))
      .sort((a, b) => a.reussite - b.reussite);

    const ratees = journal.filter((ligne) => !ligne.correct);
    return (
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-5">
        <div>
          {/* Le chiffre d'abord, dans le ton qui va avec. */}
          <Card className={`p-5 ${bordureSelon(reussite)}`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="kicker mb-1">Session terminée</p>
                <p
                  className={`num text-5xl font-bold leading-none ${texteSelon(
                    reussite
                  )}`}
                >
                  {formatPercent(reussite, { decimals: 0 })}
                </p>
                <p className="mt-2 text-base text-ink-muted">
                  {score.right} bonnes réponses sur {total}
                  {revision ? " · révision" : ""}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-tile bg-bg-sunken px-4 py-2">
                  <p className="num text-xl font-bold text-positive">
                    {score.right}
                  </p>
                  <p className="kicker mt-0.5">Justes</p>
                </div>
                <div className="rounded-tile bg-bg-sunken px-4 py-2">
                  <p className="num text-xl font-bold text-negative">
                    {score.wrong}
                  </p>
                  <p className="kicker mt-0.5">Ratées</p>
                </div>
                <div className="rounded-tile bg-bg-sunken px-4 py-2">
                  <p className="num text-xl font-bold text-ink">
                    {formatDuree(duree)}
                  </p>
                  <p className="kicker mt-0.5">Durée</p>
                </div>
              </div>
            </div>
          </Card>

          {spotsClasses.length > 0 ? (
            <>
              <SectionTitle>Par spot, du plus faible au plus solide</SectionTitle>
              <div className="grid gap-2">
                {spotsClasses.map((spot) => (
                  <Card key={spot.cle} className="p-4">
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-medium">{spotLabel(spot.cle)}</p>
                      <p className="num text-sm text-ink-muted">
                        {spot.juste} / {spot.joue}
                        <span
                          className={`ml-3 text-base font-bold ${texteSelon(
                            spot.reussite
                          )}`}
                        >
                          {spot.reussite} %
                        </span>
                      </p>
                    </div>
                    <ProgressBar
                      value={spot.reussite}
                      max={100}
                      tone={tonSelon(spot.reussite)}
                    />
                  </Card>
                ))}
              </div>
            </>
          ) : null}

          {ratees.length > 0 ? (
            <>
              <SectionTitle>Ce que tu as raté</SectionTitle>
              <Card className="divide-y divide-line/70 overflow-hidden">
                {ratees.map((ligne, i) => (
                  <div
                    key={`${ligne.spot}-${ligne.main}-${i}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                  >
                    <span className="num w-14 shrink-0 text-lg font-bold">
                      {ligne.main}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">
                      {spotLabel(ligne.spot)}
                    </span>
                    <span className="flex items-center gap-2">
                      <Pastille cle={ligne.donnee} efface />
                      <span className="text-ink-muted" aria-hidden>
                        →
                      </span>
                      {Object.entries(ligne.attendu).map(([cle, frequence]) => (
                        <Pastille key={cle} cle={cle} frequence={frequence} />
                      ))}
                    </span>
                  </div>
                ))}
              </Card>
            </>
          ) : null}
        </div>

        <div className="max-lg:mt-4 lg:sticky lg:top-6">
          <SectionTitle tight>Et maintenant</SectionTitle>
          <div className="grid gap-2">
            {ratees.length > 0 ? (
              <Button type="button" variant="primary" onClick={rejouerRatees}>
                <RotateCcw size={18} />
                Rejouer les {ratees.length} ratées
              </Button>
            ) : null}
            <Button
              type="button"
              variant={ratees.length > 0 ? "secondary" : "primary"}
              onClick={() => lancer(pool)}
            >
              <Play size={18} />
              Relancer la même session
            </Button>
            <Button type="button" onClick={() => setPool(null)}>
              <Settings2 size={18} />
              Changer de spots
            </Button>
            <Button as={Link} href="/etude/faiblesses">
              <TrendingDown size={18} />
              Voir mes faiblesses
            </Button>
          </div>

          <Card className="mt-3 p-4">
            <p className="kicker mb-2">Ce qui est enregistré</p>
            <p className="text-sm leading-[var(--lh-normal)] text-ink-muted">
              Chaque réponse part dans ton historique de drills. C&apos;est lui
              qui alimente l&apos;onglet Faiblesses de l&apos;étude, à partir
              d&apos;une dizaine de mains sur un même spot.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const { position, profondeur } = decouper(question.spot);

  return (
    /* Deux zones : l'état de la session à gauche, la table au centre avec
       ses réponses et sa correction dessous, sur la même largeur. */
    <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-5">
      <div className="max-lg:mb-4 lg:sticky lg:top-6">
        <Card className="p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="kicker">Main</p>
            <p className="num text-sm text-ink-muted">
              {index + 1} / {longueurEffective}
            </p>
          </div>
          <ProgressBar value={index} max={longueurEffective} />

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-tile bg-bg-sunken py-2">
              <p className="num text-xl font-bold text-positive">
                {score.right}
              </p>
              <p className="kicker mt-0.5">Justes</p>
            </div>
            <div className="rounded-tile bg-bg-sunken py-2">
              <p className="num text-xl font-bold text-negative">
                {score.wrong}
              </p>
              <p className="kicker mt-0.5">Ratées</p>
            </div>
          </div>

          <p className="kicker mb-1.5 mt-4">Le spot</p>
          <p className="text-sm text-ink-section">{spotLabel(question.spot)}</p>
          {question.scene?.consigne ? (
            <p className="mt-2 text-sm leading-[var(--lh-normal)] text-ink-muted">
              {question.scene.consigne}
            </p>
          ) : null}
        </Card>

        <Button
          type="button"
          className="mt-2.5 w-full"
          onClick={() => setPool(null)}
        >
          <Settings2 size={18} />
          Changer de spots
        </Button>
      </div>

      {/* La table n'est plus enfermée dans une carte : le rail lui suffit
          pour se détacher, un cadre de plus ne faisait que l'enserrer.
          Sa largeur est plafonnée — étalée sur toute la colonne, elle
          devenait si haute que les réponses passaient sous l'écran. */}
      <div className="mx-auto w-full max-w-[720px]">
        <PokerTable
          heros={position}
          main={question.main}
          profondeur={profondeur}
          scene={question.scene}
        />

        {/* Les réponses, pleines et sur une rangée. La marge haute laisse
            respirer la plaque du héros, qui déborde sous la table. */}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {ANSWERS.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => repondre(a.key)}
              disabled={Boolean(verdict)}
              style={
                verdict && verdict.given !== a.key
                  ? undefined
                  : { background: a.color }
              }
              className={`min-h-[52px] rounded-sm text-base font-bold tracking-[var(--ls-heading)] transition-opacity ${
                verdict && verdict.given !== a.key
                  ? "bg-surface-2 text-ink-muted opacity-45"
                  : "text-[#0a0f1c]"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* La correction, sur une seule ligne avec le bouton qui suit.
            Un filet de couleur sur fond sombre ne se voyait pas : le verdict
            est ce qu'on vient lire, il prend donc une bande teintée, une
            pastille pleine et un mot en grand. Les fréquences attendues
            reprennent les couleurs des boutons de réponse — on relie ce
            qu'on a cliqué à ce qu'il fallait cliquer sans lire. */}
        {verdict ? (
          <div
            className={`mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card border-2 p-4 ${
              verdict.correct
                ? "border-positive/60 bg-positive/10"
                : "border-negative/60 bg-negative/10"
            }`}
          >
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-full ${
                verdict.correct
                  ? "bg-positive text-[#06251a]"
                  : "bg-negative text-[#2a0810]"
              }`}
              aria-hidden
            >
              {verdict.correct ? (
                <Check size={24} strokeWidth={3} />
              ) : (
                <X size={24} strokeWidth={3} />
              )}
            </span>

            <span
              className={`text-3xl font-bold leading-none tracking-[var(--ls-heading)] ${
                verdict.correct ? "text-positive" : "text-negative"
              }`}
            >
              {verdict.correct ? "Correct" : "Raté"}
            </span>

            <span className="flex flex-wrap items-center gap-2">
              <span className="kicker">Attendu</span>
              {Object.entries(verdict.expected).map(([cle, frequence]) => {
                const brosse = ANSWERS.find((x) => x.key === cle);
                return (
                  <span
                    key={cle}
                    className="num rounded-pill px-3 py-1 text-base font-bold text-[#0a0f1c]"
                    style={{ background: brosse?.color ?? "#93a0ba" }}
                  >
                    {brosse?.label ?? cle} {frequence} %
                  </span>
                );
              })}
            </span>

            <Button
              type="button"
              variant="primary"
              className="ml-auto max-sm:w-full"
              onClick={suivante}
            >
              Main suivante
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
