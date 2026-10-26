import Link from "next/link";
import { AlertTriangle, Target } from "lucide-react";

import {
  Screen,
  PageHeader,
  SectionTitle,
  Card,
  CardList,
  Button,
  ProgressBar,
  Columns,
} from "@/components/ui";
import { getDashboard } from "@/lib/data";
import { formatEuro, formatPercent, toneClass } from "@/lib/format";

export const metadata = { title: "Accueil · Poker BRM" };

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

function formatHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export default async function HomePage() {
  const data = await getDashboard();
  const { study } = data;
  const hasWeakSpots = data.weakSpots.length > 0;

  return (
    <Screen width="wide">
      <PageHeader
        eyebrow={data.demo ? "Données d'exemple" : null}
        title="Accueil"
      />

      <Columns>
        {/* Colonne gauche — l'argent */}
        <div>
          <Card as={Link} href="/bankroll" className="block p-5">
            <p className="mb-2 text-base text-ink-muted">Bankroll totale</p>
            <p className="num text-[var(--fs-2xl)] font-bold leading-[var(--lh-tight)] lg:text-[var(--fs-3xl)]">
              {formatEuro(data.bankroll)}
            </p>
            <p className={`num mt-2 font-semibold ${toneClass(data.variation)}`}>
              {formatEuro(data.variation, { sign: true })}
              <span className="ml-2 font-normal text-ink-muted">
                sur 30 jours
              </span>
            </p>
          </Card>

          {data.staleSites.length > 0 ? (
            <Card className="mt-2.5 border-warning/40 bg-warning/5 p-4">
              <p className="mb-1.5 flex items-center gap-2 font-semibold text-warning">
                <AlertTriangle size={18} />
                Import à faire
              </p>
              <p className="text-sm text-ink-muted">
                {data.staleSites.map((s) => s.name).join(", ")} —{" "}
                {data.staleSites.length > 1 ? "pas importés" : "pas importé"}{" "}
                depuis plus de 7 jours.
              </p>
              <Link
                href="/bankroll/import"
                className="mt-3 inline-block min-h-[44px] pt-3 text-base font-medium text-accent"
              >
                Importer maintenant →
              </Link>
            </Card>
          ) : null}
        </div>

        {/* Colonne droite — le travail */}
        <div>
          <SectionTitle tight>Étude de la semaine</SectionTitle>
          <Card className="p-4">
            {study.currentTheme ? (
              <>
                {study.currentTheme.block ? (
                  <p className="kicker mb-2">{study.currentTheme.block}</p>
                ) : null}
                <h3 className="mb-3 text-lg font-semibold">
                  {study.currentTheme.title}
                </h3>
              </>
            ) : (
              <p className="mb-3 text-base text-ink-muted">
                Aucun thème défini pour l&apos;instant.
              </p>
            )}

            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="text-ink-muted">Temps fait</span>
              <span className="num text-ink">
                {formatHours(study.minutesDone)} /{" "}
                {formatHours(study.minutesTarget)}
              </span>
            </div>
            <ProgressBar value={study.minutesDone} max={study.minutesTarget} />

            <Link
              href="/etude"
              className="mt-3 inline-block min-h-[44px] pt-3 text-base font-medium text-accent"
            >
              Ouvrir le plan d&apos;étude →
            </Link>
          </Card>

          <SectionTitle>Spots les plus faibles</SectionTitle>
          {!hasWeakSpots ? (
            <Card className="px-4 py-5 text-center text-sm text-ink-muted">
              Pas encore assez de drills pour dégager une tendance.
            </Card>
          ) : (
            <>
              <CardList>
                {data.weakSpots.map((s, i) => (
                  <div
                    key={s.spot}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="num mt-0.5 text-[var(--fs-xs)] tracking-widest text-ink-muted/60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.spot}</p>
                        <p className="num text-sm text-ink-muted">
                          {s.attempts} mains
                        </p>
                      </div>
                    </div>
                    <p
                      className={`num shrink-0 font-semibold ${
                        s.success < 65 ? "text-warning" : "text-ink-section"
                      }`}
                    >
                      {formatPercent(s.success, { decimals: 0 })}
                    </p>
                  </div>
                ))}
              </CardList>

              <Button
                as={Link}
                href="/trainer"
                variant="primary"
                className="mt-3 w-full"
              >
                <Target size={18} />
                Lancer un drill sur ce spot
              </Button>
            </>
          )}
        </div>
      </Columns>

      <div className="h-10" />
    </Screen>
  );
}
