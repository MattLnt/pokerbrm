"use client";

import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";

import Feuille from "@/components/Feuille";
import Select from "@/components/Select";
import DatePicker from "@/components/DatePicker";
import { Button, Card } from "@/components/ui";
import { Champ, ChampUnite, Option, IconeBouton } from "@/components/champs";
import {
  categoriesSaisissables,
  libelleCategorie,
  CATEGORIES_COMPTE,
} from "@/lib/constants";
import { formatEuro } from "@/lib/format";

/**
 * La date du jour en texte local. `toISOString()` donnerait la date UTC : un
 * mouvement saisi à 00 h 30 à Paris serait daté de la veille.
 */
function enTexte(date) {
  const d = date ? new Date(date) : new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

const SENS = [
  { key: "EXPENSE", label: "Dépense" },
  { key: "INCOME", label: "Entrée" },
];

/** Saisie d'un mouvement du compte : une dépense, ou une entrée. */
export function MouvementFeuille({ mouvement, pending, onClose, onEnregistrer }) {
  const ajout = !mouvement.id;
  const [v, setV] = useState({
    flow: mouvement.flow ?? "EXPENSE",
    label: mouvement.label ?? "",
    amount: mouvement.montant ? String(Math.abs(mouvement.montant)) : "",
    category: mouvement.category ?? "",
    date: enTexte(mouvement.date),
    note: mouvement.note ?? "",
  });

  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }));
  const categories = categoriesSaisissables(v.flow);

  /**
   * Changer de sens remet la catégorie à zéro si elle n'existe pas de
   * l'autre côté : « Loyer » n'est pas une entrée, et garder la valeur
   * laisserait un champ qui semble rempli mais que le serveur refuse.
   */
  function changerSens(flow) {
    setV((p) => ({
      ...p,
      flow,
      category: categoriesSaisissables(flow).some((c) => c.key === p.category)
        ? p.category
        : "",
    }));
  }

  return (
    <Feuille
      titre={ajout ? "Nouveau mouvement" : "Modifier le mouvement"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onEnregistrer({ ...v, id: mouvement.id });
        }}
      >
        <p className="kicker mb-2">Sens</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {SENS.map((s) => (
            <Option
              key={s.key}
              actif={v.flow === s.key}
              onClick={() => changerSens(s.key)}
            >
              {s.label}
            </Option>
          ))}
        </div>

        <div className="mb-4">
          <Champ
            label="Libellé"
            value={v.label}
            onChange={set("label")}
            placeholder={v.flow === "EXPENSE" ? "Courses" : "Virement client"}
            autoFocus
          />
        </div>

        <div className="mb-4">
          <ChampUnite
            label="Montant"
            unite="€"
            value={v.amount}
            onChange={set("amount")}
            inputMode="decimal"
            placeholder="0,00"
          />
        </div>

        <div className="mb-4">
          <p className="mb-1.5 text-sm text-ink-muted">Catégorie</p>
          <Select
            label="Catégorie"
            value={v.category}
            onChange={set("category")}
            placeholder="Choisir une catégorie"
            options={categories.map((c) => ({ value: c.key, label: c.label }))}
          />
        </div>

        <div className="mb-4">
          <p className="mb-1.5 text-sm text-ink-muted">Date</p>
          <DatePicker label="Date" value={v.date} onChange={set("date")} />
        </div>

        <div className="mb-5">
          <Champ
            label="Note (facultatif)"
            value={v.note}
            onChange={set("note")}
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Enregistrement…" : ajout ? "Ajouter" : "Enregistrer"}
        </Button>
      </form>
    </Feuille>
  );
}

const CATEGORIES_DEPENSE = CATEGORIES_COMPTE.filter(
  (c) => c.flow === "EXPENSE" && !c.miroir
);

/**
 * Les charges qui retombent chaque mois.
 *
 * Elles n'engendrent aucun mouvement : l'app ne sait pas si le prélèvement
 * est passé, et en inventer un fausserait le solde. Elles servent à savoir
 * ce que le mois coûte avant d'avoir rien fait.
 */
export function ChargesFeuille({ charges, pending, onClose, onAppeler }) {
  const [v, setV] = useState({ label: "", amount: "", category: "", dayOfMonth: "" });
  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }));

  const total = charges
    .filter((c) => c.active)
    .reduce((s, c) => s + Number(c.amount), 0);

  function ajouter(e) {
    e.preventDefault();
    onAppeler(
      "/api/charges",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      },
      () => setV({ label: "", amount: "", category: "", dayOfMonth: "" })
    );
  }

  function basculer(c) {
    onAppeler("/api/charges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    });
  }

  function supprimer(c) {
    onAppeler(`/api/charges?id=${encodeURIComponent(c.id)}`, { method: "DELETE" });
  }

  return (
    <Feuille titre="Charges fixes" onClose={onClose} taille="large">
      <p className="mb-4 text-base text-ink-muted">
        Loyer, abonnements, assurances. Rien n&apos;est prélevé
        automatiquement — c&apos;est une liste, pas un échéancier : elle dit
        ce que le mois coûte avant d&apos;avoir rien fait.
      </p>

      {charges.length === 0 ? (
        <Card className="mb-5 px-4 py-5 text-center text-sm text-ink-muted">
          Aucune charge notée.
        </Card>
      ) : (
        <Card className="mb-5 divide-y divide-line/70 overflow-hidden">
          {charges.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                c.active ? "" : "opacity-55"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.label}</p>
                <p className="text-sm text-ink-muted">
                  {libelleCategorie(c.category)}
                  {c.dayOfMonth ? ` · le ${c.dayOfMonth}` : ""}
                </p>
              </div>
              <p className="num shrink-0 font-semibold">
                {formatEuro(c.amount, { decimals: 2 })}
              </p>
              <IconeBouton
                label={c.active ? "Mettre en pause" : "Réactiver"}
                onClick={() => basculer(c)}
                disabled={pending}
              >
                {c.active ? <EyeOff size={17} /> : <Eye size={17} />}
              </IconeBouton>
              <IconeBouton
                label="Supprimer"
                onClick={() => supprimer(c)}
                disabled={pending}
              >
                <Trash2 size={17} />
              </IconeBouton>
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 bg-bg-sunken px-4 py-3">
            <p className="kicker">Total mensuel</p>
            <p className="num font-bold">{formatEuro(total, { decimals: 2 })}</p>
          </div>
        </Card>
      )}

      <form onSubmit={ajouter}>
        <p className="kicker mb-2.5">Ajouter une charge</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <Champ label="Libellé" value={v.label} onChange={set("label")} placeholder="Loyer" />
          <ChampUnite
            label="Montant"
            unite="€"
            value={v.amount}
            onChange={set("amount")}
            inputMode="decimal"
            placeholder="0,00"
          />
          <div>
            <p className="mb-1.5 text-sm text-ink-muted">Catégorie</p>
            <Select
              label="Catégorie"
              value={v.category}
              onChange={set("category")}
              placeholder="Choisir"
              options={CATEGORIES_DEPENSE.map((c) => ({
                value: c.key,
                label: c.label,
              }))}
            />
          </div>
          {/* Jour en saisie libre : un prélèvement tombe le 3, le 7 ou le 23,
              pas sur une liste de jours ronds. */}
          <ChampUnite
            label="Jour du mois (facultatif)"
            unite="du mois"
            value={v.dayOfMonth}
            onChange={set("dayOfMonth")}
            inputMode="numeric"
            placeholder="5"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="mt-4 w-full"
          disabled={pending}
        >
          <Plus size={18} />
          {pending ? "Enregistrement…" : "Ajouter la charge"}
        </Button>
      </form>
    </Feuille>
  );
}

/** Le relevé dont part le solde affiché. */
export function OuvertureFeuille({ ouverture, pending, onClose, onEnregistrer }) {
  const [balance, setBalance] = useState(String(ouverture.balance ?? ""));
  const [at, setAt] = useState(enTexte(ouverture.at));

  return (
    <Feuille titre="Solde de départ" onClose={onClose}>
      <p className="mb-4 text-base text-ink-muted">
        Recopie le solde que ta banque affiche à une date donnée. L&apos;app
        part de là et y ajoute les mouvements qui suivent — sans ce point de
        départ, le solde ne vaudrait que ce qui a été saisi ici.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onEnregistrer({ balance, at });
        }}
      >
        <div className="mb-4">
          <ChampUnite
            label="Solde relevé"
            unite="€"
            value={balance}
            onChange={setBalance}
            inputMode="decimal"
            placeholder="0,00"
            autoFocus
          />
        </div>

        <div className="mb-5">
          <p className="mb-1.5 text-sm text-ink-muted">Au</p>
          <DatePicker label="Date du relevé" value={at} onChange={setAt} />
          <p className="mt-1.5 text-sm text-ink-muted">
            Les mouvements antérieurs à cette date sont ignorés dans le
            solde : ils sont déjà dedans.
          </p>
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </Feuille>
  );
}
