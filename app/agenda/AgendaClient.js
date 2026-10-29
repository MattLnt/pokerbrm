"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle } from "lucide-react";

import { SectionTitle, Card, Button } from "@/components/ui";
import { PLAN_KINDS, identiteCreneau } from "@/lib/constants";
import {
  graduations,
  position,
  texteDepuisMinutes,
  libelleCreneau,
  libelleJourGrille,
  libelleJourCourt,
  habitudes,
} from "@/lib/agenda";
import { formatDuree, plural } from "@/lib/format";
import JourFeuille from "./JourFeuille";

/**
 * L'agenda des trente jours à venir.
 *
 * Une ligne par jour, une piste horizontale par ligne : c'est la forme qui
 * répond à la question qu'on se pose devant un planning — « à quelle heure,
 * et combien de temps » —, là où une liste de créneaux ne montre ni les trous
 * ni les soirées qui se chevauchent.
 *
 * Toutes les pistes partagent le même axe, calé sur ce qui est planifié : des
 * barres comparables d'une ligne à l'autre, sans la moitié de la largeur
 * perdue sur des heures où rien n'arrive.
 */
export default function AgendaClient({ data }) {
  const { jours, semaines, axe, resume, projets, depart, fin, demo } = data;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState(null);
  const [jourOuvert, setJourOuvert] = useState(null);

  const index = jours.findIndex((j) => j.jour === jourOuvert);
  const ouvert = index >= 0 ? jours[index] : null;
  // Les heures déjà posées servent à préremplir le formulaire ; elles ne
  // changent qu'au rafraîchissement des données.
  const defauts = useMemo(() => habitudes(jours), [jours]);

  function appeler(url, options, apres) {
    if (demo) {
      setErreur("Branche la base Railway pour enregistrer un créneau.");
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const res = await fetch(url, options);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErreur(j.error ?? "Opération impossible.");
        return;
      }
      apres?.();
      router.refresh();
    });
  }

  const envoyer = (corps, methode = "POST", apres) =>
    appeler(
      "/api/plan-blocks",
      {
        method: methode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      },
      apres
    );

  return (
    <>
      {erreur ? (
        <p className="mb-3 rounded-tile border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {erreur}
        </p>
      ) : null}

      {/* Les trois tuiles portent la couleur de chaque emploi : elles servent
          aussi de légende à la grille, juste en dessous. */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {PLAN_KINDS.map((k) => (
          <TuileEmploi
            key={k.key}
            identite={k}
            minutes={resume.parType[k.key]}
            moyenne={resume.moyennes[k.key]}
          />
        ))}
        <div className="rounded-tile border border-line bg-surface p-4">
          <p className="kicker mb-2.5">Jours planifiés</p>
          <p className="num text-xl font-bold leading-[var(--lh-tight)]">
            {resume.joursPlanifies}{" "}
            <span className="text-ink-muted">/ {resume.jours}</span>
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {formatDuree(resume.total)} en tout
          </p>
        </div>
      </div>

      {resume.conflits > 0 ? (
        <p className="mt-2.5 flex items-center gap-2.5 rounded-tile border border-warning/40 bg-warning/5 px-4 py-3.5 text-sm text-warning">
          <AlertTriangle size={17} className="shrink-0" />
          {plural(resume.conflits, "journée")} où deux créneaux se chevauchent.
        </p>
      ) : null}

      <SectionTitle
        action={
          <Button variant="primary" onClick={() => setJourOuvert(depart)}>
            <Plus size={18} />
            Ajouter un créneau
          </Button>
        }
      >
        30 jours glissants
      </SectionTitle>

      <p className="-mt-1.5 mb-3.5 text-sm text-ink-muted">
        D&apos;aujourd&apos;hui au {libelleJourCourt(fin)} — tape une journée
        pour la modifier.
      </p>

      <Card className="overflow-hidden">
        <AxeHeures axe={axe} />

        {semaines.map((semaine) => (
          <section key={semaine.lundi}>
            <header className="flex items-center gap-3 border-y border-line bg-surface-2/60 px-3 py-2">
              <p className="kicker shrink-0">
                Semaine du {libelleJourCourt(semaine.lundi)}
              </p>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                {PLAN_KINDS.filter((k) => semaine.parType[k.key] > 0).map((k) => (
                  <span
                    key={k.key}
                    className="flex items-center gap-1.5 text-sm text-ink-muted"
                  >
                    <Point couleur={k.couleur} />
                    <span className="num">{formatDuree(semaine.parType[k.key])}</span>
                    <span className="sr-only">de {k.label}</span>
                  </span>
                ))}
              </div>
            </header>

            <ul className="divide-y divide-line/60">
              {semaine.jours.map((j) => (
                <li key={j.jour}>
                  <LigneJour
                    jour={j}
                    axe={axe}
                    onOuvrir={() => setJourOuvert(j.jour)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Card>

      {ouvert ? (
        <JourFeuille
          jour={ouvert}
          source={sourceACopier(jours, index)}
          habitudes={defauts}
          projets={projets}
          pending={pending}
          premier={index === 0}
          dernier={index === jours.length - 1}
          onClose={() => setJourOuvert(null)}
          onEnregistrer={(valeurs, apres) =>
            envoyer(valeurs, valeurs.id ? "PATCH" : "POST", apres)
          }
          onSupprimer={(id) =>
            appeler(`/api/plan-blocks?id=${encodeURIComponent(id)}`, {
              method: "DELETE",
            })
          }
          onCopier={(de) => envoyer({ jour: ouvert.jour, copierDe: de })}
          onVider={() =>
            appeler(
              `/api/plan-blocks?jour=${encodeURIComponent(ouvert.jour)}`,
              { method: "DELETE" }
            )
          }
          onNaviguer={(pas) => {
            const voisin = jours[index + pas];
            if (voisin) setJourOuvert(voisin.jour);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * La journée à proposer en modèle : la dernière journée remplie avant
 * celle-ci. « La veille » serait vide une fois sur deux — on ne planifie pas
 * sept jours sur sept — et le bouton ne servirait à rien.
 */
function sourceACopier(jours, index) {
  if (index <= 0) return null;
  return (
    jours
      .slice(0, index)
      .reverse()
      .find((j) => j.blocs.length > 0)?.jour ?? null
  );
}

function Point({ couleur }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: couleur }}
      aria-hidden
    />
  );
}

function TuileEmploi({ identite, minutes, moyenne }) {
  return (
    <div
      className="rounded-tile border border-line bg-surface p-4"
      style={{ containerType: "inline-size" }}
    >
      {/* Le texte garde l'encre de l'interface : c'est la pastille qui porte
          la couleur, pas le chiffre — sinon rien ne se lit plus. */}
      <p className="kicker mb-2.5 flex items-center gap-2">
        <Point couleur={identite.couleur} />
        {identite.label}
      </p>
      <p className="num whitespace-nowrap text-[clamp(17px,5.5cqw,22px)] font-bold leading-[var(--lh-tight)]">
        {formatDuree(minutes)}
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        {minutes > 0 ? `${formatDuree(moyenne)} par semaine` : "rien de prévu"}
      </p>
    </div>
  );
}

/** Les trois colonnes d'une ligne : le jour, la piste, le total. */
const COL_JOUR = "w-[58px] shrink-0";
const COL_TOTAL = "hidden w-[56px] shrink-0 sm:block";

function AxeHeures({ axe }) {
  const amplitude = axe.fin - axe.debut;

  return (
    <div className="flex items-end gap-3 px-3 pb-1 pt-3">
      <span className={COL_JOUR} aria-hidden />
      <span className="relative block h-4 flex-1" aria-hidden>
        {graduations(axe).map((m) => (
          <span
            key={m}
            className="num absolute top-0 text-2xs text-ink-muted"
            style={{ left: `${((m - axe.debut) / amplitude) * 100}%` }}
          >
            {texteDepuisMinutes(m)}
          </span>
        ))}
      </span>
      <span className={COL_TOTAL} aria-hidden />
    </div>
  );
}

function LigneJour({ jour, axe, onOuvrir }) {
  const amplitude = axe.fin - axe.debut;
  const vide = jour.blocs.length === 0;

  const resume = vide
    ? "rien de prévu"
    : jour.blocs
        .map((b) => `${identiteCreneau(b.kind).label} ${libelleCreneau(b)}`)
        .join(", ");

  return (
    <button
      type="button"
      onClick={onOuvrir}
      aria-label={`${libelleJourGrille(jour.jour)} : ${resume}`}
      className={`group flex w-full items-center gap-3 px-3 py-1.5 text-left transition-colors hover:bg-surface-2 ${
        jour.weekend ? "bg-bg-sunken/40" : ""
      }`}
    >
      <span
        className={`${COL_JOUR} truncate text-sm ${
          jour.aujourdhui
            ? "font-bold text-accent-hover"
            : jour.weekend
              ? "text-ink-muted"
              : "text-ink-section"
        }`}
      >
        {jour.aujourdhui ? "Auj." : libelleJourGrille(jour.jour)}
      </span>

      <span className="relative block h-8 flex-1 overflow-hidden rounded-sm bg-bg-sunken ring-1 ring-inset ring-line">
        {graduations(axe).map((m) => (
          <span
            key={m}
            className="absolute inset-y-0 w-px bg-line"
            style={{ left: `${((m - axe.debut) / amplitude) * 100}%` }}
            aria-hidden
          />
        ))}

        {jour.blocs.map((b) => (
          <Creneau key={b.id} bloc={b} axe={axe} />
        ))}

        {vide ? (
          <span className="absolute inset-0 hidden place-items-center text-2xs text-ink-muted group-hover:grid">
            Ajouter un créneau
          </span>
        ) : null}
      </span>

      <span className={`${COL_TOTAL} text-right`}>
        {jour.conflit ? (
          <AlertTriangle
            size={15}
            className="ml-auto text-warning"
            aria-label="Deux créneaux se chevauchent"
          />
        ) : (
          <span className="num text-sm text-ink-muted">
            {vide ? "—" : formatDuree(jour.total)}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Un créneau sur la piste.
 *
 * L'étiquette est écrite dans la barre dès qu'elle y tient : la couleur ne
 * doit pas être seule à dire de quoi il s'agit. Elle disparaît sur les
 * barres trop courtes, et sur téléphone où la piste entière fait deux cents
 * pixels — restent alors l'infobulle, le libellé lu par les lecteurs
 * d'écran sur la ligne entière, et la feuille du jour.
 *
 * Le trait de 2 px retiré à droite laisse voir le fond entre deux créneaux
 * qui se suivent — sans lui, un grind collé à une étude feraient une seule
 * barre bicolore.
 */
function Creneau({ bloc, axe }) {
  const identite = identiteCreneau(bloc.kind);
  const { gauche, largeur } = position(bloc, axe);
  if (largeur <= 0) return null;

  return (
    <span
      title={`${identite.label} · ${libelleCreneau(bloc)}`}
      className="absolute inset-y-[3px] flex items-center overflow-hidden rounded-xs px-1.5 text-2xs font-bold"
      style={{
        left: `${gauche}%`,
        width: `max(3px, calc(${largeur}% - 2px))`,
        backgroundColor: identite.couleur,
        color: identite.fg,
      }}
    >
      {largeur >= 10 ? (
        <span className="hidden truncate sm:inline">{identite.pluriel}</span>
      ) : null}
    </span>
  );
}
