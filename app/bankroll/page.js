import Link from "next/link";
import { Suspense } from "react";
import { Download, Lock } from "lucide-react";

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
import SiteBadge from "@/components/SiteBadge";
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

/**
 * Le palier d'une room : son plafond, l'échelle complète, et ce qu'il reste
 * à faire pour monter ou ce qu'on perd en descendant.
 */
function PalierRoom({ site }) {
  const { palier } = site;
  return (
    <Card className="p-4">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SiteBadge slug={site.slug} taille={30} />
          <p className="truncate font-semibold">{site.name}</p>
        </div>
        {palier.compliant ? null : (
          <Pill tone="warning">
            <StatusDot tone="warning" />
            {plural(palier.offenders.length, "écart")}
          </Pill>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div>
          <p className="kicker mb-1.5">Buy-in max</p>
          <p className="chiffre-hero text-2xl">
            {formatEuro(palier.buyInMax)}
          </p>
        </div>
        {/* Toute l'échelle, pas seulement le palier courant : on voit d'un
            coup ce qui est ouvert et ce qui attend. */}
        <div className="flex flex-wrap gap-2">
          {palier.echelle.map((p) => (
            <Pill key={p.buyInMax} tone={p.autorise ? "accent" : "neutral"}>
              {p.autorise ? null : <Lock size={13} aria-hidden />}
              {formatEuro(p.buyInMax)}
            </Pill>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {palier.next ? (
          <>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="text-sm text-ink-muted">
                Palier suivant : buy-in{" "}
                <span className="num text-ink-section">
                  {formatEuro(palier.next.buyInMax)}
                </span>
              </p>
              <p className="num shrink-0 text-sm text-ink-muted">
                {formatEuro(site.balance)} / {formatEuro(palier.required)}
              </p>
            </div>
            <ProgressBar value={site.balance} max={palier.required} />
          </>
        ) : (
          <p className="text-sm text-ink-muted">Dernier palier atteint.</p>
        )}
        {palier.stopLoss !== null ? (
          <p className="mt-3 text-sm text-ink-muted">
            Retour au buy-in{" "}
            <span className="num">{formatEuro(palier.fallbackBuyIn)}</span> sous{" "}
            <span className="num">{formatEuro(palier.stopLoss)}</span>
          </p>
        ) : null}
      </div>
    </Card>
  );
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
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-tile bg-accent font-semibold text-accent-fg max-lg:w-12 lg:px-5"
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
          <Card tone="hero" className="overflow-hidden">
            <div className="p-5 pb-0 lg:p-6 lg:pb-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="kicker">Bankroll totale</p>
                <Suspense fallback={null}>
                  <PeriodSelect value={periodKey} />
                </Suspense>
              </div>

              <p className="chiffre-hero text-3xl lg:text-4xl">
                {formatEuro(data.bankroll)}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <Pill tone={data.results.variation >= 0 ? "positive" : "warning"}>
                  {formatEuro(data.results.variation, { sign: true })}
                </Pill>
                <span className="text-base text-ink-muted">
                  dont{" "}
                  <span className="num text-ink-section">
                    {formatEuro(data.results.offGame, { sign: true })}
                  </span>{" "}
                  rakeback et bonus
                </span>
              </div>
            </div>

            {/* La courbe mord sur les bords de la carte : elle est le fond. */}
            <div className="-mb-px mt-5">
              <Sparkline
                points={data.curve}
                tone={
                  data.results.variation >= 0 ? "#34d399" : "#fb7185"
                }
              />
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
                  <div className="flex min-w-0 items-center gap-3.5">
                    <SiteBadge slug={site.slug} taille={38} />
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
                    <p className="font-medium">
                      {m.versSite ? "Transfert" : TRANSACTION_LABELS[m.type]}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {m.versSite ? `${m.site} → ${m.versSite}` : m.site} ·{" "}
                      {formatDate(m.date)}
                      {m.note ? ` · ${m.note}` : ""}
                    </p>
                  </div>
                  {/* Un transfert ne gagne ni ne perd rien : ni vert, ni
                      rouge, ni signe — la bankroll totale n'a pas bougé. */}
                  <p
                    className={`num shrink-0 font-semibold ${
                      m.versSite ? "text-ink-section" : toneClass(m.amount)
                    }`}
                  >
                    {formatEuro(m.amount, { sign: !m.versSite })}
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

          {/* Un bloc par room : la gestion de bankroll est par room, c'est
              son solde qui ouvre ses paliers. */}
          <div className="grid gap-2.5">
            {data.bySite.map((site) => (
              <PalierRoom key={site.slug} site={site} />
            ))}
          </div>
          </div>

          <div className="order-4">
          <SectionTitle>Résultats · {periodLabel}</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
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
