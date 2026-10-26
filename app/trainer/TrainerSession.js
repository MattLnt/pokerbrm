"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Check, X, RotateCcw } from "lucide-react";

import { Card, SectionTitle, Button, ProgressBar, StatTile } from "@/components/ui";
import { RANGE_BRUSHES, RANGE_ACTIONS, STACK_DEPTHS } from "@/lib/constants";
import { ALL_HANDS } from "@/lib/hands";
import { pickHand, gradeAnswer, review } from "@/lib/spaced";
import { formatPercent } from "@/lib/format";

const SESSION_LENGTH = 20;
const ANSWERS = RANGE_BRUSHES;

function spotLabel(key) {
  const [position, action, depth] = key.split("|");
  const actionLabel = RANGE_ACTIONS.find((a) => a.key === action)?.label ?? action;
  const depthLabel = STACK_DEPTHS.find((d) => d.key === depth)?.label ?? depth;
  return `${position} · ${actionLabel} · ${depthLabel}`;
}

export default function TrainerSession({ ranges, demo, initialSpot }) {
  const spots = useMemo(() => Object.keys(ranges), [ranges]);
  const [spot, setSpot] = useState(
    initialSpot && ranges[initialSpot] ? initialSpot : spots[0]
  );
  const [index, setIndex] = useState(0);
  const [hand, setHand] = useState(() => pickHand(ALL_HANDS, []));
  const [verdict, setVerdict] = useState(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);

  // État de répétition espacée, par main, en mémoire de session.
  const memory = useRef(new Map());

  const dueHands = useCallback(() => {
    const now = Date.now();
    return [...memory.current.entries()]
      .filter(([, s]) => new Date(s.dueAt).getTime() <= now && s.repetition === 0)
      .map(([h]) => h);
  }, []);

  const draw = useCallback(() => {
    const next = pickHand(ALL_HANDS, dueHands());
    setHand(next);
    setVerdict(null);
  }, [dueHands]);

  function answer(key) {
    if (verdict) return;
    const result = gradeAnswer(ranges[spot], hand, key);
    setVerdict({ ...result, given: key });

    memory.current.set(hand, review(memory.current.get(hand), result.correct));
    setScore((s) => ({
      right: s.right + (result.correct ? 1 : 0),
      wrong: s.wrong + (result.correct ? 0 : 1),
    }));

    if (!demo) {
      // Historique persistant pour alimenter les stats et l'Accueil.
      fetch("/api/drill-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spot,
          hand,
          answer: key,
          correct: result.correct,
        }),
      }).catch(() => {});
    }
  }

  function next() {
    if (index + 1 >= SESSION_LENGTH) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    draw();
  }

  function restart() {
    memory.current = new Map();
    setIndex(0);
    setScore({ right: 0, wrong: 0 });
    setFinished(false);
    setHand(pickHand(ALL_HANDS, []));
    setVerdict(null);
  }

  const total = score.right + score.wrong;
  const successRate = total > 0 ? (score.right / total) * 100 : 0;

  if (finished) {
    return (
      <>
        <Card className="p-5 text-center">
          <p className="kicker mb-2">Session terminée</p>
          <p className="num text-[var(--fs-2xl)] font-bold leading-[var(--lh-tight)]">
            {formatPercent(successRate, { decimals: 0 })}
          </p>
          <p className="mt-2 text-base text-ink-muted">
            {score.right} bonnes réponses sur {total}
          </p>
        </Card>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <StatTile label="Justes" value={score.right} tone="text-positive" />
          <StatTile label="Ratées" value={score.wrong} tone="text-warning" />
        </div>

        <Button
          type="button"
          variant="primary"
          className="mt-4 w-full"
          onClick={restart}
        >
          <RotateCcw size={18} />
          Relancer une session
        </Button>
      </>
    );
  }

  return (
    <>
      {/* Choix du spot */}
      {spots.length > 1 ? (
        <label className="mb-4 block">
          <span className="kicker mb-2 block">Spot</span>
          <select
            value={spot}
            onChange={(e) => {
              setSpot(e.target.value);
              restart();
            }}
            className="bd-select"
          >
            {spots.map((k) => (
              <option key={k} value={k}>
                {spotLabel(k)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="mb-4 text-base text-ink-section">{spotLabel(spot)}</p>
      )}

      {/* Progression */}
      <div className="mb-4">
        <div className="mb-2 flex items-baseline justify-between text-sm text-ink-muted">
          <span className="num">
            Main {index + 1} / {SESSION_LENGTH}
          </span>
          <span className="num">
            {score.right} ✓ · {score.wrong} ✕
          </span>
        </div>
        <ProgressBar value={index} max={SESSION_LENGTH} />
      </div>

      {/* La main */}
      <Card className="px-5 py-10 text-center">
        <p className="kicker mb-3">Ta main</p>
        <p className="num text-[var(--fs-3xl)] font-bold leading-[var(--lh-tight)]">{hand}</p>
      </Card>

      {/* Correction */}
      {verdict ? (
        <Card
          className={`mt-3 p-4 ${
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
          <p className="text-sm text-ink-muted">
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

      {/* Réponses */}
      <SectionTitle>Ton action</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        {ANSWERS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => answer(a.key)}
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
          className="mt-4 w-full"
          onClick={next}
        >
          Main suivante
        </Button>
      ) : null}

      <div className="h-6" />
    </>
  );
}
