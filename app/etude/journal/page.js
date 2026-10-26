import { History } from "lucide-react";

import { Card, SectionTitle, CardList, StatTile, EmptyState } from "@/components/ui";
import StudyLogger from "../StudyLogger";
import { getStudyOverview, DEMO } from "@/lib/data";
import { formatDate, formatDuree } from "@/lib/format";
import { STUDY_SESSION_TYPES } from "@/lib/constants";

export const metadata = { title: "Journal d'étude · Poker BRM" };

function libelleType(cle) {
  return STUDY_SESSION_TYPES.find((t) => t.key === cle)?.label ?? cle;
}

export default async function JournalPage() {
  const study = await getStudyOverview();
  const titres = new Map(study.themes.map((t) => [t.id, t.title]));

  const minutesTotal = study.sessions.reduce((s, x) => s + x.minutes, 0);
  const jours = new Set(
    study.sessions.map((s) => new Date(s.date).toDateString())
  ).size;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
      <div>
        <SectionTitle>Depuis le début</SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile
            index={1}
            label="Temps total"
            value={formatDuree(minutesTotal)}
          />
          <StatTile index={2} label="Jours" value={jours} />
          <StatTile index={3} label="Sessions" value={study.sessions.length} />
        </div>

        <SectionTitle>Toutes les sessions</SectionTitle>
        {study.sessions.length === 0 ? (
          <EmptyState
            icon={History}
            title="Journal vide"
            description="Note une session dès que tu travailles : c'est ce qui alimente la jauge de la semaine et la répartition du temps."
          />
        ) : (
          <CardList>
            {study.sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-start justify-between gap-3 px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="font-medium">{libelleType(s.type)}</p>
                  <p className="truncate text-sm text-ink-muted">
                    {formatDate(s.date)}
                    {s.themeId && titres.has(s.themeId)
                      ? ` · ${titres.get(s.themeId)}`
                      : ""}
                  </p>
                  {s.notes ? (
                    <p className="mt-0.5 truncate text-sm text-ink-muted">
                      {s.notes}
                    </p>
                  ) : null}
                </div>
                <p className="num shrink-0 text-ink-section">
                  {formatDuree(s.minutes)}
                </p>
              </div>
            ))}
          </CardList>
        )}
      </div>

      <div className="max-lg:mt-6 lg:sticky lg:top-6">
        <SectionTitle tight>Noter une session</SectionTitle>
        <StudyLogger themes={study.themes} demo={DEMO} />

        <Card className="mt-3 p-4">
          <p className="kicker mb-2">Les cinquante dernières</p>
          <p className="text-sm leading-[var(--lh-normal)] text-ink-muted">
            Le journal garde les cinquante sessions les plus récentes. La
            semaine glissante de la vue d&apos;ensemble se calcule dessus.
          </p>
        </Card>
      </div>
    </div>
  );
}
