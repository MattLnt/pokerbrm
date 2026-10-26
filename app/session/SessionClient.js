"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Play,
  Plus,
  Square,
  SlidersHorizontal,
  Check,
  X,
} from "lucide-react";

import {
  Card,
  CardList,
  SectionTitle,
  Button,
  EmptyState,
  Pill,
  StatusDot,
} from "@/components/ui";
import GrillePicker from "@/components/GrillePicker";
import Feuille from "@/components/Feuille";
import SiteBadge from "@/components/SiteBadge";
import { totauxSession } from "@/lib/session";
import { FORMAT_LABELS, libelleVitesse } from "@/lib/constants";
import {
  formatEuro,
  formatPercent,
  formatDate,
  plural,
  toneClass,
} from "@/lib/format";

function duree(depuis) {
  const min = Math.floor((Date.now() - new Date(depuis).getTime()) / 60000);
  const h = Math.floor(min / 60);
  return h === 0 ? `${min} min` : `${h} h ${String(min % 60).padStart(2, "0")}`;
}

/**
 * Agencement pensé pour l'usage réel : pendant une session on regarde la
 * liste des tournois en jeu et on y saisit des résultats. Elle occupe donc
 * la plus grande surface, le résumé d'argent se réduit à une bande de
 * référence en haut, et l'inscription reste atteignable sans défiler.
 */
export default function SessionClient({ demo, session, grille, recentes }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState(null);
  const [picker, setPicker] = useState(false);
  const [saisie, setSaisie] = useState(null);

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
        method: "POST",
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

  /** Retire un tournoi inscrit par erreur. */
  function retirer(t) {
    if (demo) {
      setErreur("Branche la base Railway pour modifier une session.");
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/sessions/inscrire?id=${encodeURIComponent(t.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErreur(j.error ?? "Suppression impossible.");
        return;
      }
      router.refresh();
    });
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

  /* ================= aucune session ouverte ================= */

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
              className="mt-2 px-6"
              onClick={() => appeler("/api/sessions", {})}
              disabled={pending}
            >
              <Play size={18} />
              {pending ? "Ouverture…" : "Lancer une session"}
            </Button>
          }
        />

        <div className="mt-4 flex justify-center">
          <LienGrille />
        </div>

        {grille.length === 0 && !demo ? (
          <Card className="mt-4 border-warning/40 bg-warning/5 p-4 text-sm text-ink-muted">
            Ta grille est vide. Ajoute des tournois pour pouvoir t&apos;inscrire
            en un tap.
          </Card>
        ) : null}

        {recentes.length > 0 ? (
          <>
            <SectionTitle>Sessions précédentes</SectionTitle>
            <CardList>
              {recentes.map((s) => {
                const t = totauxSession(s.tournaments);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{formatDate(s.startedAt)}</p>
                      <p className="num text-sm text-ink-muted">
                        {plural(t.total, "tournoi")} · {formatEuro(t.engage)}{" "}
                        engagé
                      </p>
                    </div>
                    <p
                      className={`num shrink-0 font-semibold ${toneClass(t.net)}`}
                    >
                      {formatEuro(t.net, { sign: true })}
                    </p>
                  </div>
                );
              })}
            </CardList>
          </>
        ) : null}

        <div className="h-10" />
      </>
    );
  }

  /* ================= session ouverte ================= */

  return (
    <>
      {erreur ? <Erreur>{erreur}</Erreur> : null}

      {/* Bande de référence : les trois chiffres d'un coup d'œil, sans
          occuper un demi-écran comme avant. */}
      <Card tone="hero" className="mb-4 p-4 lg:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Pill tone="accent">
            <StatusDot tone="accent" />
            En cours · {duree(session.startedAt)}
          </Pill>
          <span className="num text-[var(--fs-sm)] text-ink-muted">
            {plural(totaux.total, "tournoi")}
            {totaux.enCours > 0 ? ` · ${totaux.enCours} en jeu` : ""}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Chiffre label="Engagé" valeur={formatEuro(totaux.engage)} fort />
          <Chiffre label="Récupéré" valeur={formatEuro(totaux.recupere)} />
          <Chiffre
            label="Net"
            valeur={formatEuro(totaux.net, { sign: true })}
            tone={toneClass(totaux.net)}
          />
        </div>

        {totaux.termines > 0 ? (
          <p className="num mt-4 border-t border-line/70 pt-3 text-[var(--fs-sm)] text-ink-muted">
            ROI {formatPercent(totaux.roi, { sign: true, decimals: 0 })} · ITM{" "}
            {formatPercent(totaux.itm, { decimals: 0 })} sur{" "}
            {plural(totaux.termines, "terminé")}
          </p>
        ) : null}
      </Card>

      {/* L'action principale, pleine largeur, avant la liste. */}
      <div className="mb-7 flex flex-col gap-2.5 sm:flex-row">
        <Button
          type="button"
          variant="primary"
          className="flex-1"
          onClick={() => setPicker(true)}
          disabled={pending}
        >
          <Plus size={19} />
          Inscrire des tournois
        </Button>
        <Button
          type="button"
          className="sm:w-auto sm:px-5"
          onClick={cloreSession}
          disabled={pending}
        >
          <Square size={15} />
          Terminer
        </Button>
      </div>

      {/* Le cœur de l'écran : ce qui est en jeu. */}
      <SectionTitle tight>En jeu · {enCours.length}</SectionTitle>

      {enCours.length === 0 ? (
        <Card className="px-4 py-8 text-center">
          <p className="text-[var(--fs-base)] text-ink-muted">
            Aucun tournoi en jeu.
          </p>
          <button
            type="button"
            onClick={() => setPicker(true)}
            className="mt-1 min-h-[44px] text-base font-medium text-accent"
          >
            Inscrire un tournoi →
          </button>
        </Card>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {enCours.map((t) => (
            <li key={t.id}>
              <Card className="flex h-full flex-col p-4">
                <div className="mb-3.5 flex items-start gap-3">
                  <SiteBadge slug={t.siteSlug} taille={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">
                      {t.name}
                    </p>
                    <p className="num mt-1 truncate text-[var(--fs-sm)] text-ink-muted">
                      {FORMAT_LABELS[t.format]}
                      {libelleVitesse(t) ? ` · ${libelleVitesse(t)}` : ""}
                    </p>
                  </div>
                  <span className="num shrink-0 font-bold">
                    {formatEuro(t.totalCost)}
                  </span>
                  <button
                    type="button"
                    onClick={() => retirer(t)}
                    disabled={pending}
                    aria-label={`Retirer ${t.name} de la session`}
                    title="Inscrit par erreur ?"
                    className="-mr-1.5 -mt-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted/60 transition-colors hover:bg-surface-3 hover:text-warning disabled:opacity-40"
                  >
                    <X size={15} />
                  </button>
                </div>

                <Button
                  type="button"
                  className="mt-auto w-full"
                  onClick={() => setSaisie(t)}
                >
                  Saisir le résultat
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {termines.length > 0 ? (
        <>
          <SectionTitle>Terminés · {termines.length}</SectionTitle>
          <CardList>
            {termines.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                <SiteBadge slug={t.siteSlug} taille={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.name}</p>
                  <p className="num truncate text-sm text-ink-muted">
                    {t.finishPosition ? `${t.finishPosition}e · ` : ""}
                    {formatEuro(t.totalCost)} engagé
                    {t.reEntries
                      ? ` · ${plural(t.reEntries, "re-entry", "re-entries")}`
                      : ""}
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

      <div className="mt-7 flex justify-center">
        <LienGrille />
      </div>

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

function Chiffre({ label, valeur, tone = "", fort = false }) {
  return (
    <div className="min-w-0">
      <p className="kicker mb-1.5 text-[var(--fs-overline)]">{label}</p>
      <p
        className={`num truncate font-bold leading-none ${
          fort
            ? "text-[var(--fs-xl)] lg:text-[var(--fs-2xl)]"
            : "text-[var(--fs-lg)] lg:text-[var(--fs-xl)]"
        } ${tone}`}
      >
        {valeur}
      </p>
    </div>
  );
}

function LienGrille() {
  return (
    <Link
      href="/session/grille"
      className="inline-flex min-h-[44px] items-center gap-2 text-[var(--fs-base)] font-medium text-ink-muted transition-colors hover:text-accent"
    >
      <SlidersHorizontal size={17} />
      Gérer la grille
    </Link>
  );
}

function Erreur({ children }) {
  return (
    <p className="mb-4 rounded-tile border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
      {children}
    </p>
  );
}

/** Saisie du résultat à la sortie du tournoi. */
function SaisieResultat({ tournoi, onClose, onValider, pending }) {
  const [place, setPlace] = useState("");
  const [gain, setGain] = useState("");
  const [primes, setPrimes] = useState("");
  const [reEntries, setReEntries] = useState(0);

  // Mystery et Space KO sont des KO particuliers : ils rapportent des primes.
  const aPrimes = ["KO", "MYSTERY", "SPACE_KO"].includes(tournoi.format);

  return (
    <Feuille titre={tournoi.name} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onValider({
            finishPosition: place,
            prize: gain,
            bountiesWon: aPrimes ? primes : 0,
            reEntries,
          });
        }}
      >
        <div className="mb-5 flex items-center gap-3 rounded-tile border border-line bg-surface-2 p-3">
          <SiteBadge slug={tournoi.siteSlug} taille={32} />
          <p className="num text-sm text-ink-muted">
            {FORMAT_LABELS[tournoi.format]}
            {libelleVitesse(tournoi) ? ` · ${libelleVitesse(tournoi)}` : ""} ·{" "}
            <span className="text-ink-section">
              {formatEuro(tournoi.totalCost)}
            </span>{" "}
            engagé
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <Champ
            label="Place"
            value={place}
            onChange={setPlace}
            inputMode="numeric"
            placeholder="142"
            autoFocus
          />
          <Champ
            label="Gain (€)"
            value={gain}
            onChange={setGain}
            inputMode="decimal"
            placeholder="0"
          />
        </div>

        {aPrimes ? (
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
        <div className="mb-2 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setReEntries(n)}
              aria-pressed={reEntries === n}
              className={`num flex min-h-[48px] items-center justify-center gap-1.5 rounded-tile border text-base transition-colors ${
                reEntries === n
                  ? "border-rose-line bg-rose-bg text-rose-hover"
                  : "border-line bg-surface-2 text-ink-section"
              }`}
            >
              {reEntries === n ? <Check size={14} strokeWidth={3} /> : null}
              {n}
            </button>
          ))}
        </div>
        <p className="mb-5 text-sm text-ink-muted">
          C&apos;est la seule donnée que les résumés de tournoi ne donnent pas.
        </p>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={pending}
        >
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
        className="bd-input num text-[var(--fs-lg)]"
        {...rest}
      />
    </label>
  );
}
