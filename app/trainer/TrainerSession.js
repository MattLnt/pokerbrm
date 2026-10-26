"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Check, X, RotateCcw, Play, Settings2 } from "lucide-react";

import { Card, SectionTitle, Button, ProgressBar, StatTile } from "@/components/ui";
import PokerTable from "@/components/PokerTable";
import {
  RANGE_BRUSHES,
  RANGE_ACTIONS,
  STACK_DEPTHS,
  POSITIONS,
} from "@/lib/constants";
import { ALL_HANDS } from "@/lib/hands";
import { pickHand, gradeAnswer, review } from "@/lib/spaced";
import { scenario } from "@/lib/table";
import { formatPercent } from "@/lib/format";

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
function Reglage({ spots, choix, setChoix, longueur, setLongueur, onLancer }) {
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
          <p className="num text-[var(--fs-xl)] font-bold">
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

          <Button
            type="button"
            variant="primary"
            className="mt-4 w-full"
            disabled={retenus.length === 0}
            onClick={() => onLancer(retenus)}
          >
            <Play size={18} />
            Lancer la session
          </Button>
        </Card>
      </div>
    </div>
  );
}

export default function TrainerSession({ ranges, demo, initialSpot }) {
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

  const [enCours, setEnCours] = useState(null); // liste des spots de la session
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);

  // Répétition espacée, en mémoire de session. La clé porte le spot : la
  // même main n'a pas la même difficulté selon la situation.
  const memory = useRef(new Map());

  const tirer = useCallback((pool) => {
    const spot = pool[Math.floor(Math.random() * pool.length)];
    const now = Date.now();
    const dues = [...memory.current.entries()]
      .filter(
        ([cle, etat]) =>
          cle.startsWith(`${spot}#`) &&
          etat.repetition === 0 &&
          new Date(etat.dueAt).getTime() <= now
      )
      .map(([cle]) => cle.split("#")[1]);

    return { spot, main: pickHand(ALL_HANDS, dues), scene: null };
  }, []);

  const poser = useCallback(
    (pool) => {
      const tiree = tirer(pool);
      const { action, position } = decouper(tiree.spot);
      setQuestion({ ...tiree, scene: scenario(action, position) });
      setVerdict(null);
    },
    [tirer]
  );

  function lancer(pool) {
    memory.current = new Map();
    setEnCours(pool);
    setIndex(0);
    setScore({ right: 0, wrong: 0 });
    setFinished(false);
    poser(pool);
  }

  function repondre(cle) {
    if (verdict || !question) return;
    const resultat = gradeAnswer(ranges[question.spot], question.main, cle);
    setVerdict({ ...resultat, given: cle });

    const memoire = `${question.spot}#${question.main}`;
    memory.current.set(
      memoire,
      review(memory.current.get(memoire), resultat.correct)
    );
    setScore((s) => ({
      right: s.right + (resultat.correct ? 1 : 0),
      wrong: s.wrong + (resultat.correct ? 0 : 1),
    }));

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

  function suivante() {
    if (index + 1 >= longueur) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    poser(enCours);
  }

  const total = score.right + score.wrong;
  const reussite = total > 0 ? (score.right / total) * 100 : 0;

  if (!enCours) {
    return (
      <Reglage
        spots={spots}
        choix={choix}
        setChoix={setChoix}
        longueur={longueur}
        setLongueur={setLongueur}
        onLancer={lancer}
      />
    );
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-[560px]">
        <Card className="p-5 text-center">
          <p className="kicker mb-2">Session terminée</p>
          <p className="num text-[var(--fs-2xl)] font-bold leading-[var(--lh-tight)]">
            {formatPercent(reussite, { decimals: 0 })}
          </p>
          <p className="mt-2 text-base text-ink-muted">
            {score.right} bonnes réponses sur {total}
          </p>
        </Card>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <StatTile label="Justes" value={score.right} tone="text-positive" />
          <StatTile label="Ratées" value={score.wrong} tone="text-warning" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" onClick={() => setEnCours(null)}>
            <Settings2 size={18} />
            Changer
          </Button>
          <Button type="button" variant="primary" onClick={() => lancer(enCours)}>
            <RotateCcw size={18} />
            Relancer
          </Button>
        </div>
      </div>
    );
  }

  const { position, profondeur } = decouper(question.spot);

  return (
    /* Trois zones, comme l'éditeur de ranges : l'état de la session à
       gauche, la table au centre — elle doit être la plus grande chose de
       l'écran —, les réponses à droite. Tout tenait dans une colonne de
       620 px au milieu d'un écran trois fois plus large. */
    <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-5 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
      {/* Gauche : où en est la session */}
      <div className="max-lg:mb-4 lg:sticky lg:top-6">
        <Card className="p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="kicker">Main</p>
            <p className="num text-sm text-ink-muted">
              {index + 1} / {longueur}
            </p>
          </div>
          <ProgressBar value={index} max={longueur} />

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-tile bg-bg-sunken py-2">
              <p className="num text-[var(--fs-lg)] font-bold text-positive">
                {score.right}
              </p>
              <p className="kicker mt-0.5">Justes</p>
            </div>
            <div className="rounded-tile bg-bg-sunken py-2">
              <p className="num text-[var(--fs-lg)] font-bold text-warning">
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
          onClick={() => setEnCours(null)}
        >
          <Settings2 size={18} />
          Changer de spots
        </Button>
      </div>

      {/* Centre : la table */}
      <Card className="p-3 lg:p-4">
        <PokerTable
          heros={position}
          main={question.main}
          profondeur={profondeur}
          scene={question.scene}
        />
      </Card>

      {/* Droite : la décision, et la correction juste au-dessus */}
      <div className="max-lg:mt-4 xl:sticky xl:top-6">
        {verdict ? (
          <Card
            className={`mb-2.5 p-4 ${
              verdict.correct ? "border-positive/40" : "border-warning/40"
            }`}
          >
            <p
              className={`mb-2 flex items-center gap-2 font-semibold ${
                verdict.correct ? "text-positive" : "text-warning"
              }`}
            >
              {verdict.correct ? <Check size={18} /> : <X size={18} />}
              {verdict.correct ? "Correct" : "Raté"}
            </p>
            <p className="text-sm leading-[var(--lh-normal)] text-ink-muted">
              Attendu :{" "}
              {Object.entries(verdict.expected)
                .map(([a, f]) => {
                  const label = ANSWERS.find((x) => x.key === a)?.label ?? a;
                  return `${label} ${f} %`;
                })
                .join(" · ")}
            </p>
          </Card>
        ) : null}

        <p className="kicker mb-2">Ton action</p>
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-1">
          {ANSWERS.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => repondre(a.key)}
              disabled={Boolean(verdict)}
              className={`flex min-h-[56px] items-center justify-center gap-2 rounded-tile border text-base font-medium transition-opacity disabled:opacity-40 ${
                verdict?.given === a.key
                  ? "border-ink/40 bg-surface-3"
                  : "border-line bg-surface"
              }`}
            >
              <span
                className="size-3 rounded-[2px]"
                style={{ background: a.color }}
                aria-hidden
              />
              {a.label}
            </button>
          ))}
        </div>

        {verdict ? (
          <Button
            type="button"
            variant="primary"
            className="mt-2.5 w-full"
            onClick={suivante}
          >
            Main suivante
          </Button>
        ) : null}
      </div>
    </div>
  );
}
