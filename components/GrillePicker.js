"use client";

import { useMemo, useState } from "react";
import { Search, Check, ChevronLeft } from "lucide-react";

import SiteBadge from "@/components/SiteBadge";
import Feuille from "@/components/Feuille";
import { Button } from "@/components/ui";
import { FORMAT_LABELS, libelleVitesse } from "@/lib/constants";
import { trierGrille } from "@/lib/session";
import { formatEuro, plural } from "@/lib/format";

/**
 * Inscription en deux temps : on choisit d'abord la room, puis on coche les
 * tournois. C'est l'ordre réel — on s'assoit sur un client à la fois — et ça
 * divise la liste à parcourir.
 */
export default function GrillePicker({ grille, onClose, onInscrire, pending }) {
  const [room, setRoom] = useState(null);
  const [coches, setCoches] = useState(() => new Set());
  const [filtre, setFiltre] = useState("");

  const rooms = useMemo(() => {
    const parSlug = new Map();
    for (const m of grille) {
      const r = parSlug.get(m.siteSlug) ?? {
        slug: m.siteSlug,
        nom: m.siteName,
        n: 0,
      };
      r.n += 1;
      parSlug.set(m.siteSlug, r);
    }
    return [...parSlug.values()].sort((a, b) => b.n - a.n);
  }, [grille]);

  const liste = useMemo(() => {
    if (!room) return [];
    const triee = trierGrille(grille.filter((m) => m.siteSlug === room));
    const q = filtre.trim().toLowerCase();
    return q ? triee.filter((m) => m.name.toLowerCase().includes(q)) : triee;
  }, [grille, room, filtre]);

  const selection = useMemo(
    () => grille.filter((m) => coches.has(m.id)),
    [grille, coches]
  );
  const total = selection.reduce((s, m) => s + m.cout, 0);

  function basculer(id) {
    setCoches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* --- étape 1 : la room --- */
  if (!room) {
    return (
      <Feuille titre="Choisir la room" onClose={onClose}>
        {rooms.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            Ta grille est vide. Ajoute des tournois pour commencer.
          </p>
        ) : (
          <ul className="grid gap-2.5">
            {rooms.map((r) => (
              <li key={r.slug}>
                <button
                  type="button"
                  onClick={() => setRoom(r.slug)}
                  className="flex w-full items-center gap-4 rounded-card border border-line bg-surface px-4 py-4 text-left transition-colors active:bg-surface-2"
                >
                  <SiteBadge slug={r.slug} taille={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold">{r.nom}</span>
                    <span className="num block text-sm text-ink-muted">
                      {plural(r.n, "tournoi")} dans la grille
                    </span>
                  </span>
                  <span className="text-ink-muted" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Feuille>
    );
  }

  /* --- étape 2 : les tournois à cocher --- */
  return (
    <Feuille
      titre="Tournois"
      onClose={onClose}
      avant={
        <button
          type="button"
          onClick={() => setRoom(null)}
          aria-label="Changer de room"
          className="-ml-2 grid size-11 shrink-0 place-items-center text-ink-muted"
        >
          <ChevronLeft size={22} />
        </button>
      }
    >
      <label className="relative mb-3 block">
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="text"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          placeholder="Chercher un tournoi"
          className="min-h-[48px] w-full rounded-tile border border-line bg-surface-2 pl-11 pr-4 text-base"
        />
      </label>

      {liste.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">
          Aucun tournoi ne correspond.
        </p>
      ) : (
        <ul className="max-h-[46vh] divide-y divide-line overflow-y-auto rounded-card border border-line bg-surface">
          {liste.map((m) => {
            const coche = coches.has(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => basculer(m.id)}
                  aria-pressed={coche}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-[7px] border transition-colors ${
                      coche
                        ? "border-accent bg-accent text-[#08121f]"
                        : "border-line-strong"
                    }`}
                    aria-hidden
                  >
                    {coche ? <Check size={15} strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{m.name}</span>
                      {m.tag ? (
                        <span className="shrink-0 rounded-pill bg-rose/15 px-2 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-rose ring-1 ring-rose/30">
                          {m.tag}
                        </span>
                      ) : null}
                    </span>
                    <span className="num block truncate text-sm text-ink-muted">
                      {FORMAT_LABELS[m.format]}
                      {libelleVitesse(m) ? ` · ${libelleVitesse(m)}` : ""}
                      {m.usualHour !== null ? ` · ~${m.usualHour} h` : ""}
                    </span>
                  </span>
                  <span className="num shrink-0 font-semibold">
                    {formatEuro(m.cout)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4">
        <Button
          type="button"
          variant="primary"
          className="w-full"
          disabled={pending || coches.size === 0}
          onClick={() => onInscrire([...coches])}
        >
          {pending
            ? "Inscription…"
            : coches.size === 0
              ? "Coche au moins un tournoi"
              : `Inscrire ${plural(coches.size, "tournoi")} · ${formatEuro(total)}`}
        </Button>
      </div>
    </Feuille>
  );
}
