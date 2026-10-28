"use client";

import { useState } from "react";

import Feuille from "@/components/Feuille";
import DatePicker from "@/components/DatePicker";
import { Button } from "@/components/ui";
import { Champ, ChampUnite, ChampZone, Option } from "@/components/champs";
import { PROJECT_STAGES, PROJECT_BILLINGS } from "@/lib/constants";

/** Date d'une valeur de base en texte local « AAAA-MM-JJ », ou chaîne vide. */
function enTexte(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Un champ de date facultatif : le calendrier, et de quoi le vider. */
function ChampDate({ label, aide, value, onChange }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-sm text-ink-muted">{label}</p>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-sm text-accent-hover transition-colors hover:text-accent"
          >
            Effacer
          </button>
        ) : null}
      </div>
      <DatePicker label={label} value={value} onChange={onChange} />
      {aide ? <p className="mt-1.5 text-sm text-ink-muted">{aide}</p> : null}
    </div>
  );
}

/**
 * Saisie d'un projet.
 *
 * Les dates ne sont demandées que quand l'état les rend vraies : inutile de
 * proposer une date d'encaissement sur un projet qui n'est pas payé. Laissées
 * vides, elles sont posées au jour du changement d'état par le serveur.
 */
export default function ProjetFeuille({ projet, pending, onClose, onEnregistrer }) {
  const ajout = !projet.id;
  const [v, setV] = useState({
    name: projet.name ?? "",
    client: projet.client ?? "",
    amount: projet.amount ? String(projet.amount) : "",
    stage: projet.stage ?? "IDEE",
    billing: projet.billing ?? "A_FACTURER",
    devisAt: enTexte(projet.devisAt),
    invoicedAt: enTexte(projet.invoicedAt),
    paidAt: enTexte(projet.paidAt),
    deadline: enTexte(projet.deadline),
    url: projet.url ?? "",
    note: projet.note ?? "",
  });

  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }));
  const vivier = ["IDEE", "DEVIS_ENVOYE", "DEVIS_REFUSE"].includes(v.stage);

  return (
    <Feuille
      titre={ajout ? "Nouveau projet" : "Modifier le projet"}
      onClose={onClose}
      taille="large"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onEnregistrer({ ...v, id: projet.id });
        }}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Champ
            label="Nom du projet"
            value={v.name}
            onChange={set("name")}
            placeholder="Refonte site vitrine"
            autoFocus
          />
          <Champ
            label="Client"
            value={v.client}
            onChange={set("client")}
            placeholder="Atelier Vigneron"
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChampUnite
            label="Montant à facturer"
            unite="€"
            value={v.amount}
            onChange={set("amount")}
            inputMode="decimal"
            placeholder="0"
            aide="Laisse à zéro tant que le prix n'est pas fixé."
          />
          <Champ
            label="Adresse du site (facultatif)"
            value={v.url}
            onChange={set("url")}
            placeholder="https://exemple.fr"
          />
        </div>

        <p className="kicker mb-2 mt-5">Avancement</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {PROJECT_STAGES.map((s) => (
            <Option
              key={s.key}
              actif={v.stage === s.key}
              onClick={() => set("stage")(s.key)}
            >
              {s.court}
            </Option>
          ))}
        </div>

        <p className="kicker mb-2 mt-5">Facturation</p>
        <div className="grid grid-cols-3 gap-2">
          {PROJECT_BILLINGS.map((b) => (
            <Option
              key={b.key}
              actif={v.billing === b.key}
              onClick={() => set("billing")(b.key)}
            >
              {b.label}
            </Option>
          ))}
        </div>
        {v.billing === "PAYE" ? (
          <p className="mt-2 text-sm text-ink-muted">
            Un projet payé fait naître une entrée sur le compte bancaire, à la
            date d&apos;encaissement.
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {v.stage !== "IDEE" ? (
            <ChampDate
              label="Devis envoyé le"
              value={v.devisAt}
              onChange={set("devisAt")}
            />
          ) : null}

          {v.billing !== "A_FACTURER" ? (
            <ChampDate
              label="Facturé le"
              value={v.invoicedAt}
              onChange={set("invoicedAt")}
            />
          ) : null}

          {v.billing === "PAYE" ? (
            <ChampDate
              label="Encaissé le"
              value={v.paidAt}
              onChange={set("paidAt")}
              aide="C'est cette date qui place l'entrée sur le bon mois."
            />
          ) : null}

          {vivier ? null : (
            <ChampDate
              label="Échéance de livraison (facultatif)"
              value={v.deadline}
              onChange={set("deadline")}
            />
          )}
        </div>

        <div className="mt-4">
          <ChampZone
            label="Note (facultatif)"
            value={v.note}
            onChange={set("note")}
            placeholder="Ce qui reste à faire, les conditions de paiement…"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="mt-5 w-full"
          disabled={pending}
        >
          {pending ? "Enregistrement…" : ajout ? "Créer le projet" : "Enregistrer"}
        </Button>
      </form>
    </Feuille>
  );
}
