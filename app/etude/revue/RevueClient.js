"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Pencil, ExternalLink, Check, Undo2 } from "lucide-react";

import { Card, SectionTitle, Button, EmptyState } from "@/components/ui";
import {
  POSITIONS,
  RANGE_ACTIONS,
  STACK_DEPTHS,
  TAGGED_HAND_STATUSES,
} from "@/lib/constants";
import { spotDepuisLibelle } from "@/lib/hands";
import { formatRelativeDays } from "@/lib/format";

const FILTRES = [
  { key: "A_REVOIR", label: "À revoir" },
  { key: "REVUE", label: "Revues" },
  { key: "TOUTES", label: "Toutes" },
];

function libelleProfondeur(cle) {
  return STACK_DEPTHS.find((d) => d.key === cle)?.label ?? null;
}

/** Pastille de filtre, reprise de l'éditeur de ranges. */
function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[40px] shrink-0 rounded-pill border px-4 text-sm transition-colors ${
        active
          ? "border-negative/40 bg-negative/15 text-negative"
          : "border-line bg-surface-2 text-ink-section"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Formulaire d'une main, en création comme en modification.
 *
 * Le spot se compose de pastilles plutôt que d'un champ libre : c'est ce qui
 * permet d'ouvrir ensuite la range correspondante. Un spot tapé à la main
 * resterait une chaîne que personne ne sait relier à l'éditeur.
 */
function FormulaireMain({ main, onAnnuler, onEnregistrer, pending, erreur }) {
  const spotConnu = main ? spotDepuisLibelle(main.spot, {
    positions: POSITIONS,
    actions: RANGE_ACTIONS,
  }) : null;

  const [position, setPosition] = useState(spotConnu?.position ?? "BTN");
  const [action, setAction] = useState(spotConnu?.action ?? "RFI");
  const [stackDepth, setStackDepth] = useState(main?.stackDepth ?? "60BB_PLUS");
  const [description, setDescription] = useState(main?.description ?? "");
  const [handHistory, setHandHistory] = useState(main?.handHistory ?? "");
  const [link, setLink] = useState(main?.link ?? "");

  function soumettre(e) {
    e.preventDefault();
    const libelle = RANGE_ACTIONS.find((a) => a.key === action)?.label ?? action;
    onEnregistrer({
      id: main?.id,
      spot: `${position} · ${libelle}`,
      stackDepth,
      description,
      handHistory,
      link,
    });
  }

  return (
    <form onSubmit={soumettre}>
      <p className="kicker mb-2">Position</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {POSITIONS.map((p) => (
          <Chip key={p} active={p === position} onClick={() => setPosition(p)}>
            {p}
          </Chip>
        ))}
      </div>

      <p className="kicker mb-2">Action</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {RANGE_ACTIONS.map((a) => (
          <Chip
            key={a.key}
            active={a.key === action}
            onClick={() => setAction(a.key)}
          >
            {a.label}
          </Chip>
        ))}
      </div>

      <p className="kicker mb-2">Profondeur</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {STACK_DEPTHS.map((d) => (
          <Chip
            key={d.key}
            active={d.key === stackDepth}
            onClick={() => setStackDepth(d.key)}
          >
            {d.label}
          </Chip>
        ))}
      </div>

      <label className="mb-4 block">
        <span className="kicker mb-2 block">Ce qui t&apos;a gêné</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Call ou fold ? J'ai payé et je suis dominé."
          className="bd-textarea"
        />
      </label>

      <label className="mb-4 block">
        <span className="kicker mb-2 block">Historique de main</span>
        <textarea
          value={handHistory}
          onChange={(e) => setHandHistory(e.target.value)}
          placeholder="Colle le texte de la main (facultatif)"
          className="bd-textarea font-mono text-sm"
        />
      </label>

      <label className="mb-4 block">
        <span className="kicker mb-2 block">Lien</span>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Replayer, solver, forum… (facultatif)"
          className="bd-input"
        />
      </label>

      {erreur ? <p className="mb-3 text-sm text-warning">{erreur}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={onAnnuler}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

/** Détail d'une main, avec ses actions. */
function DetailMain({ main, onModifier, onBasculerStatut, onSupprimer, pending }) {
  const [confirmation, setConfirmation] = useState(false);
  const spot = spotDepuisLibelle(main.spot, {
    positions: POSITIONS,
    actions: RANGE_ACTIONS,
  });
  const revue = main.status === "REVUE";

  return (
    <div>
      <p className="kicker mb-2">
        {libelleProfondeur(main.stackDepth) ?? "Profondeur libre"}
      </p>
      <h3 className="text-xl font-semibold tracking-[var(--ls-heading)]">
        {main.spot}
      </h3>
      <p className="mt-1 text-sm text-ink-muted">
        Mise de côté {formatRelativeDays(main.createdAt)}
      </p>

      {main.description ? (
        <p className="mt-4 whitespace-pre-wrap text-base leading-[var(--lh-normal)]">
          {main.description}
        </p>
      ) : null}

      {main.handHistory ? (
        <>
          <p className="kicker mb-2 mt-5">Historique</p>
          {/* Hauteur bornée : une main collée fait parfois cent lignes et
              repousserait les actions hors de l'écran. */}
          <pre className="scroll-fin max-h-64 overflow-auto rounded-tile bg-bg-sunken p-3 font-mono text-sm leading-[var(--lh-snug)] text-ink-section">
            {main.handHistory}
          </pre>
        </>
      ) : null}

      <div className="mt-5 grid gap-2">
        <Button
          type="button"
          variant={revue ? "secondary" : "primary"}
          onClick={() => onBasculerStatut(main)}
          disabled={pending}
        >
          {revue ? <Undo2 size={18} /> : <Check size={18} />}
          {revue ? "Remettre à revoir" : "Marquer comme revue"}
        </Button>

        {spot && main.stackDepth ? (
          <Button
            as={Link}
            href={`/ranges?position=${spot.position}&action=${spot.action}&depth=${main.stackDepth}`}
          >
            <ExternalLink size={18} />
            Ouvrir la range
          </Button>
        ) : null}

        {main.link ? (
          <Button
            as="a"
            href={main.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={18} />
            Ouvrir le lien
          </Button>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={() => onModifier(main)}>
            <Pencil size={18} />
            Modifier
          </Button>
          {/* Deux temps plutôt qu'une boîte de dialogue : la suppression est
              définitive et le navigateur n'a pas à bloquer la page. */}
          <Button
            type="button"
            variant={confirmation ? "danger" : "secondary"}
            onClick={() => {
              if (confirmation) onSupprimer(main);
              else setConfirmation(true);
            }}
            onBlur={() => setConfirmation(false)}
            disabled={pending}
          >
            <Trash2 size={18} />
            {confirmation ? "Confirmer" : "Supprimer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RevueClient({ mains, demo }) {
  const router = useRouter();
  const [filtre, setFiltre] = useState("A_REVOIR");
  const [recherche, setRecherche] = useState("");
  const [selectionId, setSelectionId] = useState(mains[0]?.id ?? null);
  const [mode, setMode] = useState("detail"); // detail | creation | edition
  const [erreur, setErreur] = useState(null);
  const [pending, startTransition] = useTransition();

  const visibles = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return mains.filter((m) => {
      if (filtre !== "TOUTES" && m.status !== filtre) return false;
      if (!terme) return true;
      return [m.spot, m.description, m.handHistory]
        .filter(Boolean)
        .some((champ) => champ.toLowerCase().includes(terme));
    });
  }, [mains, filtre, recherche]);

  const selection =
    mains.find((m) => m.id === selectionId) ?? visibles[0] ?? null;

  const comptes = useMemo(
    () => ({
      A_REVOIR: mains.filter((m) => m.status === "A_REVOIR").length,
      REVUE: mains.filter((m) => m.status === "REVUE").length,
      TOUTES: mains.length,
    }),
    [mains]
  );

  function appeler(methode, corps, apres) {
    if (demo) {
      setErreur("Branche la base Railway pour enregistrer tes mains.");
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const res = await fetch("/api/tagged-hands", {
        method: methode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErreur(body.error ?? "Enregistrement impossible.");
        return;
      }
      apres?.(await res.json().catch(() => ({})));
      router.refresh();
    });
  }

  function enregistrer(valeurs) {
    if (valeurs.id) {
      appeler("PATCH", valeurs, () => setMode("detail"));
    } else {
      appeler("POST", valeurs, (reponse) => {
        if (reponse?.id) setSelectionId(reponse.id);
        setMode("detail");
      });
    }
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
      {/* Liste */}
      <div>
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {FILTRES.map((f) => (
              <Chip
                key={f.key}
                active={filtre === f.key}
                onClick={() => setFiltre(f.key)}
              >
                {f.label}
                <span className="num ml-2 text-ink-muted">
                  {comptes[f.key]}
                </span>
              </Chip>
            ))}
          </div>
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Chercher un spot, une note, une main"
            className="bd-input"
          />
        </Card>

        <div className="mt-3 grid gap-2">
          {visibles.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="Aucune main ici"
              description={
                filtre === "A_REVOIR"
                  ? "Tout est revu. Mets une main de côté pendant que tu joues, tu la retrouveras ici."
                  : "Aucune main ne correspond à ce filtre."
              }
              action={
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setMode("creation")}
                >
                  <Plus size={18} />
                  Main à revoir
                </Button>
              }
            />
          ) : (
            visibles.map((main) => {
              const actif = selection?.id === main.id;
              return (
                <Card
                  as="button"
                  key={main.id}
                  type="button"
                  liftable
                  onClick={() => {
                    setSelectionId(main.id);
                    setMode("detail");
                  }}
                  className={`w-full p-4 text-left ${
                    actif ? "border-accent-line bg-accent-soft" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-medium">{main.spot}</p>
                    <span className="num shrink-0 text-sm text-ink-muted">
                      {libelleProfondeur(main.stackDepth) ?? "—"}
                    </span>
                  </div>
                  {main.description ? (
                    <p className="mt-1 truncate text-sm text-ink-muted">
                      {main.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                    <span
                      className={`size-1.5 rounded-full ${
                        main.status === "A_REVOIR" ? "bg-negative" : "bg-positive"
                      }`}
                      aria-hidden
                    />
                    {TAGGED_HAND_STATUSES.find((s) => s.key === main.status)
                      ?.label ?? main.status}
                    <span aria-hidden>·</span>
                    {formatRelativeDays(main.createdAt)}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Détail et saisie */}
      <div className="max-lg:mt-6 lg:sticky lg:top-6">
        <SectionTitle
          tight
          action={
            mode === "detail" ? (
              <button
                type="button"
                onClick={() => setMode("creation")}
                className="flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-accent-hover"
              >
                <Plus size={16} />
                Main à revoir
              </button>
            ) : null
          }
        >
          {mode === "creation"
            ? "Nouvelle main"
            : mode === "edition"
              ? "Modifier"
              : "Détail"}
        </SectionTitle>

        <Card className="p-4">
          {mode === "creation" ? (
            <FormulaireMain
              onAnnuler={() => setMode("detail")}
              onEnregistrer={enregistrer}
              pending={pending}
              erreur={erreur}
            />
          ) : mode === "edition" && selection ? (
            <FormulaireMain
              key={selection.id}
              main={selection}
              onAnnuler={() => setMode("detail")}
              onEnregistrer={enregistrer}
              pending={pending}
              erreur={erreur}
            />
          ) : selection ? (
            <>
              <DetailMain
                main={selection}
                pending={pending}
                onModifier={() => setMode("edition")}
                onBasculerStatut={(main) =>
                  appeler("PATCH", {
                    id: main.id,
                    status: main.status === "REVUE" ? "A_REVOIR" : "REVUE",
                  })
                }
                onSupprimer={(main) =>
                  appeler("DELETE", { id: main.id }, () => setSelectionId(null))
                }
              />
              {erreur ? (
                <p className="mt-3 text-sm text-warning">{erreur}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              Choisis une main dans la liste, ou mets-en une de côté.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
