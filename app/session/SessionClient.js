"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, Square, Settings2 } from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardList,
  SectionTitle,
  Button,
  StatTile,
  EmptyState,
  Columns,
  Pill,
  StatusDot,
} from "@/components/ui";
import GrillePicker from "@/components/GrillePicker";
import Feuille from "@/components/Feuille";
import SiteBadge from "@/components/SiteBadge";
import { totauxSession } from "@/lib/session";
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

        <div className="mt-3 text-center">
          <Link
            href="/session/grille"
            className="inline-flex min-h-[44px] items-center gap-2 text-base font-medium text-accent"
          >
            <Settings2 size={18} />
            Gérer la grille
          </Link>
        </div>

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
          <Card tone="hero" className="p-5 lg:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Pill tone="accent">
                <StatusDot tone="accent" />
                En cours · {duree(session.startedAt)}
              </Pill>
              <span className="num text-[0.8125rem] text-ink-muted">
                {plural(totaux.total, "tournoi")}
              </span>
            </div>

            <p className="kicker mb-2">Engagé</p>
            <p className="chiffre-hero text-[3rem] lg:text-[3.75rem]">
              {formatEuro(totaux.engage)}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line/70 pt-4">
              <div>
                <p className="kicker mb-1.5 text-[0.625rem]">Récupéré</p>
                <p className="num text-lg font-bold">
                  {formatEuro(totaux.recupere)}
                </p>
              </div>
              <div>
                <p className="kicker mb-1.5 text-[0.625rem]">Net</p>
                <p className={`num text-lg font-bold ${toneClass(totaux.net)}`}>
                  {formatEuro(totaux.net, { sign: true })}
                </p>
              </div>
            </div>

            {totaux.enCours > 0 ? (
              <p className="mt-4 text-[0.8125rem] text-ink-muted">
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

          <Link
            href="/session/grille"
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 text-base font-medium text-accent"
          >
            <Settings2 size={18} />
            Gérer la grille
          </Link>
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
                  <div className="flex min-w-0 items-center gap-3">
                    <SiteBadge slug={t.siteSlug} taille={34} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.name}</p>
                      <p className="num text-sm text-ink-muted">
                        {formatEuro(t.totalCost)}
                      </p>
                    </div>
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
          onInscrire={(templateIds) =>
            appeler("/api/sessions/inscrire", { templateIds }, () =>
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
