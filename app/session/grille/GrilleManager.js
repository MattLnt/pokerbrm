"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, EyeOff, Eye } from "lucide-react";

import SiteBadge from "@/components/SiteBadge";
import Feuille from "@/components/Feuille";
import Select from "@/components/Select";
import { Card, CardList, SectionTitle, Button, Pill } from "@/components/ui";
import {
  FORMATS,
  FORMAT_LABELS,
  QUARTS_HEURE,
  libelleVitesse,
} from "@/lib/constants";
import { grouperParHeure, libelleTranche, libelleHeure } from "@/lib/session";
import { formatEuro, plural } from "@/lib/format";

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
  // La grille se lit comme un programme : par heure de début.
  const tranches = useMemo(() => grouperParHeure(actifs), [actifs]);

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
        <div className="space-y-5">
          {tranches.map((tranche) => (
            <section key={String(tranche.heure)}>
              <header className="mb-2.5 flex items-center gap-3">
                <span className="num text-base font-bold text-ink-section">
                  {libelleTranche(tranche.heure)}
                </span>
                <span className="h-px flex-1 bg-line" aria-hidden />
                <span className="num text-sm text-ink-muted">
                  {plural(tranche.tournois.length, "tournoi")}
                </span>
              </header>
              <CardList>
                {tranche.tournois.map((m) => (
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
            </section>
          ))}
        </div>
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
          ? "border-rose-line bg-rose-bg text-rose-hover"
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
        <p className="flex items-center gap-2 truncate font-semibold">
          <span className="truncate">{m.name}</span>
          {m.tag ? (
            <span className="shrink-0 rounded-pill bg-rose/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-rose ring-1 ring-rose/30">
              {m.tag}
            </span>
          ) : null}
        </p>
        <p className="num truncate text-sm text-ink-muted">
          {formatEuro(m.cout)} · {FORMAT_LABELS[m.format]}
          {libelleVitesse(m) ? ` · ${libelleVitesse(m)}` : ""}
          {/* L'heure exacte : la tranche ne donne que l'heure ronde, et
              deux tournois de 19 h ne partent pas au même moment. */}
          {libelleHeure(m.usualHour, m.usualMinute)
            ? ` · ${libelleHeure(m.usualHour, m.usualMinute)}`
            : ""}
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
    cout: modele.cout ?? "",
    format: modele.format ?? "CLASSIC",
    levelMinutes: modele.levelMinutes ?? "",
    tag: modele.tag ?? "",
    usualHour: modele.usualHour ?? "",
    usualMinute: modele.usualMinute ?? 0,
  });

  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }));

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
                  ? "border-rose-line bg-rose-bg text-rose-hover"
                  : "border-line bg-surface-2 text-ink-section"
              }`}
            >
              <SiteBadge slug={s.slug} taille={22} />
              {s.name}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <Champ
            label="Coût total (€)"
            value={v.cout}
            onChange={set("cout")}
            inputMode="decimal"
            placeholder="5"
          />
          <p className="mt-1.5 text-sm text-ink-muted">
            Ce que coûte une entrée, tout compris. Le détail buy-in / rake /
            prime ne sert qu&apos;aux imports, où il vient du fichier.
          </p>
        </div>

        <p className="kicker mb-2 mt-4">Format</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {FORMATS.map((f) => (
            <Option
              key={f.key}
              actif={v.format === f.key}
              onClick={() => set("format")(f.key)}
            >
              {f.court}
            </Option>
          ))}
        </div>

        {/* La durée réelle d'un niveau dit ce que « turbo » ne dit pas.
            En saisie libre : une liste de valeurs rondes ne sait pas écrire
            les 4, 7, 9 et 11 minutes qu'on croise vraiment. */}
        <div className="mt-4">
          <ChampUnite
            label="Durée d'un niveau"
            unite="min"
            value={v.levelMinutes}
            onChange={set("levelMinutes")}
            inputMode="numeric"
            placeholder="6"
          />
        </div>

        <Champ
          label="Étiquette (facultatif)"
          value={v.tag}
          onChange={set("tag")}
          placeholder="ex. Event, Série"
        />
        <p className="mb-4 mt-1.5 text-sm text-ink-muted">
          Sert à repérer les rendez-vous ponctuels sans les sortir de la grille.
        </p>

        <p className="kicker mb-2">Heure habituelle (facultatif)</p>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            label="Heure de lancement"
            className="w-28 shrink-0"
            value={String(v.usualHour)}
            placeholder="—"
            onChange={(h) => set("usualHour")(h)}
            options={[
              { value: "", label: "—" },
              ...Array.from({ length: 24 }, (_, h) => ({
                value: String(h),
                label: `${h} h`,
              })),
            ]}
          />
          {/* Les quarts d'heure restent affichés même sans heure choisie :
              les griser ferait clignoter la rangée à chaque ouverture. */}
          <div className="grid flex-1 grid-cols-4 gap-2">
            {QUARTS_HEURE.map((m) => (
              <Option
                key={m}
                actif={Number(v.usualMinute) === m}
                onClick={() => set("usualMinute")(m)}
              >
                <span className="num">{String(m).padStart(2, "0")}</span>
              </Option>
            ))}
          </div>
        </div>
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
          ? "border-rose-line bg-rose-bg text-rose-hover"
          : "border-line bg-surface-2 text-ink-section"
      }`}
    >
      {children}
    </button>
  );
}

/** Champ numérique suivi de son unité, posée dans le champ lui-même. */
function ChampUnite({ label, unite, value, onChange, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-muted">{label}</span>
      <span className="relative block">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bd-input num pr-12"
          {...rest}
        />
        <span
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted"
          aria-hidden
        >
          {unite}
        </span>
      </span>
    </label>
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
        className="bd-input num"
        {...rest}
      />
    </label>
  );
}
