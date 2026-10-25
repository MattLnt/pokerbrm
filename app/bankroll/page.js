import Link from "next/link";
import { Suspense } from "react";
import { Download } from "lucide-react";

import {
  Screen,
  PageHeader,
  SectionTitle,
  Card,
  CardList,
  Pill,
  StatusDot,
  StatTile,
  ProgressBar,
  Sparkline,
  Columns,
} from "@/components/ui";
import PeriodSelect from "@/components/PeriodSelect";
import BreakdownTabs from "@/components/BreakdownTabs";
import { getBankrollOverview, getBreakdown } from "@/lib/data";
import { PERIODS, TRANSACTION_LABELS } from "@/lib/constants";
import {
  formatEuro,
  formatPercent,
  formatRelativeDays,
  formatDate,
  plural,
  toneClass,
} from "@/lib/format";

export const metadata = { title: "Bankroll · Poker BRM" };

// Données propres à l'utilisateur : jamais figées au moment du build.
export const dynamic = "force-dynamic";

const STALE_DAYS = 7;

function isStale(lastImportAt) {
  if (!lastImportAt) return true;
  return Date.now() - new Date(lastImportAt).getTime() > STALE_DAYS * 86400000;
}

export default async function BankrollPage({ searchParams }) {
  const params = await searchParams;
  const periodKey = PERIODS.some((p) => p.key === params?.periode)
    ? params.periode
    : "30";

  const data = await getBankrollOverview(periodKey);
  const [byFormat, byBuyin, bySite] = await Promise.all([
    getBreakdown(periodKey, "format"),
    getBreakdown(periodKey, "buyin"),
    getBreakdown(periodKey, "site"),
  ]);

  const periodLabel = PERIODS.find((p) => p.key === periodKey)?.label;

  return (
    <Screen width="wide">
      <PageHeader
        eyebrow={data.demo ? "Données d'exemple" : null}
        title="Bankroll"
        action={
          <Link
            href="/bankroll/import"
            aria-label="Importer des historiques"
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-tile bg-accent font-semibold text-[#08121f] max-lg:w-12 lg:px-5"
          >
            <Download size={22} />
            <span className="max-lg:hidden">Importer</span>
          </Link>
        }
      />

      <Columns>
        {/* Colonne gauche — où en est la bankroll */}
        <div className="contents lg:block">
          <div className="order-1">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-base text-ink-muted">Bankroll totale</p>
              <Suspense fallback={null}>
                <PeriodSelect value={periodKey} />
              </Suspense>
            </div>

            <p className="num text-[2.75rem] font-bold leading-none lg:text-[3.25rem]">
              {formatEuro(data.bankroll)}
            </p>

            <p className="mt-3 text-base">
              <span
                className={`num font-semibold ${toneClass(data.results.variation)}`}
              >
                {formatEuro(data.results.variation, { sign: true })}
              </span>{" "}
              <span className="text-ink-muted">
                dont {formatEuro(data.results.offGame, { sign: true })} rakeback
                et bonus
              </span>
            </p>

            <div className="mt-4">
              <Sparkline points={data.curve} />
            </div>
          </Card>
          </div>

          <div className="order-2">
          <SectionTitle>Par site</SectionTitle>
          <CardList>
            {data.bySite.map((site) => {
              const stale = isStale(site.lastImportAt);
              return (
                <div
                  key={site.slug}
                  className="flex items-center justify-between gap-3 px-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{site.name}</p>
                    <p
                      className={`text-sm ${
                        stale ? "text-warning" : "text-ink-muted"
                      }`}
                    >
                      Import {formatRelativeDays(site.lastImportAt)}
                      {stale
                        ? " · à mettre à jour"
                        : ` · ${plural(site.tournamentCount, "tournoi")}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num text-lg font-bold">
                      {formatEuro(site.balance)}
                    </p>
                    <p className={`num text-sm ${toneClass(site.variation)}`}>
                      {formatEuro(site.variation, { sign: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardList>
          </div>

          {/* Remonté après les résultats sur mobile, comme sur la maquette. */}
          <div className="order-5">
          <SectionTitle>Derniers mouvements</SectionTitle>
          {data.movements.length === 0 ? (
            <Card className="px-4 py-5 text-center text-sm text-ink-muted">
              Aucun mouvement enregistré.
            </Card>
          ) : (
            <CardList>
              {data.movements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{TRANSACTION_LABELS[m.type]}</p>
                    <p className="text-sm text-ink-muted">
                      {m.site} · {formatDate(m.date)}
                      {m.note ? ` · ${m.note}` : ""}
                    </p>
                  </div>
                  <p
                    className={`num shrink-0 font-semibold ${toneClass(m.amount)}`}
                  >
                    {formatEuro(m.amount, { sign: true })}
                  </p>
                </div>
              ))}
            </CardList>
          )}
          </div>
        </div>

        {/* Colonne droite — ce qu'on en fait */}
        <div className="contents lg:block">
          <div className="order-3">
          <SectionTitle
            tight
            action={
              data.compliance.compliant ? (
                <Pill tone="positive">
                  <StatusDot tone="positive" />
                  Dans les clous
                </Pill>
              ) : (
                <Pill tone="warning">
                  <StatusDot tone="warning" />
                  Au-dessus de la limite
                </Pill>
              )
            }
          >
            Règles de buy-in
          </SectionTitle>

          <div className="grid grid-cols-3 gap-2.5">
            {data.limits.map((limit, i) => (
              <StatTile
                key={limit.format}
                index={i + 1}
                label={limit.label}
                value={formatEuro(limit.maxBuyIn)}
                sub={`max · ${limit.buyIns} caves`}
              />
            ))}
          </div>

          {data.level.next ? (
            <Card className="mt-2.5 p-4">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <p className="font-medium">
                  Prochain palier : ABI {formatEuro(data.level.next.targetAbi)}
                </p>
                <p className="num shrink-0 text-sm text-ink-muted">
                  {formatEuro(data.bankroll)} / {formatEuro(data.level.required)}
                </p>
              </div>
              <ProgressBar value={data.bankroll} max={data.level.required} />
              {data.level.stopLoss !== null ? (
                <p className="mt-3 text-sm text-ink-muted">
                  Descente si la bankroll passe sous{" "}
                  <span className="num">{formatEuro(data.level.stopLoss)}</span>
                </p>
              ) : null}
            </Card>
          ) : null}
          </div>

          <div className="order-4">
          <SectionTitle>Résultats · {periodLabel}</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
            <StatTile
              label="Profit de jeu"
              value={formatEuro(data.results.gameProfit, { sign: true })}
              tone={toneClass(data.results.gameProfit)}
            />
            <StatTile
              label="Rakeback et bonus"
              value={formatEuro(data.results.offGame, { sign: true })}
            />
            <StatTile
              label="ROI"
              value={formatPercent(data.results.roi, { sign: true })}
              tone={toneClass(data.results.roi)}
            />
            <StatTile label="ITM" value={formatPercent(data.results.itm)} />
          </div>

          <div className="mt-2.5">
            <BreakdownTabs
              data={{ format: byFormat, buyin: byBuyin, site: bySite }}
            />
          </div>
          </div>
        </div>
      </Columns>

      <div className="h-10" />
    </Screen>
  );
}
