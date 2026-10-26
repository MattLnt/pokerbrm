"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Check, Copy, Eraser } from "lucide-react";

import RangeGrid from "@/components/RangeGrid";
import { Card, SectionTitle, Button } from "@/components/ui";
import {
  POSITIONS,
  STACK_DEPTHS,
  RANGE_ACTIONS,
  RANGE_BRUSHES,
} from "@/lib/constants";
import {
  QUICK_SELECTS,
  rangeStats,
  melanger,
  basculerSelectionRapide,
  selectionPosee,
} from "@/lib/hands";

function spotKey({ position, action, stackDepth }) {
  return `${position}|${action}|${stackDepth}`;
}

export default function RangeEditor({ initialRanges, spot, demo }) {
  // Le spot peut venir de l'URL (une main taguée qui ouvre sa range). On ne
  // garde que des valeurs connues : le reste de l'app suppose partout que
  // ces trois clés existent dans les listes.
  const connu = (valeur, liste, defaut) =>
    liste.some((x) => (x.key ?? x) === valeur) ? valeur : defaut;

  const [position, setPosition] = useState(() =>
    connu(spot?.position, POSITIONS, "BTN")
  );
  const [action, setAction] = useState(() =>
    connu(spot?.action, RANGE_ACTIONS, "RFI")
  );
  const [stackDepth, setStackDepth] = useState(() =>
    connu(spot?.stackDepth, STACK_DEPTHS, "60BB_PLUS")
  );
  const [brush, setBrush] = useState(RANGE_BRUSHES[0].key);
  const [frequency, setFrequency] = useState(100);
  const [tuning, setTuning] = useState(null);
  const [ranges, setRanges] = useState(() => ({ ...initialRanges }));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();
  const modeGeste = useRef("peindre");

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

  /**
   * `premier` marque le début d'un geste. C'est lui seul qui décide du mode :
   * repartir d'une main déjà peinte à l'identique efface, sinon on peint. Le
   * reste du glissement garde ce mode, sinon un trait qui repasse sur ses
   * propres cases les effacerait au fur et à mesure.
   */
  function paint(hand, premier = true) {
    if (premier) {
      const existante = cells[hand] ?? {};
      modeGeste.current =
        existante[brush] === frequency && Object.keys(existante).length === 1
          ? "effacer"
          : "peindre";
    }
    const mode = modeGeste.current;

    updateCells((current) => {
      if (mode === "effacer") {
        const { [hand]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [hand]: melanger(current[hand], brush, frequency) };
    });
  }

  function applyQuickSelect(cle) {
    updateCells((current) =>
      basculerSelectionRapide(current, cle, brush, frequency)
    );
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
      {/* Colonne principale : choix du spot, grille, statistiques.
          À partir de xl il y a assez de largeur pour ranger le spot et les
          stats à gauche de la grille : la grille n'est plus bornée que par la
          hauteur de l'écran, et la place gagnée en largeur ne reste pas vide
          à côté d'un carré centré. En dessous, tout s'empile dans l'ordre
          spot → grille → stats. */}
      <div className="flex flex-col xl:grid xl:grid-cols-[260px_minmax(0,1fr)] xl:grid-rows-[auto_1fr] xl:items-start xl:gap-5">
        {/* Sélecteur de spot */}
        <Card className="order-1 p-4 xl:col-start-1 xl:row-start-1">
        <p className="kicker mb-2">Position</p>
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 xl:flex-wrap xl:overflow-x-visible">
          {POSITIONS.map((p) => (
            <Chip key={p} active={p === position} onClick={() => setPosition(p)}>
              {p}
            </Chip>
          ))}
        </div>

        <p className="kicker mb-2">Action</p>
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 xl:flex-wrap xl:overflow-x-visible">
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
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 xl:flex-wrap xl:overflow-x-visible">
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

      {/* Grille. Elle est carrée : sans plafond, elle prend la largeur de la
          colonne et dépasse le bas de l'écran. On la borne donc par la hauteur
          restante — sur mobile le plafond est plus large que l'écran, la
          grille y garde toute la largeur. */}
      <div className="order-2 mx-auto mt-4 w-full max-w-[min(100%,calc(100dvh-230px))] xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:mt-0">
        <RangeGrid
          cells={cells}
          brushes={RANGE_BRUSHES}
          onPaint={paint}
          onLongPress={(hand) => setTuning(hand)}
        />
      </div>

      {/* Stats en direct */}
      <Card className="order-3 mt-4 p-4 xl:col-start-1 xl:row-start-2">
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
          className="w-full accent-accent"
        />
      </label>

      {/* Sélections rapides */}
      <SectionTitle>Sélection rapide</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {QUICK_SELECTS.map((q) => {
          const hands = q.hands();
          const posee = selectionPosee(cells, hands, brush, frequency);
          return (
            <button
              key={q.key}
              type="button"
              aria-pressed={posee}
              onClick={() => applyQuickSelect(q.key)}
              className={`min-h-[44px] rounded-pill border px-4 text-sm transition-colors ${
                posee
                  ? "border-accent-line bg-accent-soft text-accent-hover"
                  : "border-line bg-surface text-ink-section"
              }`}
            >
              {q.label}
            </button>
          );
        })}
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
              className="bd-select"
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

        {/* Sur grand écran l'enregistrement est une action parmi les autres :
            il se range ici, là où on cherche les boutons. La barre fixe du bas
            n'existe plus que sur mobile, où le pouce ne remonte pas. */}
        <div className="mt-2 max-lg:hidden">
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

      {error ? (
        <p className="mt-3 rounded-tile border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </p>
      ) : null}
      </div>

      {/* Réserve sous la barre fixe, mobile seulement */}
      <div className="h-28 lg:hidden" />

      {/* Barre d'enregistrement, mobile seulement */}
      <div
        className="fixed inset-x-0 bottom-[76px] z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur lg:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-[560px]">
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
          ? "border-negative/40 bg-negative/15 text-negative"
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
        className="flottant relative w-full max-w-[480px] rounded-t-xl border-t border-line bg-surface p-5 lg:rounded-xl lg:border"
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
              className="w-full accent-accent"
            />
          </label>
        ))}

        {/* Le fold n'a pas de curseur : c'est ce qui reste. L'afficher évite
            d'avoir à faire la soustraction de tête. */}
        <p
          className={`mb-3 text-sm ${total > 100 ? "text-warning" : "text-ink-muted"}`}
        >
          {total > 100 ? (
            <>
              Total : <span className="num">{total} %</span> — au-dessus de
              100 %
            </>
          ) : (
            <>
              Fold : <span className="num">{100 - total} %</span>
            </>
          )}
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
