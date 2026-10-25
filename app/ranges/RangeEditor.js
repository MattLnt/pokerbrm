"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Copy, Eraser } from "lucide-react";

import RangeGrid from "@/components/RangeGrid";
import { Card, SectionTitle, Button } from "@/components/ui";
import {
  POSITIONS,
  STACK_DEPTHS,
  RANGE_ACTIONS,
  RANGE_BRUSHES,
} from "@/lib/constants";
import { QUICK_SELECTS, rangeStats } from "@/lib/hands";

function spotKey({ position, action, stackDepth }) {
  return `${position}|${action}|${stackDepth}`;
}

export default function RangeEditor({ initialRanges, demo }) {
  const [position, setPosition] = useState("BTN");
  const [action, setAction] = useState("RFI");
  const [stackDepth, setStackDepth] = useState("60BB_PLUS");
  const [brush, setBrush] = useState(RANGE_BRUSHES[0].key);
  const [frequency, setFrequency] = useState(100);
  const [tuning, setTuning] = useState(null);
  const [ranges, setRanges] = useState(() => ({ ...initialRanges }));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  const key = spotKey({ position, action, stackDepth });
  // useMemo sur l'objet lui-même : sans ça, le `?? {}` crée une nouvelle
  // référence à chaque rendu et invalide le calcul des stats en permanence.
  const cells = useMemo(() => ranges[key] ?? {}, [ranges, key]);
  const stats = useMemo(() => rangeStats(cells), [cells]);

  function updateCells(updater) {
    setSaved(false);
    setRanges((prev) => {
      const current = prev[key] ?? {};
      return { ...prev, [key]: updater(current) };
    });
  }

  function paint(hand) {
    updateCells((current) => {
      const existing = current[hand] ?? {};
      // Repeindre une main déjà entièrement peinte avec le même pinceau l'efface.
      if (existing[brush] === frequency && Object.keys(existing).length === 1) {
        const { [hand]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [hand]: { [brush]: frequency } };
    });
  }

  function applyQuickSelect(hands) {
    updateCells((current) => {
      const next = { ...current };
      for (const h of hands) next[h] = { [brush]: frequency };
      return next;
    });
  }

  function setHandFrequencies(hand, actions) {
    updateCells((current) => {
      const cleaned = Object.fromEntries(
        Object.entries(actions).filter(([, f]) => f > 0)
      );
      if (Object.keys(cleaned).length === 0) {
        const { [hand]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [hand]: cleaned };
    });
  }

  function clearRange() {
    updateCells(() => ({}));
  }

  function copyFrom(sourceKey) {
    const source = ranges[sourceKey];
    if (!source) return;
    updateCells(() => ({ ...source }));
  }

  function save() {
    if (demo) {
      setError("Branche la base Railway pour enregistrer tes ranges.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/ranges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, action, stackDepth, cells }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Enregistrement impossible.");
        return;
      }
      setSaved(true);
    });
  }

  // Les autres spots déjà remplis, pour la copie.
  const filledSpots = Object.entries(ranges)
    .filter(([k, v]) => k !== key && Object.keys(v ?? {}).length > 0)
    .map(([k]) => k);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
      {/* Colonne principale : choix du spot, grille, statistiques */}
      <div>
        {/* Sélecteur de spot */}
        <Card className="p-4">
        <p className="kicker mb-2">Position</p>
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
          {POSITIONS.map((p) => (
            <Chip key={p} active={p === position} onClick={() => setPosition(p)}>
              {p}
            </Chip>
          ))}
        </div>

        <p className="kicker mb-2">Action</p>
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
          {RANGE_ACTIONS.map((a) => (
            <Chip
              key={a.key}
              active={a.key === action}
              onClick={() => setAction(a.key)}
            >
              {a.label}
            </Chip>
          ))}
        </div>

        <p className="kicker mb-2">Profondeur</p>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {STACK_DEPTHS.map((d) => (
            <Chip
              key={d.key}
              active={d.key === stackDepth}
              onClick={() => setStackDepth(d.key)}
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </Card>

      {/* Grille */}
      <div className="mt-4">
        <RangeGrid
          cells={cells}
          brushes={RANGE_BRUSHES}
          onPaint={paint}
          onLongPress={(hand) => setTuning(hand)}
        />
      </div>

      {/* Stats en direct */}
      <Card className="mt-4 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-base text-ink-muted">Range</p>
          <p className="num text-xl font-bold">
            {stats.percent.toFixed(1).replace(".", ",")} %
            <span className="ml-2 text-sm font-normal text-ink-muted">
              {stats.combos} combos
            </span>
          </p>
        </div>
        {Object.keys(stats.byAction).length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {Object.entries(stats.byAction).map(([act, v]) => {
              const brushDef = RANGE_BRUSHES.find((b) => b.key === act);
              return (
                <li key={act} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2.5 rounded-[2px]"
                    style={{ background: brushDef?.color }}
                    aria-hidden
                  />
                  <span className="flex-1 text-ink-section">
                    {brushDef?.label ?? act}
                  </span>
                  <span className="num text-ink-muted">
                    {v.percent.toFixed(1).replace(".", ",")} % · {v.combos} combos
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">
            Tape une case pour peindre, maintiens pour régler la fréquence.
          </p>
        )}
      </Card>

      </div>

      {/* Colonne des réglages */}
      <div className="max-lg:mt-0 lg:sticky lg:top-6">
        {/* Pinceaux */}
        <SectionTitle tight>Pinceau</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        {RANGE_BRUSHES.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setBrush(b.key)}
            aria-pressed={brush === b.key}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-tile border text-sm ${
              brush === b.key
                ? "border-ink/40 bg-surface-3 text-ink"
                : "border-line bg-surface text-ink-section"
            }`}
          >
            <span
              className="size-3 rounded-[2px]"
              style={{ background: b.color }}
              aria-hidden
            />
            {b.label}
          </button>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 flex items-baseline justify-between text-sm text-ink-muted">
          Fréquence du pinceau
          <span className="num text-ink">{frequency} %</span>
        </span>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={frequency}
          onChange={(e) => setFrequency(Number(e.target.value))}
          className="w-full accent-[#6ea8fe]"
        />
      </label>

      {/* Sélections rapides */}
      <SectionTitle>Sélection rapide</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {QUICK_SELECTS.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => applyQuickSelect(q.hands())}
            className="min-h-[44px] rounded-pill border border-line bg-surface px-4 text-sm text-ink-section"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Outils */}
      <SectionTitle>Outils</SectionTitle>
      <div className="grid gap-2">
        {filledSpots.length > 0 ? (
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-muted">
              Copier une range existante
            </span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) copyFrom(e.target.value);
                e.target.value = "";
              }}
              className="min-h-[48px] w-full rounded-tile border border-line bg-surface-2 px-4 text-base"
            >
              <option value="">Choisir un spot…</option>
              {filledSpots.map((k) => {
                const [p, a, d] = k.split("|");
                const actionLabel =
                  RANGE_ACTIONS.find((x) => x.key === a)?.label ?? a;
                const depthLabel =
                  STACK_DEPTHS.find((x) => x.key === d)?.label ?? d;
                return (
                  <option key={k} value={k}>
                    {p} · {actionLabel} · {depthLabel}
                  </option>
                );
              })}
            </select>
          </label>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={clearRange}>
            <Eraser size={18} />
            Vider
          </Button>
          <Button
            type="button"
            onClick={() => {
              const next = STACK_DEPTHS.find((d) => d.key !== stackDepth);
              if (!next) return;
              const target = spotKey({ position, action, stackDepth: next.key });
              setRanges((prev) => ({ ...prev, [target]: { ...cells } }));
              setStackDepth(next.key);
            }}
          >
            <Copy size={18} />
            Dupliquer
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-tile border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </p>
      ) : null}
      </div>

      {/* Réserve sous la barre d'enregistrement, qui reste fixe aux deux tailles */}
      <div className="h-28 lg:col-span-2" />

      {/* Barre d'enregistrement */}
      <div
        className="fixed inset-x-0 bottom-[76px] z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-[240px] lg:px-8"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto w-full max-w-[560px] lg:max-w-[1180px]">
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={save}
            disabled={pending}
          >
            {saved ? <Check size={18} /> : null}
            {pending
              ? "Enregistrement…"
              : saved
                ? "Range enregistrée"
                : "Enregistrer la range"}
          </Button>
        </div>
      </div>

      {tuning ? (
        <FrequencySheet
          hand={tuning}
          actions={cells[tuning] ?? {}}
          onClose={() => setTuning(null)}
          onApply={(actions) => {
            setHandFrequencies(tuning, actions);
            setTuning(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[40px] shrink-0 rounded-pill border px-4 text-sm transition-colors ${
        active
          ? "border-rose-line bg-rose-bg text-ink"
          : "border-line bg-surface-2 text-ink-section"
      }`}
    >
      {children}
    </button>
  );
}

/** Réglage des fréquences d'une main, action par action. */
function FrequencySheet({ hand, actions, onClose, onApply }) {
  const [draft, setDraft] = useState(() => ({ ...actions }));
  const total = Object.entries(draft)
    .filter(([k]) => k !== "fold")
    .reduce((s, [, v]) => s + (v ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        className="relative w-full max-w-[480px] rounded-t-[22px] border-t border-line bg-surface p-5 lg:rounded-[22px] lg:border"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <h2 className="mb-1 text-xl font-bold">{hand}</h2>
        <p className="mb-4 text-sm text-ink-muted">
          Répartis les fréquences entre les actions.
        </p>

        {RANGE_BRUSHES.filter((b) => b.key !== "fold").map((b) => (
          <label key={b.key} className="mb-4 block">
            <span className="mb-1.5 flex items-center gap-2 text-sm">
              <span
                className="size-2.5 rounded-[2px]"
                style={{ background: b.color }}
                aria-hidden
              />
              <span className="flex-1 text-ink-section">{b.label}</span>
              <span className="num text-ink">{draft[b.key] ?? 0} %</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={draft[b.key] ?? 0}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [b.key]: Number(e.target.value) }))
              }
              className="w-full accent-[#6ea8fe]"
            />
          </label>
        ))}

        <p
          className={`mb-3 text-sm ${total > 100 ? "text-warning" : "text-ink-muted"}`}
        >
          Total : <span className="num">{total} %</span>
          {total > 100 ? " — au-dessus de 100 %" : ""}
        </p>

        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={() => onApply(draft)}
        >
          Appliquer
        </Button>
      </div>
    </div>
  );
}
