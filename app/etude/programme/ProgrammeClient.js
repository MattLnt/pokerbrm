"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  X,
  RotateCcw,
} from "lucide-react";

import { Card, SectionTitle, Button, EmptyState } from "@/components/ui";

function objectifsDe(theme) {
  return Array.isArray(theme?.objectives) ? theme.objectives : [];
}

/**
 * Un thème du programme, avec ses objectifs.
 *
 * Tout se modifie sur place : cocher un objectif, en ajouter un, déplacer le
 * thème. Le programme n'était jusqu'ici qu'un affichage, alors que c'est
 * justement la pièce qu'on réajuste chaque semaine.
 */
function Theme({ theme, index, premier, dernier, onAppel, pending, demo }) {
  const [nouvelObjectif, setNouvelObjectif] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const objectifs = objectifsDe(theme);
  const faits = objectifs.filter((o) => o.done).length;

  function majObjectifs(liste) {
    onAppel("PATCH", { id: theme.id, objectives: liste });
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="num mt-1 text-[var(--fs-overline)] font-bold tracking-[var(--overline-tracking)] text-ink-muted/60">
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Le bloc n'est pas répété ici : il sert déjà de titre de section
            juste au-dessus du groupe. */}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold tracking-[var(--ls-heading)]">
            {theme.title}
          </h3>
          <p className="mt-0.5 text-sm text-ink-muted">
            {theme.weekFrom
              ? `Semaines ${theme.weekFrom}${
                  theme.weekTo && theme.weekTo !== theme.weekFrom
                    ? `–${theme.weekTo}`
                    : ""
                } · `
              : ""}
            {objectifs.length > 0
              ? `${faits} / ${objectifs.length} ${
                  objectifs.length > 1 ? "objectifs" : "objectif"
                }`
              : "Aucun objectif"}
          </p>
        </div>

        {/* Déplacer : le thème le plus haut est celui de la semaine. */}
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label="Monter"
            disabled={premier || pending || demo}
            onClick={() => onAppel("PATCH", { id: theme.id, move: "up" })}
            className="grid size-9 place-items-center rounded-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30"
          >
            <ChevronUp size={17} />
          </button>
          <button
            type="button"
            aria-label="Descendre"
            disabled={dernier || pending || demo}
            onClick={() => onAppel("PATCH", { id: theme.id, move: "down" })}
            className="grid size-9 place-items-center rounded-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30"
          >
            <ChevronDown size={17} />
          </button>
          <button
            type="button"
            aria-label={confirmation ? "Confirmer la suppression" : "Supprimer"}
            disabled={pending || demo}
            onClick={() => {
              if (confirmation) onAppel("DELETE", { id: theme.id });
              else setConfirmation(true);
            }}
            onBlur={() => setConfirmation(false)}
            className={`grid size-9 place-items-center rounded-xs transition-colors disabled:opacity-30 ${
              confirmation
                ? "bg-negative/15 text-negative"
                : "text-ink-muted hover:bg-surface-2 hover:text-negative"
            }`}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {objectifs.map((o, i) => (
          <li key={i} className="flex items-start gap-3">
            <button
              type="button"
              disabled={pending || demo}
              onClick={() =>
                majObjectifs(
                  objectifs.map((autre, j) =>
                    j === i ? { ...autre, done: !autre.done } : autre
                  )
                )
              }
              aria-pressed={o.done}
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-xs border text-[var(--fs-xs)] transition-colors disabled:opacity-40 ${
                o.done
                  ? "border-positive bg-positive text-accent-fg"
                  : "border-line-strong hover:border-ink-muted"
              }`}
            >
              {o.done ? "✓" : ""}
            </button>
            <span
              className={`flex-1 text-base ${
                o.done ? "text-ink-muted line-through" : ""
              }`}
            >
              {o.label}
            </span>
            <button
              type="button"
              aria-label="Retirer l'objectif"
              disabled={pending || demo}
              onClick={() => majObjectifs(objectifs.filter((_, j) => j !== i))}
              className="grid size-6 shrink-0 place-items-center rounded-xs text-ink-muted/50 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const label = nouvelObjectif.trim();
          if (!label) return;
          majObjectifs([...objectifs, { label, done: false }]);
          setNouvelObjectif("");
        }}
      >
        <input
          type="text"
          value={nouvelObjectif}
          onChange={(e) => setNouvelObjectif(e.target.value)}
          placeholder="Ajouter un objectif"
          className="bd-input"
        />
        <Button type="submit" disabled={pending || demo} className="shrink-0">
          <Plus size={18} />
        </Button>
      </form>
    </Card>
  );
}

/** Création d'un thème. */
function NouveauTheme({ onAppel, onAnnuler, pending }) {
  const [title, setTitle] = useState("");
  const [block, setBlock] = useState("");
  const [weekFrom, setWeekFrom] = useState("");
  const [weekTo, setWeekTo] = useState("");

  return (
    <Card className="p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onAppel("POST", { title, block, weekFrom, weekTo }, onAnnuler);
        }}
      >
        <label className="mb-3 block">
          <span className="kicker mb-2 block">Titre</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Push/fold et resteal sous 20bb"
            className="bd-input"
            autoFocus
          />
        </label>

        <label className="mb-3 block">
          <span className="kicker mb-2 block">Bloc</span>
          <input
            type="text"
            value={block}
            onChange={(e) => setBlock(e.target.value)}
            placeholder="Préflop par profondeur"
            className="bd-input"
          />
        </label>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="kicker mb-2 block">De la semaine</span>
            <input
              type="number"
              min="1"
              value={weekFrom}
              onChange={(e) => setWeekFrom(e.target.value)}
              className="bd-input num"
            />
          </label>
          <label className="block">
            <span className="kicker mb-2 block">À la semaine</span>
            <input
              type="number"
              min="1"
              value={weekTo}
              onChange={(e) => setWeekTo(e.target.value)}
              className="bd-input num"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={onAnnuler}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Enregistrement…" : "Ajouter"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function ProgrammeClient({ themes, demo }) {
  const router = useRouter();
  const [creation, setCreation] = useState(false);
  const [remiseAZero, setRemiseAZero] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [pending, startTransition] = useTransition();

  function appeler(methode, corps, apres) {
    if (demo) {
      setErreur("Branche la base Railway pour modifier ton programme.");
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const res = await fetch("/api/study-themes", {
        method: methode,
        headers: { "Content-Type": "application/json" },
        body: corps === undefined ? undefined : JSON.stringify(corps),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErreur(body.error ?? "Enregistrement impossible.");
        return;
      }
      apres?.();
      router.refresh();
    });
  }

  // Les thèmes sont regroupés par bloc, dans l'ordre où ils arrivent : c'est
  // la structure du programme de la spec (préflop, postflop, 3bet, ICM).
  const blocs = [];
  for (const theme of themes) {
    const nom = theme.block ?? "Sans bloc";
    const dernier = blocs.at(-1);
    if (dernier?.nom === nom) dernier.themes.push(theme);
    else blocs.push({ nom, themes: [theme] });
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
      <div>
        {themes.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Aucun thème"
            description="Le programme est vide. Ajoute un premier thème pour commencer à suivre tes objectifs."
            action={
              <Button
                type="button"
                variant="primary"
                onClick={() => setCreation(true)}
              >
                <Plus size={18} />
                Ajouter un thème
              </Button>
            }
          />
        ) : (
          blocs.map((bloc) => (
            <div key={bloc.nom}>
              <SectionTitle>{bloc.nom}</SectionTitle>
              <div className="grid gap-2.5">
                {bloc.themes.map((theme) => {
                  const index = themes.indexOf(theme);
                  return (
                    <Theme
                      key={theme.id}
                      theme={theme}
                      index={index}
                      premier={index === 0}
                      dernier={index === themes.length - 1}
                      onAppel={appeler}
                      pending={pending}
                      demo={demo}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="max-lg:mt-6 lg:sticky lg:top-6">
        <SectionTitle tight>Ajouter</SectionTitle>
        {creation ? (
          <NouveauTheme
            onAppel={appeler}
            onAnnuler={() => setCreation(false)}
            pending={pending}
          />
        ) : (
          <Button
            type="button"
            className="w-full"
            onClick={() => setCreation(true)}
          >
            <Plus size={18} />
            Nouveau thème
          </Button>
        )}

        {erreur ? <p className="mt-3 text-sm text-warning">{erreur}</p> : null}

        <Card className="mt-3 p-4">
          <p className="kicker mb-2">Le thème de la semaine</p>
          <p className="text-sm leading-[var(--lh-normal)] text-ink-muted">
            C&apos;est le premier de la liste. Remonte un thème pour en faire
            celui sur lequel tu travailles — il apparaîtra sur la vue
            d&apos;ensemble et sur l&apos;accueil.
          </p>
        </Card>

        <SectionTitle>Repartir à zéro</SectionTitle>
        <Card className="p-4">
          <p className="mb-3 text-sm leading-[var(--lh-normal)] text-ink-muted">
            Remplace ton programme par celui livré avec l&apos;app. Tes thèmes
            et tes objectifs actuels sont perdus ; les sessions du journal sont
            gardées, elles perdent seulement leur lien vers le thème.
          </p>
          {/* Deux temps : l'action efface des données et rien ne la défait. */}
          <Button
            type="button"
            variant={remiseAZero ? "danger" : "secondary"}
            className="w-full"
            disabled={pending || demo}
            onBlur={() => setRemiseAZero(false)}
            onClick={() => {
              if (!remiseAZero) {
                setRemiseAZero(true);
                return;
              }
              appeler("PUT", undefined, () => setRemiseAZero(false));
            }}
          >
            <RotateCcw size={18} />
            {remiseAZero
              ? "Confirmer le remplacement"
              : "Programme par défaut"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
