import Link from "next/link";

import {
  Screen,
  PageHeader,
  SectionTitle,
  Card,
  CardList,
  ProgressBar,
  Pill,
  StatusDot,
  Columns,
} from "@/components/ui";
import StudyLogger from "./StudyLogger";
import { getStudyOverview, DEMO } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Étude · Poker BRM" };

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

const SESSION_LABELS = {
  THEORIE: "Théorie",
  DRILL: "Drill",
  REVUE_MAINS: "Revue de mains",
  REVUE_BDD: "Revue de base",
};

function formatHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export default async function EtudePage() {
  const study = await getStudyOverview();
  const theme = study.currentTheme;
  const onTrack = study.minutesDone >= study.minutesTarget;

  return (
    <Screen width="wide">
      <PageHeader eyebrow={DEMO ? "Données d'exemple" : null} title="Étude" />

      <Columns>
        {/* Colonne gauche — où j'en suis */}
        <div>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-base text-ink-muted">Cette semaine</p>
              <Pill tone={onTrack ? "positive" : "neutral"}>
                <StatusDot tone={onTrack ? "positive" : "accent"} />
                {study.daysDone} / {study.daysTarget} jours
              </Pill>
            </div>

            <p className="num text-[2.25rem] font-bold leading-none lg:text-[2.75rem]">
              {formatHours(study.minutesDone)}
              <span className="ml-2 text-base font-normal text-ink-muted">
                / {formatHours(study.minutesTarget)}
              </span>
            </p>

            <div className="mt-4">
              <ProgressBar
                value={study.minutesDone}
                max={study.minutesTarget}
                tone={onTrack ? "bg-positive" : "bg-accent"}
              />
            </div>
          </Card>

          {theme ? (
            <>
              <SectionTitle>Thème de la semaine</SectionTitle>
              <Card className="p-4">
                {theme.block ? (
                  <p className="kicker mb-2">{theme.block}</p>
                ) : null}
                <h3 className="text-lg font-semibold">{theme.title}</h3>
                {theme.weekFrom ? (
                  <p className="mt-1 text-sm text-ink-muted">
                    Semaines {theme.weekFrom}
                    {theme.weekTo && theme.weekTo !== theme.weekFrom
                      ? `–${theme.weekTo}`
                      : ""}
                  </p>
                ) : null}

                {Array.isArray(theme.objectives) &&
                theme.objectives.length > 0 ? (
                  <ul className="mt-4 space-y-2.5">
                    {theme.objectives.map((o, i) => (
                      <li key={i} className="flex items-start gap-3 text-base">
                        <span
                          className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] border text-[11px] ${
                            o.done
                              ? "border-positive bg-positive text-[#06251a]"
                              : "border-line-strong"
                          }`}
                          aria-hidden
                        >
                          {o.done ? "✓" : ""}
                        </span>
                        <span
                          className={
                            o.done ? "text-ink-muted line-through" : ""
                          }
                        >
                          {o.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <Link
                  href="/ranges"
                  className="mt-4 inline-block min-h-[44px] pt-3 text-base font-medium text-accent"
                >
                  Ouvrir les ranges du thème →
                </Link>
              </Card>
            </>
          ) : null}

        </div>

        {/* Colonne droite — le journal */}
        <div>
          <SectionTitle tight>Journal d&apos;étude</SectionTitle>
          <StudyLogger themes={study.themes} demo={DEMO} />

          {study.sessions.length > 0 ? (
            <div className="mt-3">
              <CardList>
                {study.sessions.slice(0, 10).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {SESSION_LABELS[s.type] ?? s.type}
                      </p>
                      <p className="truncate text-sm text-ink-muted">
                        {formatDate(s.date)}
                        {s.notes ? ` · ${s.notes}` : ""}
                      </p>
                    </div>
                    <p className="num shrink-0 text-ink-section">
                      {formatHours(s.minutes)}
                    </p>
                  </div>
                ))}
              </CardList>
            </div>
          ) : null}

          <SectionTitle>Programme</SectionTitle>
          <CardList>
            {study.themes.map((t, i) => (
              <div key={t.id} className="flex items-start gap-3 px-4 py-3.5">
                <span className="num mt-0.5 text-[11px] tracking-widest text-ink-muted/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{t.title}</p>
                  {t.block ? (
                    <p className="text-sm text-ink-muted">{t.block}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </CardList>
        </div>
      </Columns>

      <div className="h-10" />
    </Screen>
  );
}
