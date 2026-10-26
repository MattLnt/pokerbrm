import Link from "next/link";

import {
  SectionTitle,
  Card,
  ProgressBar,
  Pill,
  StatusDot,
  StatTile,
} from "@/components/ui";
import { getStudyOverview, getWeakSpots, DEMO } from "@/lib/data";
import { formatDuree } from "@/lib/format";
import { STUDY_SESSION_TYPES } from "@/lib/constants";

export const metadata = { title: "Étude · Poker BRM" };

// Deux lettres : « M » seul ne distingue pas mardi de mercredi, et la
// barre de régularité ne sert à rien si on ne sait pas quel jour on lit.
const JOURS = ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"];

/**
 * Barre de régularité : sept colonnes, une par jour.
 *
 * Le total hebdomadaire cache le rythme — cinq heures faites d'un bloc le
 * dimanche ne valent pas cinq heures étalées. C'est la forme de la semaine
 * qu'on vient lire ici, pas son volume.
 */
function Regularite({ jours, cibleParJour }) {
  const plafond = Math.max(cibleParJour, ...jours.map((j) => j.minutes), 1);

  return (
    <div className="flex items-end gap-1.5">
      {jours.map((jour) => {
        const hauteur = Math.round((jour.minutes / plafond) * 100);
        const atteint = jour.minutes >= cibleParJour;
        return (
          <div key={jour.date.toISOString()} className="flex-1 text-center">
            <div
              className="relative mb-1.5 h-16 overflow-hidden rounded-xs bg-bg-sunken ring-1 ring-inset ring-line"
              title={`${formatDuree(jour.minutes)}`}
            >
              <div
                className={`absolute inset-x-0 bottom-0 ${
                  atteint ? "bg-positive" : "bg-accent"
                }`}
                style={{ height: `${hauteur}%` }}
              />
            </div>
            <span className="num text-[var(--fs-overline)] text-ink-muted">
              {JOURS[jour.date.getDay()]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default async function EtudePage() {
  const study = await getStudyOverview();
  const weakSpots = await getWeakSpots();
  const theme = study.currentTheme;
  const dansLesClous = study.minutesDone >= study.minutesTarget;

  const objectifs = Array.isArray(theme?.objectives) ? theme.objectives : [];
  const faits = objectifs.filter((o) => o.done).length;
  const spotLePlusFaible = weakSpots[0] ?? null;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
      {/* Colonne principale — l'état de la semaine */}
      <div>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="kicker">Cette semaine</p>
            <Pill tone={dansLesClous ? "positive" : "neutral"}>
              <StatusDot tone={dansLesClous ? "positive" : "accent"} />
              {study.daysDone} / {study.daysTarget} jours
            </Pill>
          </div>

          <p className="num text-[var(--fs-2xl)] font-bold leading-[var(--lh-tight)]">
            {formatDuree(study.minutesDone)}
            <span className="ml-2 text-base font-normal text-ink-muted">
              / {formatDuree(study.minutesTarget)}
            </span>
          </p>

          <div className="mt-4">
            <ProgressBar
              value={study.minutesDone}
              max={study.minutesTarget}
              tone={dansLesClous ? "positive" : "accent"}
            />
          </div>

          <div className="mt-5">
            <p className="kicker mb-2.5">Régularité</p>
            <Regularite
              jours={study.joursSemaine}
              cibleParJour={study.minutesPerDay}
            />
          </div>
        </Card>

        <SectionTitle>Où part le temps</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {STUDY_SESSION_TYPES.map((type, i) => (
            <StatTile
              key={type.key}
              index={i + 1}
              label={type.label}
              value={formatDuree(study.parType[type.key] ?? 0)}
            />
          ))}
        </div>

        {theme ? (
          <>
            <SectionTitle
              action={
                <Link
                  href="/etude/programme"
                  className="text-sm font-medium text-accent-hover"
                >
                  Modifier →
                </Link>
              }
            >
              Thème de la semaine
            </SectionTitle>
            <Card className="p-4">
              {theme.block ? <p className="kicker mb-2">{theme.block}</p> : null}
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-xl font-semibold tracking-[var(--ls-heading)]">
                  {theme.title}
                </h3>
                {objectifs.length > 0 ? (
                  <span className="num text-sm text-ink-muted">
                    {faits} / {objectifs.length} objectifs
                  </span>
                ) : null}
              </div>
              {theme.weekFrom ? (
                <p className="mt-1 text-sm text-ink-muted">
                  Semaines {theme.weekFrom}
                  {theme.weekTo && theme.weekTo !== theme.weekFrom
                    ? `–${theme.weekTo}`
                    : ""}
                </p>
              ) : null}

              {objectifs.length > 0 ? (
                <ul className="mt-4 space-y-2.5">
                  {objectifs.map((o, i) => (
                    <li key={i} className="flex items-start gap-3 text-base">
                      <span
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-xs border text-[var(--fs-xs)] ${
                          o.done
                            ? "border-positive bg-positive text-accent-fg"
                            : "border-line-strong"
                        }`}
                        aria-hidden
                      >
                        {o.done ? "✓" : ""}
                      </span>
                      <span className={o.done ? "text-ink-muted line-through" : ""}>
                        {o.label}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          </>
        ) : null}
      </div>

      {/* Colonne des raccourcis — ce qui attend */}
      <div className="max-lg:mt-0 lg:sticky lg:top-6">
        <SectionTitle tight>Ce qui attend</SectionTitle>
        <div className="grid gap-2.5">
          <Card
            as={Link}
            href="/etude/revue"
            liftable
            className="flex items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-medium">Mains à revoir</p>
              <p className="text-sm text-ink-muted">
                {study.aRevoir === 0
                  ? "Rien en attente"
                  : `${study.aRevoir} en attente`}
              </p>
            </div>
            <span
              className={`num text-[var(--fs-xl)] font-bold ${
                study.aRevoir > 0 ? "text-negative" : "text-ink-muted"
              }`}
            >
              {study.aRevoir}
            </span>
          </Card>

          {spotLePlusFaible ? (
            <Card
              as={Link}
              href="/etude/faiblesses"
              liftable
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{spotLePlusFaible.spot}</p>
                <p className="text-sm text-ink-muted">Ton spot le plus faible</p>
              </div>
              <span className="num shrink-0 text-[var(--fs-xl)] font-bold text-warning">
                {spotLePlusFaible.success} %
              </span>
            </Card>
          ) : null}

          <Card
            as={Link}
            href="/etude/journal"
            liftable
            className="flex items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-medium">Noter une session</p>
              <p className="text-sm text-ink-muted">
                {study.sessions.length === 0
                  ? "Aucune session"
                  : `${study.sessions.length} au journal`}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
