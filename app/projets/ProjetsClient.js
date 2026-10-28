"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Briefcase,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";

import {
  SectionTitle,
  Card,
  Columns,
  StatTile,
  Pill,
  Button,
  EmptyState,
} from "@/components/ui";
import { IconeBouton } from "@/components/champs";
import {
  PROJECT_STAGE_LABELS,
  PROJECT_BILLING_LABELS,
  tonFacturation,
  DEVIS_RELANCE_JOURS,
} from "@/lib/constants";
import { relanceDue } from "@/lib/projets";
import { formatEuro, formatDate, plural } from "@/lib/format";
import ProjetFeuille from "./ProjetFeuille";

/** Jours restants avant une échéance ; négatif si elle est passée. */
function joursAvant(date) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

export default function ProjetsClient({ projets, resume, demo }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState(null);
  const [edition, setEdition] = useState(null);
  const [montrerRefuses, setMontrerRefuses] = useState(false);

  const enCours = projets.filter((p) => p.stage === "EN_COURS");
  const termines = projets.filter((p) => p.stage === "TERMINE");
  const pistes = projets.filter((p) => p.stage === "IDEE");
  const devis = projets.filter((p) => p.stage === "DEVIS_ENVOYE");
  const refuses = projets.filter((p) => p.stage === "DEVIS_REFUSE");

  function appeler(url, options, apres) {
    if (demo) {
      setErreur("Branche la base Railway pour enregistrer un projet.");
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

  function enregistrer(valeurs) {
    appeler(
      "/api/projects",
      {
        method: valeurs.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valeurs),
      },
      () => setEdition(null)
    );
  }

  /** Changement d'un seul état : le serveur en déduit les dates. */
  function basculer(projet, champs) {
    appeler("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: projet.id, ...champs }),
    });
  }

  function supprimer(projet) {
    appeler(`/api/projects?id=${encodeURIComponent(projet.id)}`, {
      method: "DELETE",
    });
  }

  const carte = (p) => (
    <CarteProjet
      key={p.id}
      projet={p}
      pending={pending}
      onEditer={() => setEdition(p)}
      onBasculer={(champs) => basculer(p, champs)}
      onSupprimer={() => supprimer(p)}
    />
  );

  return (
    <>
      {erreur ? (
        <p className="mb-3 rounded-tile border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {erreur}
        </p>
      ) : null}

      <Columns>
        {/* Colonne gauche — le travail */}
        <div className="contents lg:block">
          <div className="order-2">
            <SectionTitle
              action={
                <Button variant="primary" onClick={() => setEdition({})}>
                  <Plus size={18} />
                  Nouveau projet
                </Button>
              }
            >
              En cours
            </SectionTitle>

            {enCours.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="Aucun projet en cours"
                description="Les projets acceptés arrivent ici, avec ce qu'il reste à facturer."
              />
            ) : (
              <div className="grid gap-2.5">{enCours.map(carte)}</div>
            )}
          </div>

          {termines.length > 0 ? (
            <div className="order-4">
              <SectionTitle>Terminés</SectionTitle>
              <div className="grid gap-2.5">{termines.map(carte)}</div>
            </div>
          ) : null}
        </div>

        {/* Colonne droite — l'argent et les perspectives */}
        <div className="contents lg:block">
          <div className="order-1">
            <SectionTitle tight>Facturation</SectionTitle>
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile
                label="À encaisser"
                value={formatEuro(resume.aEncaisser)}
                sub={`${formatEuro(resume.aFacturer.total)} à facturer · ${formatEuro(resume.facture.total)} en attente`}
                tone={resume.aEncaisser > 0 ? "text-warning" : ""}
              />
              <StatTile
                label="Encaissé"
                value={formatEuro(resume.encaisse)}
                tone={resume.encaisse > 0 ? "text-positive" : ""}
              />
              <StatTile
                label="En cours"
                value={formatEuro(resume.enCoursTotal)}
                sub={plural(resume.enCoursCount, "projet")}
              />
              <StatTile
                label="Vivier"
                value={formatEuro(resume.vivier.total)}
                sub={`${plural(resume.vivier.devisEnvoyes, "devis", "devis")} envoyé${resume.vivier.devisEnvoyes > 1 ? "s" : ""}`}
              />
            </div>

            {resume.vivier.relances > 0 ? (
              <p className="mt-2.5 flex items-center gap-2.5 rounded-tile border border-warning/40 bg-warning/5 px-4 py-3.5 text-sm text-warning">
                <AlertTriangle size={17} className="shrink-0" />
                {plural(resume.vivier.relances, "devis", "devis")} sans réponse
                depuis plus de {DEVIS_RELANCE_JOURS} jours — à relancer.
              </p>
            ) : null}
          </div>

          <div className="order-3">
            <SectionTitle>Vivier</SectionTitle>

            {devis.length === 0 && pistes.length === 0 ? (
              <Card className="px-4 py-5 text-center text-sm text-ink-muted">
                Aucune piste en cours. Un devis envoyé ou une simple piste se
                note ici avant d&apos;être du travail.
              </Card>
            ) : (
              <div className="grid gap-2.5">
                {devis.map(carte)}
                {pistes.map(carte)}
              </div>
            )}

            {/* Les devis refusés restent consultables sans encombrer : ils ne
                sont plus une perspective, mais ils disent ce qui n'a pas pris. */}
            {refuses.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setMontrerRefuses((v) => !v)}
                  className="mt-2.5 w-full rounded-tile border border-line bg-surface px-4 py-3 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  {montrerRefuses ? "Masquer" : "Voir"} les{" "}
                  {plural(refuses.length, "devis refusé", "devis refusés")}
                </button>
                {montrerRefuses ? (
                  <div className="mt-2.5 grid gap-2.5">{refuses.map(carte)}</div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </Columns>

      {edition ? (
        <ProjetFeuille
          projet={edition}
          pending={pending}
          onClose={() => setEdition(null)}
          onEnregistrer={enregistrer}
        />
      ) : null}
    </>
  );
}

/**
 * Les boutons proposés sur une carte, selon l'état du projet.
 *
 * Deux au maximum : ce sont des raccourcis pour le geste suivant, pas un
 * éditeur. Tout le reste passe par le formulaire.
 */
function actionsRapides(projet) {
  switch (projet.stage) {
    case "IDEE":
      return [
        { label: "Devis envoyé", champs: { stage: "DEVIS_ENVOYE" } },
        { label: "Démarrer", champs: { stage: "EN_COURS" } },
      ];
    case "DEVIS_ENVOYE":
      return [
        { label: "Accepté", champs: { stage: "EN_COURS" } },
        { label: "Refusé", champs: { stage: "DEVIS_REFUSE" } },
      ];
    case "DEVIS_REFUSE":
      return [{ label: "Remettre en piste", champs: { stage: "IDEE" } }];
    case "EN_COURS":
      if (projet.billing === "A_FACTURER") {
        return [
          { label: "Facturé", champs: { billing: "FACTURE" } },
          { label: "Terminer", champs: { stage: "TERMINE" } },
        ];
      }
      if (projet.billing === "FACTURE") {
        return [
          { label: "Payé", champs: { billing: "PAYE" } },
          { label: "Terminer", champs: { stage: "TERMINE" } },
        ];
      }
      return [{ label: "Terminer", champs: { stage: "TERMINE" } }];
    case "TERMINE":
      if (projet.billing === "A_FACTURER") {
        return [{ label: "Facturé", champs: { billing: "FACTURE" } }];
      }
      if (projet.billing === "FACTURE") {
        return [{ label: "Payé", champs: { billing: "PAYE" } }];
      }
      return [];
    default:
      return [];
  }
}

/** La ligne de contexte sous le nom : ce qui s'est passé, ou ce qui vient. */
function contexte(projet) {
  const bouts = [];
  if (projet.client) bouts.push(projet.client);

  const relance = relanceDue(projet);
  if (relance !== null) {
    bouts.push(`devis parti il y a ${relance} j`);
  } else if (projet.stage === "DEVIS_ENVOYE" && projet.devisAt) {
    bouts.push(`devis du ${formatDate(projet.devisAt)}`);
  }

  if (projet.billing === "PAYE" && projet.paidAt) {
    bouts.push(`encaissé le ${formatDate(projet.paidAt)}`);
  } else if (projet.billing === "FACTURE" && projet.invoicedAt) {
    bouts.push(`facturé le ${formatDate(projet.invoicedAt)}`);
  }

  return bouts.join(" · ");
}

function CarteProjet({ projet: p, pending, onEditer, onBasculer, onSupprimer }) {
  const actions = actionsRapides(p);
  const relance = relanceDue(p);
  const vivier = p.stage === "IDEE" || p.stage === "DEVIS_ENVOYE" || p.stage === "DEVIS_REFUSE";
  const reste = p.deadline && p.billing !== "PAYE" ? joursAvant(p.deadline) : null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2 font-semibold">
            <span className="truncate">{p.name}</span>
            {p.url ? (
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`Ouvrir ${p.name}`}
                className="shrink-0 text-ink-muted transition-colors hover:text-accent-hover"
              >
                <ExternalLink size={15} />
              </a>
            ) : null}
          </p>
          {contexte(p) ? (
            <p
              className={`truncate text-sm ${
                relance !== null ? "text-warning" : "text-ink-muted"
              }`}
            >
              {contexte(p)}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="num text-lg font-bold">
            {p.amount > 0 ? formatEuro(p.amount) : "—"}
          </p>
          {/* Dans le vivier, l'état de facturation ne veut rien dire : rien
              n'est à facturer tant que rien n'est accepté. Ailleurs, c'est la
              pastille du bas qui le porte — l'écrire deux fois le dilue. */}
          {vivier ? (
            <p className="text-sm text-ink-muted">
              {PROJECT_STAGE_LABELS[p.stage]}
            </p>
          ) : null}
        </div>
      </div>

      {reste !== null ? (
        <p
          className={`mt-3 flex items-center gap-2 text-sm ${
            reste < 0 ? "text-negative" : reste <= 7 ? "text-warning" : "text-ink-muted"
          }`}
        >
          <CalendarClock size={15} className="shrink-0" />
          {reste < 0
            ? `Échéance dépassée de ${plural(-reste, "jour")}`
            : reste === 0
              ? "Échéance aujourd'hui"
              : `Livraison dans ${plural(reste, "jour")}`}
        </p>
      ) : null}

      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
        {vivier ? null : (
          <Pill tone={tonFacturation(p.billing)}>
            {PROJECT_BILLING_LABELS[p.billing]}
          </Pill>
        )}

        {actions.map((a) => (
          <Button
            key={a.label}
            variant="secondary"
            className="px-3.5"
            onClick={() => onBasculer(a.champs)}
            disabled={pending}
          >
            {a.label}
          </Button>
        ))}

        <div className="ml-auto flex items-center">
          <IconeBouton label="Modifier" onClick={onEditer} disabled={pending}>
            <Pencil size={17} />
          </IconeBouton>
          <IconeBouton label="Supprimer" onClick={onSupprimer} disabled={pending}>
            <Trash2 size={17} />
          </IconeBouton>
        </div>
      </div>

      {p.note ? (
        <p className="mt-3 text-sm leading-[var(--lh-normal)] text-ink-muted">
          {p.note}
        </p>
      ) : null}
    </Card>
  );
}
