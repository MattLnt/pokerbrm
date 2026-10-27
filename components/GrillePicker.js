"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check, ChevronLeft, X } from "lucide-react";

import SiteBadge from "@/components/SiteBadge";
import Feuille from "@/components/Feuille";
import { Button } from "@/components/ui";
import { FORMAT_LABELS, libelleVitesse } from "@/lib/constants";
import { grouperParHeure, libelleTranche } from "@/lib/session";
import { formatEuro, plural } from "@/lib/format";

/**
 * Inscription en deux temps : on choisit la room, puis on coche les tournois.
 *
 * L'étape des tournois est une grille horaire : les tournois sont classés par
 * heure de début et regroupés par tranche, de 0 h à 23 h. C'est ainsi qu'on
 * lit un programme — et ça répond à la vraie question au moment de
 * s'inscrire : qu'est-ce qui part maintenant, et qu'est-ce qui part après.
 * La tranche en cours est marquée et la liste s'y ouvre.
 */
export default function GrillePicker({ grille, onClose, onInscrire, pending }) {
  const [room, setRoom] = useState(null);
  const [coches, setCoches] = useState(() => new Set());
  const [filtre, setFiltre] = useState("");

  const heureCourante = useMemo(() => new Date().getUTCHours(), []);

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

  const tranches = useMemo(() => {
    if (!room) return [];
    const q = filtre.trim().toLowerCase();
    const retenus = grille
      .filter((m) => m.siteSlug === room)
      .filter((m) => !q || m.name.toLowerCase().includes(q));
    return grouperParHeure(retenus);
  }, [grille, room, filtre]);

  const nbAffiches = tranches.reduce((s, t) => s + t.tournois.length, 0);

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
      <Feuille titre="Choisir la room" onClose={onClose} taille="large">
        {rooms.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            Ta grille est vide. Ajoute des tournois pour commencer.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rooms.map((r) => (
              <li key={r.slug}>
                <button
                  type="button"
                  onClick={() => setRoom(r.slug)}
                  className="surface liftable flex w-full items-center gap-4 rounded-card border border-line bg-surface px-5 py-5 text-left"
                >
                  <SiteBadge slug={r.slug} taille={52} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-bold">{r.nom}</span>
                    <span className="num block text-sm text-ink-muted">
                      {plural(r.n, "tournoi")} dans la grille
                    </span>
                  </span>
                  <span className="text-lg text-ink-muted" aria-hidden>
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

  /* --- étape 2 : la grille horaire --- */
  const nomRoom = rooms.find((r) => r.slug === room)?.nom ?? "Tournois";

  return (
    <Feuille
      titre={nomRoom}
      onClose={onClose}
      taille="large"
      pied={
        <div className="flex items-center gap-3">
          {coches.size > 0 ? (
            <button
              type="button"
              onClick={() => setCoches(new Set())}
              aria-label="Tout décocher"
              title="Tout décocher"
              className="grid size-[46px] shrink-0 place-items-center rounded-tile border border-line text-ink-muted transition-colors hover:text-ink"
            >
              <X size={18} />
            </button>
          ) : null}
          <Button
            type="button"
            variant="primary"
            className="flex-1"
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
      }
      avant={
        <button
          type="button"
          onClick={() => setRoom(null)}
          aria-label="Changer de room"
          title="Changer de room"
          className="-ml-2 grid size-11 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ChevronLeft size={22} />
        </button>
      }
    >
      <div className="mb-5 flex items-center gap-3">
        <label className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder="Chercher un tournoi"
            className="bd-input pl-11"
          />
        </label>
        <span className="num shrink-0 text-sm text-ink-muted">
          {plural(nbAffiches, "tournoi")}
        </span>
      </div>

      {nbAffiches === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">
          Aucun tournoi ne correspond.
        </p>
      ) : (
        <div className="space-y-5">
          {tranches.map((tranche) => (
            <Tranche
              key={String(tranche.heure)}
              tranche={tranche}
              courante={tranche.heure === heureCourante}
              coches={coches}
              onBasculer={basculer}
            />
          ))}
        </div>
      )}
    </Feuille>
  );
}

/** Une tranche horaire et ses tournois. */
function Tranche({ tranche, courante, coches, onBasculer }) {
  const ref = useRef(null);

  // La liste s'ouvre sur l'heure en cours : c'est là qu'on s'inscrit.
  useEffect(() => {
    if (courante) ref.current?.scrollIntoView({ block: "start" });
  }, [courante]);

  return (
    <section ref={ref} className="scroll-mt-2">
      <header className="mb-2.5 flex items-center gap-3">
        <span
          className={`num text-base font-bold tabular-nums ${
            courante ? "text-accent" : "text-ink-section"
          }`}
        >
          {libelleTranche(tranche.heure)}
        </span>
        <span
          className={`h-px flex-1 ${courante ? "bg-accent/40" : "bg-line"}`}
          aria-hidden
        />
        {courante ? (
          <span className="rounded-pill bg-accent/15 px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider text-accent ring-1 ring-accent/30">
            maintenant
          </span>
        ) : null}
      </header>

      <ul className="grid gap-2 sm:grid-cols-2">
        {tranche.tournois.map((m) => {
          const coche = coches.has(m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onBasculer(m.id)}
                aria-pressed={coche}
                className={`flex w-full items-center gap-3 rounded-tile border px-3.5 py-3 text-left transition-colors ${
                  coche
                    ? "border-accent/50 bg-accent/10"
                    : "border-line bg-surface-2 hover:border-line-strong"
                }`}
              >
                <span
                  className={`grid size-[22px] shrink-0 place-items-center rounded-xs border transition-colors ${
                    coche
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-line-strong"
                  }`}
                  aria-hidden
                >
                  {coche ? <Check size={14} strokeWidth={3} /> : null}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">{m.name}</span>
                    {m.tag ? (
                      <span className="shrink-0 rounded-pill bg-rose/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-rose ring-1 ring-rose/30">
                        {m.tag}
                      </span>
                    ) : null}
                  </span>
                  <span className="num block truncate text-sm text-ink-muted">
                    {FORMAT_LABELS[m.format]}
                    {libelleVitesse(m) ? ` · ${libelleVitesse(m)}` : ""}
                  </span>
                </span>

                <span className="num shrink-0 font-bold">
                  {formatEuro(m.cout)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
