"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, EyeOff, Eye } from "lucide-react";

import SiteBadge from "@/components/SiteBadge";
import Feuille from "@/components/Feuille";
import { Card, CardList, SectionTitle, Button } from "@/components/ui";
import { FORMATS, FORMAT_LABELS, SPEED_LABELS } from "@/lib/constants";
import { formatEuro, plural } from "@/lib/format";

const VITESSES = ["NORMAL", "SEMITURBO", "TURBO", "HYPER"];

export default function GrilleManager({ grille, sites, demo }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState(null);
  const [edition, setEdition] = useState(null); // modèle, ou {} pour un ajout
  const [room, setRoom] = useState("tous");

  const liste = useMemo(
    () => (room === "tous" ? grille : grille.filter((m) => m.siteSlug === room)),
    [grille, room]
  );
  const actifs = liste.filter((m) => m.active);
  const inactifs = liste.filter((m) => !m.active);

  function appeler(url, options, apres) {
    if (demo) {
      setErreur("Branche la base Railway pour modifier la grille.");
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
    const estAjout = !valeurs.id;
    appeler(
      "/api/templates",
      {
        method: estAjout ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valeurs),
      },
      () => setEdition(null)
    );
  }

  function basculer(m) {
    appeler("/api/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, active: !m.active }),
    });
  }

  function supprimer(m) {
    appeler(`/api/templates?id=${encodeURIComponent(m.id)}`, {
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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip actif={room === "tous"} onClick={() => setRoom("tous")}>
          Toutes
        </Chip>
        {sites.map((s) => (
          <Chip
            key={s.slug}
            actif={room === s.slug}
            onClick={() => setRoom(s.slug)}
          >
            {s.name}
          </Chip>
        ))}
        <Button
          type="button"
          variant="primary"
          className="ml-auto px-4"
          onClick={() => setEdition({})}
        >
          <Plus size={18} />
          Ajouter
        </Button>
      </div>

      <SectionTitle>
        {plural(actifs.length, "tournoi")} dans la grille
      </SectionTitle>

      {actifs.length === 0 ? (
        <Card className="px-4 py-5 text-center text-sm text-ink-muted">
          Aucun tournoi actif ici.
        </Card>
      ) : (
        <CardList>
          {actifs.map((m) => (
            <Ligne
              key={m.id}
              modele={m}
              pending={pending}
              onEditer={() => setEdition(m)}
              onBasculer={() => basculer(m)}
              onSupprimer={() => supprimer(m)}
            />
          ))}
        </CardList>
      )}

      {inactifs.length > 0 ? (
        <>
          <SectionTitle>Désactivés</SectionTitle>
          <CardList>
            {inactifs.map((m) => (
              <Ligne
                key={m.id}
                modele={m}
                pending={pending}
                onEditer={() => setEdition(m)}
                onBasculer={() => basculer(m)}
                onSupprimer={() => supprimer(m)}
              />
            ))}
          </CardList>
        </>
      ) : null}

      <div className="h-10" />

      {edition ? (
        <FormulaireModele
          modele={edition}
          sites={sites}
          pending={pending}
          onClose={() => setEdition(null)}
          onEnregistrer={enregistrer}
        />
      ) : null}
    </>
  );
}

function Chip({ actif, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`min-h-[40px] rounded-pill border px-4 text-sm ${
        actif
          ? "border-rose-line bg-rose-bg text-ink"
          : "border-line bg-surface-2 text-ink-section"
      }`}
    >
      {children}
    </button>
  );
}

function Ligne({ modele: m, pending, onEditer, onBasculer, onSupprimer }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${m.active ? "" : "opacity-55"}`}>
      <SiteBadge slug={m.siteSlug} taille={34} />

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{m.name}</p>
        <p className="num truncate text-sm text-ink-muted">
          {formatEuro(m.cout)} · {FORMAT_LABELS[m.format]}
          {m.speed !== "NORMAL" ? ` · ${SPEED_LABELS[m.speed]}` : ""}
          {m.usualHour !== null ? ` · ~${m.usualHour} h` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center">
        <IconeBouton label="Modifier" onClick={onEditer} disabled={pending}>
          <Pencil size={18} />
        </IconeBouton>
        <IconeBouton
          label={m.active ? "Désactiver" : "Réactiver"}
          onClick={onBasculer}
          disabled={pending}
        >
          {m.active ? <EyeOff size={18} /> : <Eye size={18} />}
        </IconeBouton>
        <IconeBouton label="Supprimer" onClick={onSupprimer} disabled={pending}>
          <Trash2 size={18} />
        </IconeBouton>
      </div>
    </div>
  );
}

function IconeBouton({ label, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid size-11 place-items-center text-ink-muted transition-colors active:text-ink disabled:opacity-40"
      {...rest}
    >
      {children}
    </button>
  );
}

function FormulaireModele({ modele, sites, pending, onClose, onEnregistrer }) {
  const ajout = !modele.id;
  const [v, setV] = useState({
    name: modele.name ?? "",
    site: modele.siteSlug ?? sites[0].slug,
    buyIn: modele.buyIn ?? "",
    fee: modele.fee ?? "",
    bounty: modele.bounty ?? "",
    format: modele.format ?? "CLASSIC",
    speed: modele.speed ?? "NORMAL",
    usualHour: modele.usualHour ?? "",
  });

  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }));
  const cout =
    (Number(String(v.buyIn).replace(",", ".")) || 0) +
    (Number(String(v.fee).replace(",", ".")) || 0) +
    (Number(String(v.bounty).replace(",", ".")) || 0);

  return (
    <Feuille
      titre={ajout ? "Ajouter un tournoi" : "Modifier le tournoi"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onEnregistrer({ ...v, id: modele.id });
        }}
      >
        <Champ label="Nom" value={v.name} onChange={set("name")} autoFocus />

        <p className="kicker mb-2 mt-4">Room</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {sites.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => set("site")(s.slug)}
              aria-pressed={v.site === s.slug}
              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-tile border text-sm ${
                v.site === s.slug
                  ? "border-rose-line bg-rose-bg text-ink"
                  : "border-line bg-surface-2 text-ink-section"
              }`}
            >
              <SiteBadge slug={s.slug} taille={22} />
              {s.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <Champ label="Buy-in" value={v.buyIn} onChange={set("buyIn")} inputMode="decimal" />
          <Champ label="Rake" value={v.fee} onChange={set("fee")} inputMode="decimal" />
          <Champ label="Prime" value={v.bounty} onChange={set("bounty")} inputMode="decimal" />
        </div>
        <p className="num mt-2 text-sm text-ink-muted">
          Coût total : {formatEuro(cout)}
        </p>

        <p className="kicker mb-2 mt-4">Format</p>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {FORMATS.map((f) => (
            <Option
              key={f.key}
              actif={v.format === f.key}
              onClick={() => set("format")(f.key)}
            >
              {f.label}
            </Option>
          ))}
        </div>

        <p className="kicker mb-2">Vitesse</p>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {VITESSES.map((k) => (
            <Option key={k} actif={v.speed === k} onClick={() => set("speed")(k)}>
              {SPEED_LABELS[k]}
            </Option>
          ))}
        </div>

        <Champ
          label="Heure habituelle (0–23, facultatif)"
          value={v.usualHour}
          onChange={set("usualHour")}
          inputMode="numeric"
          placeholder="ex. 19"
        />
        <p className="mb-5 mt-1.5 text-sm text-ink-muted">
          Sert à remonter ce tournoi en tête de liste au moment où tu le joues.
        </p>

        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Enregistrement…" : ajout ? "Ajouter à la grille" : "Enregistrer"}
        </Button>
      </form>
    </Feuille>
  );
}

function Option({ actif, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`min-h-[44px] rounded-tile border px-1 text-sm ${
        actif
          ? "border-rose-line bg-rose-bg text-ink"
          : "border-line bg-surface-2 text-ink-section"
      }`}
    >
      {children}
    </button>
  );
}

function Champ({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-muted">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="num min-h-[48px] w-full rounded-tile border border-line bg-surface-2 px-4 text-base"
        {...rest}
      />
    </label>
  );
}
