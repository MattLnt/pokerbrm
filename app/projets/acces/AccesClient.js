"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ExternalLink, KeyRound, ShieldOff } from "lucide-react";

import Feuille from "@/components/Feuille";
import Select from "@/components/Select";
import ServiceBadge from "@/components/ServiceBadge";
import { Card, SectionTitle, Button, EmptyState } from "@/components/ui";
import { Champ, ChampZone, IconeBouton } from "@/components/champs";
import { SERVICES_WEB, identiteService, PROJECT_STAGE_LABELS } from "@/lib/constants";

export default function AccesClient({ groupes, projets, demo }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState(null);
  const [edition, setEdition] = useState(null);

  function appeler(url, options, apres) {
    if (demo) {
      setErreur("Branche la base Railway pour enregistrer un accès.");
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
      "/api/project-access",
      {
        method: valeurs.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valeurs),
      },
      () => setEdition(null)
    );
  }

  function supprimer(acces) {
    appeler(`/api/project-access?id=${encodeURIComponent(acces.id)}`, {
      method: "DELETE",
    });
  }

  return (
    <>
      {erreur ? (
        <p className="mb-3 rounded-tile border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {erreur}
        </p>
      ) : null}

      <SectionTitle
        tight
        action={
          <Button variant="primary" onClick={() => setEdition({})}>
            <Plus size={18} />
            Noter un accès
          </Button>
        }
      >
        Où tourne quoi
      </SectionTitle>

      {/* Dit une fois, en haut, ce que la page ne fera jamais : garder un
          secret. C'est la règle du modèle, elle a sa place à l'écran. */}
      <p className="mb-4 flex items-start gap-2.5 rounded-tile border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
        <ShieldOff size={16} className="mt-0.5 shrink-0" />
        <span>
          Des références, pas des secrets : quel compte, quelle ressource, quel
          tableau de bord. Les clés d&apos;API et les mots de passe restent
          dans ton gestionnaire — cette base n&apos;est pas un coffre-fort.
        </span>
      </p>

      {groupes.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Rien de recensé"
          description="Note ici quel compte Vercel héberge quel projet, quelle base Railway il utilise, sur quel compte Stripe il encaisse."
          action={
            <Button variant="primary" onClick={() => setEdition({})}>
              <Plus size={18} />
              Noter un accès
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3.5 lg:grid-cols-2 lg:items-start">
          {groupes.map((g) => (
            <Card key={g.projectId ?? "hors-projet"} className="overflow-hidden">
              <header className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{g.name}</p>
                  {g.client ? (
                    <p className="truncate text-sm text-ink-muted">{g.client}</p>
                  ) : null}
                </div>
                {g.stage ? (
                  <p className="shrink-0 text-sm text-ink-muted">
                    {PROJECT_STAGE_LABELS[g.stage]}
                  </p>
                ) : null}
              </header>

              <div className="divide-y divide-line/70">
                {g.acces.map((a) => (
                  <LigneAcces
                    key={a.id}
                    acces={a}
                    pending={pending}
                    onEditer={() =>
                      setEdition({ ...a, projectId: g.projectId ?? "" })
                    }
                    onSupprimer={() => supprimer(a)}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {edition ? (
        <AccesFeuille
          acces={edition}
          projets={projets}
          pending={pending}
          onClose={() => setEdition(null)}
          onEnregistrer={enregistrer}
        />
      ) : null}
    </>
  );
}

function LigneAcces({ acces: a, pending, onEditer, onSupprimer }) {
  const service = identiteService(a.service);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <ServiceBadge slug={a.service} taille={32} />

      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2 font-medium">
          <span className="truncate">{service.name}</span>
          {a.url ? (
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Ouvrir ${service.name}`}
              className="shrink-0 text-ink-muted transition-colors hover:text-accent-hover"
            >
              <ExternalLink size={14} />
            </a>
          ) : null}
        </p>
        <p className="truncate text-sm text-ink-muted">
          {[a.account, a.resource].filter(Boolean).join(" · ")}
        </p>
        {a.note ? (
          <p className="mt-1 text-sm text-ink-muted/80">{a.note}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center">
        <IconeBouton label="Modifier" onClick={onEditer} disabled={pending}>
          <Pencil size={16} />
        </IconeBouton>
        <IconeBouton label="Supprimer" onClick={onSupprimer} disabled={pending}>
          <Trash2 size={16} />
        </IconeBouton>
      </div>
    </div>
  );
}

function AccesFeuille({ acces, projets, pending, onClose, onEnregistrer }) {
  const ajout = !acces.id;
  const [v, setV] = useState({
    projectId: acces.projectId ?? "",
    service: acces.service ?? "vercel",
    account: acces.account ?? "",
    resource: acces.resource ?? "",
    url: acces.url ?? "",
    note: acces.note ?? "",
  });

  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }));
  const service = identiteService(v.service);

  return (
    <Feuille
      titre={ajout ? "Noter un accès" : "Modifier l'accès"}
      onClose={onClose}
      taille="large"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onEnregistrer({ ...v, id: acces.id });
        }}
      >
        <div className="mb-4">
          <p className="mb-1.5 text-sm text-ink-muted">Projet</p>
          <Select
            label="Projet"
            value={v.projectId}
            onChange={set("projectId")}
            placeholder="Choisir un projet"
            options={[
              // Un compte qui ne dépend d'aucun projet — le GitHub perso, le
              // registrar — a sa place ici aussi.
              { value: "", label: "Hors projet", sub: "Compte général" },
              ...projets.map((p) => ({
                value: p.id,
                label: p.name,
                sub: p.client ?? undefined,
              })),
            ]}
          />
        </div>

        <p className="kicker mb-2">Service</p>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {SERVICES_WEB.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => set("service")(s.slug)}
              aria-pressed={v.service === s.slug}
              className={`flex min-h-[46px] items-center gap-2.5 rounded-tile border px-3 text-sm transition-colors ${
                v.service === s.slug
                  ? "border-rose-line bg-rose-bg text-rose-hover"
                  : "border-line bg-surface-2 text-ink-section hover:border-line-strong"
              }`}
            >
              <ServiceBadge slug={s.slug} taille={22} />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Champ
            label="Compte utilisé"
            value={v.account}
            onChange={set("account")}
            placeholder="moi@exemple.fr"
          />
          {/* Le libellé suit le service : « Base de données » chez Railway,
              « Domaine » chez OVH — c'est ce qu'on cherche en revenant ici. */}
          <Champ
            label={service.ressource}
            value={v.resource}
            onChange={set("resource")}
            placeholder={
              v.service === "railway" ? "nom-de-la-base" : "nom-de-la-ressource"
            }
          />
        </div>

        <div className="mt-4">
          <Champ
            label="Lien du tableau de bord (facultatif)"
            value={v.url}
            onChange={set("url")}
            placeholder="https://vercel.com/…"
          />
        </div>

        <div className="mt-4">
          <ChampZone
            label="Note (facultatif)"
            value={v.note}
            onChange={set("note")}
            rows={2}
            placeholder="Région, plan, date de renouvellement…"
          />
        </div>

        <p className="mt-3 flex items-start gap-2 text-sm text-ink-muted">
          <ShieldOff size={15} className="mt-0.5 shrink-0" />
          Pas de clé d&apos;API ni de chaîne de connexion : elles seraient
          refusées à l&apos;enregistrement.
        </p>

        <Button
          type="submit"
          variant="primary"
          className="mt-5 w-full"
          disabled={pending}
        >
          {pending ? "Enregistrement…" : ajout ? "Noter l'accès" : "Enregistrer"}
        </Button>
      </form>
    </Feuille>
  );
}
