"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui";

const TYPES = [
  { key: "THEORIE", label: "Théorie" },
  { key: "DRILL", label: "Drill" },
  { key: "REVUE_MAINS", label: "Revue de mains" },
  { key: "REVUE_BDD", label: "Revue de base" },
];

const DURATIONS = [30, 45, 60, 90, 120];

/** Saisie rapide d'une session : type, durée, thème — trois taps. */
export default function StudyLogger({ themes, demo }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("THEORIE");
  const [minutes, setMinutes] = useState(60);
  const [themeId, setThemeId] = useState(themes[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function submit(e) {
    e.preventDefault();
    if (demo) {
      setError("Branche la base Railway pour enregistrer tes sessions.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, minutes, themeId, notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Enregistrement impossible.");
        return;
      }
      setOpen(false);
      setNotes("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" className="w-full" onClick={() => setOpen(true)}>
        <Plus size={18} />
        Noter une session
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-card border border-line bg-surface p-4"
    >
      <p className="kicker mb-2">Type</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            aria-pressed={type === t.key}
            className={`min-h-[44px] rounded-tile border text-sm ${
              type === t.key
                ? "border-rose-line bg-rose-bg text-ink"
                : "border-line bg-surface-2 text-ink-section"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="kicker mb-2">Durée</p>
      <div className="mb-4 grid grid-cols-5 gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setMinutes(d)}
            aria-pressed={minutes === d}
            className={`num min-h-[44px] rounded-tile border text-sm ${
              minutes === d
                ? "border-rose-line bg-rose-bg text-ink"
                : "border-line bg-surface-2 text-ink-section"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {themes.length > 0 ? (
        <label className="mb-4 block">
          <span className="kicker mb-2 block">Thème</span>
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="min-h-[48px] w-full rounded-tile border border-line bg-surface-2 px-4 text-base"
          >
            <option value="">Aucun</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="mb-4 block">
        <span className="kicker mb-2 block">Notes</span>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Facultatif"
          className="min-h-[48px] w-full rounded-tile border border-line bg-surface-2 px-4 text-base"
        />
      </label>

      {error ? <p className="mb-3 text-sm text-warning">{error}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={() => setOpen(false)}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
