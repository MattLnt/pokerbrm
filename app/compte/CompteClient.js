"use client";

import { Suspense, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  SlidersHorizontal,
  ChevronRight,
  Wallet,
} from "lucide-react";

import {
  Screen,
  PageHeader,
  SectionTitle,
  Card,
  CardList,
  Columns,
  StatTile,
  Pill,
  ProgressBar,
  Sparkline,
  EmptyState,
  Button,
} from "@/components/ui";
import MoisSelect from "@/components/MoisSelect";
import { IconeBouton } from "@/components/champs";
import { libelleCategorie, ORIGINES_COMPTE } from "@/lib/constants";
import { libelleMois } from "@/lib/compte";
import {
  formatEuro,
  formatPercent,
  formatDate,
  plural,
  toneClass,
} from "@/lib/format";
import { MouvementFeuille, ChargesFeuille, OuvertureFeuille } from "./Feuilles";

const FILTRES = [
  { key: "tous", label: "Tout" },
  { key: "INCOME", label: "Entrées" },
  { key: "EXPENSE", label: "Dépenses" },
];

export default function CompteClient({ data }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState(null);
  const [filtre, setFiltre] = useState("tous");
  // `{}` pour un ajout, le mouvement lui-même pour une modification.
  const [edition, setEdition] = useState(null);
  const [feuille, setFeuille] = useState(null); // "charges" | "ouverture"

  const mouvements = useMemo(
    () =>
      filtre === "tous"
        ? data.mouvements
        : data.mouvements.filter((m) => m.flow === filtre),
    [data.mouvements, filtre]
  );

  function appeler(url, options, apres) {
    if (data.demo) {
      setErreur("Branche la base Railway pour enregistrer un mouvement.");
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

  function enregistrerMouvement(valeurs) {
    appeler(
      "/api/bank-entries",
      {
        method: valeurs.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valeurs),
      },
      () => setEdition(null)
    );
  }

  function supprimerMouvement(m) {
    appeler(`/api/bank-entries?id=${encodeURIComponent(m.id)}`, {
      method: "DELETE",
    });
  }

  const { resume } = data;
  // Part du mois déjà dépensée par rapport à ce qui est entré : la barre dit
  // d'un coup d'œil si le mois se tient ou s'il mange le solde.
  const partDepensee =
    resume.entrees > 0 ? (resume.depenses / resume.entrees) * 100 : 0;

  return (
    <Screen width="wide">
      <PageHeader
        eyebrow={data.demo ? "Données d'exemple" : null}
        title="Compte"
        action={
          <button
            type="button"
            onClick={() => setEdition({})}
            aria-label="Ajouter un mouvement"
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-tile bg-accent font-semibold text-accent-fg transition-colors hover:bg-accent-hover max-lg:w-12 lg:px-5"
          >
            <Plus size={22} />
            <span className="max-lg:hidden">Ajouter</span>
          </button>
        }
      />

      {erreur ? (
        <p className="mb-3 rounded-tile border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {erreur}
        </p>
      ) : null}

      <Columns>
        {/* Colonne gauche — l'état du compte et ce qui l'a bougé */}
        <div className="contents lg:block">
          <div className="order-1">
            <Card tone="hero" className="overflow-hidden">
              <div className="p-5 pb-0 lg:p-6 lg:pb-0">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="kicker">Solde du compte</p>
                  <Suspense fallback={null}>
                    <MoisSelect value={data.mois} />
                  </Suspense>
                </div>

                <p className="chiffre-hero text-3xl lg:text-4xl">
                  {formatEuro(data.solde, { decimals: 2 })}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <Pill tone={resume.net >= 0 ? "positive" : "warning"}>
                    {formatEuro(resume.net, { sign: true })}
                  </Pill>
                  <span className="text-base text-ink-muted">
                    sur <span className="capitalize">{libelleMois(data.mois)}</span>
                    {resume.count > 0 ? ` · ${plural(resume.count, "mouvement")}` : ""}
                  </span>
                </div>
              </div>

              {/* La courbe mord sur les bords de la carte : elle est le fond. */}
              <div className="-mb-px mt-5">
                <Sparkline
                  points={data.courbe}
                  tone={resume.net >= 0 ? "#34d399" : "#fb7185"}
                />
              </div>
            </Card>

            {/* Le solde n'a de sens que rapporté à un relevé : sans point de
                départ, il ne vaut que ce qui a été saisi dans l'app. */}
            <button
              type="button"
              onClick={() => setFeuille("ouverture")}
              className="mt-2.5 flex w-full items-center justify-between gap-3 rounded-tile border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-2"
            >
              <span className="text-sm text-ink-muted">
                {data.ouverture.at ? (
                  <>
                    Parti de{" "}
                    <span className="num text-ink-section">
                      {formatEuro(data.ouverture.balance, { decimals: 2 })}
                    </span>{" "}
                    au {formatDate(data.ouverture.at)}
                  </>
                ) : (
                  "Aucun solde de départ — le solde ne compte que ce qui est saisi ici"
                )}
              </span>
              <SlidersHorizontal size={16} className="shrink-0 text-ink-muted" />
            </button>
          </div>

          <div className="order-4">
            <SectionTitle
              action={
                <div className="flex gap-1.5">
                  {FILTRES.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFiltre(f.key)}
                      aria-pressed={filtre === f.key}
                      className={`rounded-pill border px-3 py-1.5 text-sm transition-colors ${
                        filtre === f.key
                          ? "border-rose-line bg-rose-bg text-rose-hover"
                          : "border-line bg-surface-2 text-ink-section hover:border-line-strong"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              }
            >
              Mouvements
            </SectionTitle>

            {mouvements.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Rien ce mois-ci"
                description={
                  filtre === "tous"
                    ? "Les dépôts et retraits poker apparaissent ici tout seuls. Le reste se saisit à la main."
                    : "Aucun mouvement de ce sens sur le mois."
                }
                action={
                  filtre === "tous" ? (
                    <Button variant="primary" onClick={() => setEdition({})}>
                      <Plus size={18} />
                      Ajouter un mouvement
                    </Button>
                  ) : null
                }
              />
            ) : (
              <CardList>
                {mouvements.map((m) => (
                  <LigneMouvement
                    key={m.id}
                    mouvement={m}
                    pending={pending}
                    onEditer={() => setEdition(m)}
                    onSupprimer={() => supprimerMouvement(m)}
                  />
                ))}
              </CardList>
            )}
          </div>
        </div>

        {/* Colonne droite — ce que le mois raconte */}
        <div className="contents lg:block">
          <div className="order-2">
            <SectionTitle tight>Le mois</SectionTitle>
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile
                label="Entrées"
                value={formatEuro(resume.entrees, { sign: true })}
                tone="text-positive"
              />
              <StatTile
                label="Dépenses"
                value={formatEuro(-resume.depenses)}
                tone={resume.depenses > 0 ? "text-negative" : ""}
              />
              <StatTile
                label="Solde du mois"
                value={formatEuro(resume.net, { sign: true })}
                tone={toneClass(resume.net)}
              />
              <StatTile
                label="Charges fixes"
                value={formatEuro(data.chargesFixes)}
                sub={plural(data.charges.filter((c) => c.active).length, "ligne")}
              />
            </div>

            {resume.entrees > 0 ? (
              <div className="mt-2.5 rounded-tile border border-line bg-surface p-4">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <p className="text-sm text-ink-muted">
                    Dépensé sur ce qui est entré
                  </p>
                  <p className="num shrink-0 text-sm text-ink-section">
                    {formatPercent(partDepensee, { decimals: 0 })}
                  </p>
                </div>
                <ProgressBar
                  value={resume.depenses}
                  max={resume.entrees}
                  tone={partDepensee > 100 ? "negative" : partDepensee > 80 ? "warning" : "positive"}
                />
              </div>
            ) : null}

            {/* Un solde bancaire ne dit pas tout quand on travaille à la
                facture : ce qui est dû compte aussi. */}
            {data.aEncaisser > 0 ? (
              <Link
                href="/projets"
                className="mt-2.5 flex items-center justify-between gap-3 rounded-tile border border-accent-line bg-accent-soft px-4 py-3.5 transition-colors hover:bg-accent/15"
              >
                <p className="text-sm text-accent-hover">
                  <span className="num font-semibold">
                    {formatEuro(data.aEncaisser)}
                  </span>{" "}
                  à encaisser côté projets
                </p>
                <ChevronRight size={18} className="shrink-0 text-accent-hover" />
              </Link>
            ) : null}
          </div>

          <div className="order-3">
            <SectionTitle>Où part l&apos;argent</SectionTitle>
            {data.depensesParCategorie.length === 0 ? (
              <Card className="px-4 py-5 text-center text-sm text-ink-muted">
                Aucune dépense sur le mois.
              </Card>
            ) : (
              <Card className="divide-y divide-line/70 overflow-hidden">
                {data.depensesParCategorie.map((ligne) => (
                  <div key={ligne.category} className="px-4 py-3.5">
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <p className="truncate font-medium">
                        {libelleCategorie(ligne.category)}
                      </p>
                      <p className="num shrink-0 font-semibold">
                        {formatEuro(ligne.total, { decimals: 2 })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <ProgressBar value={ligne.part} max={100} tone="accent" />
                      </div>
                      <p className="num w-12 shrink-0 text-right text-sm text-ink-muted">
                        {formatPercent(ligne.part, { decimals: 0 })}
                      </p>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>

          <div className="order-5">
            <SectionTitle
              action={
                <Button variant="ghost" onClick={() => setFeuille("charges")}>
                  <Repeat size={16} />
                  Gérer
                </Button>
              }
            >
              Charges fixes
            </SectionTitle>
            {data.charges.filter((c) => c.active).length === 0 ? (
              <Card className="px-4 py-5 text-center text-sm text-ink-muted">
                Aucune charge récurrente notée. Loyer, abonnements, mutuelle :
                les lister dit ce qui reste réellement disponible.
              </Card>
            ) : (
              <CardList>
                {data.charges
                  .filter((c) => c.active)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.label}</p>
                        <p className="text-sm text-ink-muted">
                          {libelleCategorie(c.category)}
                          {c.dayOfMonth ? ` · le ${c.dayOfMonth}` : ""}
                        </p>
                      </div>
                      <p className="num shrink-0 font-semibold text-ink-section">
                        {formatEuro(c.amount, { decimals: 2 })}
                      </p>
                    </div>
                  ))}
              </CardList>
            )}
          </div>
        </div>
      </Columns>

      <div className="h-10" />

      {edition ? (
        <MouvementFeuille
          mouvement={edition}
          pending={pending}
          onClose={() => setEdition(null)}
          onEnregistrer={enregistrerMouvement}
        />
      ) : null}

      {feuille === "charges" ? (
        <ChargesFeuille
          charges={data.charges}
          pending={pending}
          onClose={() => setFeuille(null)}
          onAppeler={appeler}
        />
      ) : null}

      {feuille === "ouverture" ? (
        <OuvertureFeuille
          ouverture={data.ouverture}
          pending={pending}
          onClose={() => setFeuille(null)}
          onEnregistrer={(valeurs) =>
            appeler(
              "/api/bank-opening",
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(valeurs),
              },
              () => setFeuille(null)
            )
          }
        />
      ) : null}
    </Screen>
  );
}

/**
 * Une ligne de mouvement.
 *
 * Les mouvements venus du poker ou d'un projet ne sont pas modifiables ici :
 * ils appartiennent à l'écran qui les a produits, et les corriger de deux
 * endroits ferait diverger les deux vues. Une pastille le dit, et renvoie à
 * l'écran en question.
 */
function LigneMouvement({ mouvement: m, pending, onEditer, onSupprimer }) {
  const entree = m.montant >= 0;
  const origine = ORIGINES_COMPTE[m.origine] ?? ORIGINES_COMPTE.manuel;
  const Fleche = entree ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-sm ${
          entree ? "bg-positive/15 text-positive" : "bg-surface-3 text-ink-section"
        }`}
        aria-hidden
      >
        <Fleche size={17} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{m.label}</p>
        <p className="truncate text-sm text-ink-muted">
          {libelleCategorie(m.category)} · {formatDate(m.date)}
          {m.note ? ` · ${m.note}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <p className={`num font-semibold ${toneClass(m.montant)}`}>
          {formatEuro(m.montant, { sign: true, decimals: 2 })}
        </p>

        {origine.modifiable ? (
          <>
            <IconeBouton label="Modifier" onClick={onEditer} disabled={pending}>
              <Pencil size={17} />
            </IconeBouton>
            <IconeBouton label="Supprimer" onClick={onSupprimer} disabled={pending}>
              <Trash2 size={17} />
            </IconeBouton>
          </>
        ) : (
          <Link
            href={origine.lien}
            className="rounded-pill bg-surface-3 px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
            title={`Mouvement repris de ${origine.label.toLowerCase()} — se modifie là-bas`}
          >
            {origine.label}
          </Link>
        )}
      </div>
    </div>
  );
}
