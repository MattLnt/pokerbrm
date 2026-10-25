"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, Square, Search, X } from "lucide-react";

import {
  Card,
  CardList,
  SectionTitle,
  Button,
  StatTile,
  EmptyState,
  Columns,
} from "@/components/ui";
import { totauxSession, trierGrille } from "@/lib/session";
import { FORMAT_LABELS, SPEED_LABELS } from "@/lib/constants";
import { formatEuro, formatPercent, formatDate, plural, toneClass } from "@/lib/format";

function duree(depuis) {
  const min = Math.floor((Date.now() - new Date(depuis).getTime()) / 60000);
  const h = Math.floor(min / 60);
  return h === 0 ? `${min} min` : `${h} h ${String(min % 60).padStart(2, "0")}`;
}

export default function SessionClient({ demo, session, grille, recentes }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState(null);
  const [picker, setPicker] = useState(false);
  const [saisie, setSaisie] = useState(null);

  // useMemo sur la liste : le `?? []` crée sinon une référence neuve à chaque
  // rendu et relance le calcul des totaux en permanence.
  const tournois = useMemo(() => session?.tournaments ?? [], [session]);
  const totaux = useMemo(() => totauxSession(tournois), [tournois]);
  const enCours = tournois.filter((t) => t.inProgress);
  const termines = tournois.filter((t) => !t.inProgress);

  function appeler(url, body, apres) {
    if (demo) {
      setErreur("Branche la base Railway pour enregistrer une session.");
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const res = await fetch(url, {
        method: body?._methode ?? "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErreur(j.error ?? "Opération impossible.");
        return;
      }
      apres?.();
      router.refresh();
    });
  }

  function ouvrirSession() {
    appeler("/api/sessions", {});
  }

  function cloreSession() {
    if (demo) {
      setErreur("Branche la base Railway pour enregistrer une session.");
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErreur(j.error ?? "Clôture impossible.");
        return;
      }
      router.refresh();
    });
  }

  /* ---------------- aucune session ouverte ---------------- */

  if (!session) {
    return (
      <>
        {erreur ? <Erreur>{erreur}</Erreur> : null}

        <EmptyState
          icon={Play}
          title="Aucune session en cours"
          description="Ouvre une session avant de t'inscrire : chaque tournoi inscrit s'ajoute au total engagé, en direct."
          action={
            <Button
              type="button"
              variant="primary"
              className="mt-2"
              onClick={ouvrirSession}
              disabled={pending}
            >
              <Play size={18} />
              {pending ? "Ouverture…" : "Lancer une session"}
            </Button>
          }
        />

        {grille.length === 0 && !demo ? (
          <Card className="mt-3 border-warning/40 bg-warning/5 p-4 text-sm text-ink-muted">
            Ta grille est vide. Lance <code className="num">npm run db:seed</code>{" "}
            pour la pré-remplir avec les MTT que tu joues déjà.
          </Card>
        ) : null}

        {recentes.length > 0 ? (
          <>
            <SectionTitle>Sessions précédentes</SectionTitle>
            <HistoriqueSessions sessions={recentes} />
          </>
        ) : null}
      </>
    );
  }

  /* ---------------- session ouverte ---------------- */

  return (
    <>
      {erreur ? <Erreur>{erreur}</Erreur> : null}

      <Columns>
        <div>
          {/* Ce que la session coûte, en direct */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-base text-ink-muted">
                En cours depuis {duree(session.startedAt)}
              </p>
              <span className="num text-sm text-ink-muted">
                {plural(totaux.total, "tournoi")}
              </span>
            </div>

            <p className="kicker mb-1">Engagé</p>
            <p className="num text-[2.75rem] font-bold leading-none lg:text-[3.25rem]">
              {formatEuro(totaux.engage)}
            </p>

            <p className="mt-3 text-base">
              <span className="text-ink-muted">Récupéré </span>
              <span className="num font-semibold">
                {formatEuro(totaux.recupere)}
              </span>
              <span className="text-ink-muted"> · net </span>
              <span className={`num font-semibold ${toneClass(totaux.net)}`}>
                {formatEuro(totaux.net, { sign: true })}
              </span>
            </p>

            {totaux.enCours > 0 ? (
              <p className="mt-2 text-sm text-ink-muted">
                dont {plural(totaux.enCours, "tournoi")} encore en jeu
              </p>
            ) : null}
          </Card>

          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <StatTile
              label="ROI de session"
              value={formatPercent(totaux.roi, { sign: true, decimals: 0 })}
              tone={toneClass(totaux.roi)}
              sub="MTT seulement"
            />
            <StatTile
              label="ITM"
              value={formatPercent(totaux.itm, { decimals: 0 })}
              sub={`${totaux.termines} terminés`}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="primary"
              onClick={() => setPicker(true)}
              disabled={pending}
            >
              <Plus size={18} />
              Inscrire
            </Button>
            <Button type="button" onClick={cloreSession} disabled={pending}>
              <Square size={16} />
              Terminer
            </Button>
          </div>
        </div>

        <div>
          <SectionTitle tight>En jeu</SectionTitle>
          {enCours.length === 0 ? (
            <Card className="px-4 py-5 text-center text-sm text-ink-muted">
              Aucun tournoi en jeu. Inscris-toi pour commencer.
            </Card>
          ) : (
            <CardList>
              {enCours.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{t.name}</p>
                    <p className="num text-sm text-ink-muted">
                      {t.siteName} · {formatEuro(t.totalCost)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="shrink-0 px-3 text-sm"
                    onClick={() => setSaisie(t)}
                  >
                    Résultat
                  </Button>
                </div>
              ))}
            </CardList>
          )}

          {termines.length > 0 ? (
            <>
              <SectionTitle>Terminés</SectionTitle>
              <CardList>
                {termines.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.name}</p>
                      <p className="num text-sm text-ink-muted">
                        {t.finishPosition ? `${t.finishPosition}e · ` : ""}
                        {formatEuro(t.totalCost)} engagé
                        {t.reEntries ? ` · ${plural(t.reEntries, "re-entry", "re-entries")}` : ""}
                      </p>
                    </div>
                    <p
                      className={`num shrink-0 font-semibold ${toneClass(t.netResult)}`}
                    >
                      {formatEuro(t.netResult, { sign: true })}
                    </p>
                  </div>
                ))}
              </CardList>
            </>
          ) : null}
        </div>
      </Columns>

      <div className="h-10" />

      {picker ? (
        <GrillePicker
          grille={grille}
          onClose={() => setPicker(false)}
          onChoisir={(templateId) =>
            appeler("/api/sessions/inscrire", { templateId }, () =>
              setPicker(false)
            )
          }
          pending={pending}
        />
      ) : null}

      {saisie ? (
        <SaisieResultat
          tournoi={saisie}
          onClose={() => setSaisie(null)}
          onValider={(valeurs) =>
            appeler(
              "/api/sessions/resultat",
              { tournamentId: saisie.id, ...valeurs },
              () => setSaisie(null)
            )
          }
          pending={pending}
        />
      ) : null}
    </>
  );
}

function Erreur({ children }) {
  return (
    <p className="mb-3 rounded-tile border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
      {children}
    </p>
  );
}

function HistoriqueSessions({ sessions }) {
  return (
    <CardList>
      {sessions.map((s) => {
        const t = totauxSession(s.tournaments);
        return (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 px-4 py-3.5"
          >
            <div className="min-w-0">
              <p className="font-medium">{formatDate(s.startedAt)}</p>
              <p className="num text-sm text-ink-muted">
                {plural(t.total, "tournoi")} · {formatEuro(t.engage)} engagé
              </p>
            </div>
            <p className={`num shrink-0 font-semibold ${toneClass(t.net)}`}>
              {formatEuro(t.net, { sign: true })}
            </p>
          </div>
        );
      })}
    </CardList>
  );
}

/** Choix d'un tournoi dans la grille — un tap suffit à l'inscrire. */
function GrillePicker({ grille, onClose, onChoisir, pending }) {
  const [filtre, setFiltre] = useState("");

  const liste = useMemo(() => {
    const triee = trierGrille(grille);
    const q = filtre.trim().toLowerCase();
    if (!q) return triee;
    return triee.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.siteName.toLowerCase().includes(q)
    );
  }, [grille, filtre]);

  return (
    <Feuille titre="Inscrire un tournoi" onClose={onClose}>
      <label className="relative mb-3 block">
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="text"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          placeholder="Chercher dans la grille"
          autoFocus
          className="min-h-[48px] w-full rounded-tile border border-line bg-surface-2 pl-11 pr-4 text-base"
        />
      </label>

      {liste.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-ink-muted">
          Aucun tournoi ne correspond.
        </p>
      ) : (
        <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto rounded-card border border-line bg-surface">
          {liste.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onChoisir(m.id)}
                disabled={pending}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{m.name}</p>
                  <p className="truncate text-sm text-ink-muted">
                    {m.siteName} · {FORMAT_LABELS[m.format]}
                    {m.speed !== "NORMAL" ? ` · ${SPEED_LABELS[m.speed]}` : ""}
                    {m.usualHour !== null ? ` · ~${m.usualHour} h` : ""}
                  </p>
                </div>
                <span className="num shrink-0 font-semibold">
                  {formatEuro(m.cout)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Feuille>
  );
}

/** Saisie du résultat à la sortie du tournoi. */
function SaisieResultat({ tournoi, onClose, onValider, pending }) {
  const [place, setPlace] = useState("");
  const [gain, setGain] = useState("");
  const [primes, setPrimes] = useState("");
  const [reEntries, setReEntries] = useState(0);

  const estKo = tournoi.format === "KO";

  function valider(e) {
    e.preventDefault();
    onValider({
      finishPosition: place,
      prize: gain,
      bountiesWon: estKo ? primes : 0,
      reEntries,
    });
  }

  return (
    <Feuille titre={tournoi.name} onClose={onClose}>
      <form onSubmit={valider}>
        <p className="mb-4 text-sm text-ink-muted">
          {tournoi.siteName} · {FORMAT_LABELS[tournoi.format]} ·{" "}
          <span className="num">{formatEuro(tournoi.totalCost)}</span> engagé
        </p>

        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <Champ label="Place" value={place} onChange={setPlace} inputMode="numeric" placeholder="ex. 142" autoFocus />
          <Champ label="Gain (€)" value={gain} onChange={setGain} inputMode="decimal" placeholder="0" />
        </div>

        {estKo ? (
          <div className="mb-4">
            <Champ
              label="Primes encaissées (€)"
              value={primes}
              onChange={setPrimes}
              inputMode="decimal"
              placeholder="0"
            />
          </div>
        ) : null}

        <p className="kicker mb-2">Re-entries</p>
        <div className="mb-5 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setReEntries(n)}
              aria-pressed={reEntries === n}
              className={`num min-h-[48px] rounded-tile border text-base ${
                reEntries === n
                  ? "border-rose-line bg-rose-bg text-ink"
                  : "border-line bg-surface-2 text-ink-section"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="-mt-3 mb-5 text-sm text-ink-muted">
          C&apos;est la seule donnée que les résumés de tournoi ne donnent pas.
        </p>

        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer le résultat"}
        </Button>
      </form>
    </Feuille>
  );
}

function Champ({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-muted">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="num min-h-[48px] w-full rounded-tile border border-line bg-surface-2 px-4 text-lg"
        {...rest}
      />
    </label>
  );
}

function Feuille({ titre, onClose, children }) {
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="truncate text-xl font-bold">{titre}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-2 grid size-11 shrink-0 place-items-center text-ink-muted"
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
