"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Eraser, SkipForward, CloudOff, Loader2 } from "lucide-react";

import RangeGrid from "@/components/RangeGrid";
import Select from "@/components/Select";
import { Card, SectionTitle, Button } from "@/components/ui";
import {
  POSITIONS,
  STACK_DEPTHS,
  RANGE_ACTIONS,
  RANGE_BRUSHES,
} from "@/lib/constants";
import {
  QUICK_SELECTS,
  rangeStats,
  melanger,
  basculerSelectionRapide,
  selectionPosee,
  lireRangeTexte,
} from "@/lib/hands";
import {
  spotKey,
  parseSpotKey,
  actionPossible,
  adversairesPossibles,
  adversaireValide,
  demandeAdversaire,
} from "@/lib/spots";
import { COOKIE_DERNIER_SPOT } from "@/lib/constants";
import { pinceauxPour, trouverPinceau } from "@/lib/pinceaux";

export default function RangeEditor({
  initialRanges,
  aVerifierInitial = [],
  spot,
  demo,
}) {
  // Le spot peut venir de l'URL (une main taguée qui ouvre sa range). On ne
  // garde que des valeurs connues : le reste de l'app suppose partout que
  // ces trois clés existent dans les listes.
  const connu = (valeur, liste, defaut) =>
    liste.some((x) => (x.key ?? x) === valeur) ? valeur : defaut;

  const [position, setPosition] = useState(() =>
    connu(spot?.position, POSITIONS, "BTN")
  );
  const [action, setAction] = useState(() => {
    const a = connu(spot?.action, RANGE_ACTIONS, "RFI");
    const p = connu(spot?.position, POSITIONS, "BTN");
    return actionPossible(a, p) ? a : premiereActionPossible(p);
  });
  const [stackDepth, setStackDepth] = useState(() =>
    connu(spot?.stackDepth, STACK_DEPTHS, "100BB")
  );
  // Vide : la range vaut contre n'importe quel adversaire.
  const [vsPosition, setVsPosition] = useState(() => {
    const p = connu(spot?.position, POSITIONS, "BTN");
    const a = connu(spot?.action, RANGE_ACTIONS, "RFI");
    const vs = spot?.vsPosition ?? "";
    return adversaireValide(a, p, vs) ? vs : "";
  });
  // Spots du jeu de base pas encore relus. Enregistrer les valide.
  const [aVerifier, setAVerifier] = useState(() => new Set(aVerifierInitial));
  const [texte, setTexte] = useState("");
  const [illisibles, setIllisibles] = useState([]);
  const [pinceauChoisi, setBrush] = useState(RANGE_BRUSHES[0].key);
  const [frequency, setFrequency] = useState(100);
  const [tuning, setTuning] = useState(null);
  const [ranges, setRanges] = useState(() => ({ ...initialRanges }));
  // Spots modifiés pas encore enregistrés. Une ref pour le minuteur, un état
  // pour l'affichage : les deux bougent ensemble via `marquerModifie`.
  // Spot → numéro de sa dernière retouche : un envoi ne marque un spot
  // enregistré que si personne ne l'a retouché pendant le trajet.
  const aSauver = useRef(new Map());
  const [nbASauver, setNbASauver] = useState(0);
  // "idle" | "attente" | "envoi" | "ok" | "echec"
  const [statut, setStatut] = useState("idle");
  const [error, setError] = useState(null);
  const modeGeste = useRef("peindre");

  const key = spotKey({ position, action, stackDepth, vsPosition });
  // La palette dépend du spot (opens à la Suited, limp en SB). Si le
  // pinceau choisi n'y figure pas, on prend le premier.
  const pinceaux = pinceauxPour(action, position);
  const brush = pinceaux.some((b) => b.key === pinceauChoisi)
    ? pinceauChoisi
    : pinceaux[0].key;
  // useMemo sur l'objet lui-même : sans ça, le `?? {}` crée une nouvelle
  // référence à chaque rendu et invalide le calcul des stats en permanence.
  const cells = useMemo(() => ranges[key] ?? {}, [ranges, key]);
  const stats = useMemo(() => rangeStats(cells), [cells]);
  const adversaires = adversairesPossibles(action, position);
  const rempli = (k) => Object.keys(ranges[k] ?? {}).length > 0;
  const estAVerifier = aVerifier.has(key);
  const suivante = prochaineAVerifier(aVerifier, key);
  // Orange tant que la range n'est pas relue, vert une fois validée.
  const marque = (k) => (aVerifier.has(k) ? "verifier" : rempli(k) ? "ok" : null);

  /** Ouvre un spot donné par sa clé. */
  function ouvrir(k) {
    const cible = parseSpotKey(k);
    setPosition(cible.position);
    setAction(cible.action);
    setStackDepth(cible.stackDepth);
    setVsPosition(cible.vsPosition);
    setError(null);
  }

  // Changer de position ou d'action ne doit jamais laisser un spot
  // impossible à l'écran : on retombe sur l'action, puis l'adversaire, les
  // plus proches qui se jouent.
  function choisirPosition(p) {
    const a = actionPossible(action, p) ? action : premiereActionPossible(p);
    setPosition(p);
    setAction(a);
    if (!adversaireValide(a, p, vsPosition)) setVsPosition("");
  }

  function choisirAction(a) {
    setAction(a);
    if (!adversaireValide(a, position, vsPosition)) setVsPosition("");
  }

  function marquerModifie(k) {
    aSauver.current.set(k, (aSauver.current.get(k) ?? 0) + 1);
    setNbASauver(aSauver.current.size);
    setStatut("attente");
  }

  function updateCells(updater) {
    marquerModifie(key);
    setRanges((prev) => {
      const current = prev[key] ?? {};
      return { ...prev, [key]: updater(current) };
    });
  }

  /**
   * `premier` marque le début d'un geste. C'est lui seul qui décide du mode :
   * repartir d'une main déjà peinte à l'identique efface, sinon on peint. Le
   * reste du glissement garde ce mode, sinon un trait qui repasse sur ses
   * propres cases les effacerait au fur et à mesure.
   */
  function paint(hand, premier = true) {
    if (premier) {
      const existante = cells[hand] ?? {};
      modeGeste.current =
        existante[brush] === frequency && Object.keys(existante).length === 1
          ? "effacer"
          : "peindre";
    }
    const mode = modeGeste.current;

    updateCells((current) => {
      if (mode === "effacer") {
        const { [hand]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [hand]: melanger(current[hand], brush, frequency) };
    });
  }

  function applyQuickSelect(cle) {
    updateCells((current) =>
      basculerSelectionRapide(current, cle, brush, frequency)
    );
  }

  function setHandFrequencies(hand, actions) {
    updateCells((current) => {
      const cleaned = Object.fromEntries(
        Object.entries(actions).filter(([, f]) => f > 0)
      );
      if (Object.keys(cleaned).length === 0) {
        const { [hand]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [hand]: cleaned };
    });
  }

  /** Pose une range écrite en texte avec le pinceau courant. */
  function ecrireRange() {
    const { mains, illisibles: rejetes } = lireRangeTexte(texte);
    setIllisibles(rejetes);
    if (mains.length === 0) return;
    updateCells((current) => {
      const suivante = { ...current };
      for (const { main, frequence: f } of mains) {
        suivante[main] = melanger(suivante[main], brush, f ?? frequency);
      }
      return suivante;
    });
    if (rejetes.length === 0) setTexte("");
  }

  function clearRange() {
    updateCells(() => ({}));
  }

  function copyFrom(sourceKey) {
    const source = ranges[sourceKey];
    if (!source) return;
    updateCells(() => ({ ...source }));
  }

  /**
   * Enregistre des spots. Une erreur réseau (serveur arrêté, connexion
   * coupée) s'affiche au lieu de passer inaperçue : c'est comme ça qu'une
   * soirée de saisie s'est perdue. Les spots en échec restent à envoyer.
   */
  async function sauver(cles, toutes) {
    if (demo) {
      setError("Branche la base Railway pour enregistrer tes ranges.");
      setStatut("echec");
      return;
    }
    if (cles.length === 0) return;
    setStatut("envoi");
    let echec = null;
    for (const k of cles) {
      const spotCible = parseSpotKey(k);
      const version = aSauver.current.get(k);
      try {
        const res = await fetch("/api/ranges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...spotCible, cells: toutes[k] ?? {} }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          echec = body.error ?? "Enregistrement impossible.";
          continue;
        }
        if (aSauver.current.get(k) === version) aSauver.current.delete(k);
        setAVerifier((prev) => {
          if (!prev.has(k)) return prev;
          const suivant = new Set(prev);
          suivant.delete(k);
          return suivant;
        });
      } catch {
        echec = "Serveur injoignable : rien n'est perdu tant que la page reste ouverte, on réessaie à la prochaine modification.";
      }
    }
    setNbASauver(aSauver.current.size);
    setError(echec);
    setStatut(echec ? "echec" : aSauver.current.size > 0 ? "attente" : "ok");
  }

  // Enregistrement automatique : une seconde après la dernière retouche.
  useEffect(() => {
    if (aSauver.current.size === 0) return undefined;
    const minuteur = setTimeout(() => {
      sauver([...aSauver.current.keys()], ranges);
    }, 1000);
    return () => clearTimeout(minuteur);
    // `sauver` lit l'état courant au moment de l'appel ; seule la grille
    // doit relancer le minuteur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranges]);

  // Le spot affiché est écrit dans l'adresse (et dans un cookie) :
  // recharger la page rouvre le même spot au lieu de retomber sur LJ RFI.
  useEffect(() => {
    const q = new URLSearchParams({ position, action, depth: stackDepth });
    if (vsPosition) q.set("vs", vsPosition);
    window.history.replaceState(window.history.state, "", `?${q}`);
    // Un cookie plutôt que le stockage local : le serveur le lit et sert
    // directement le bon spot quand on arrive par le menu, sans afficher
    // d'abord LJ RFI.
    document.cookie = `${COOKIE_DERNIER_SPOT}=${encodeURIComponent(
      q.toString()
    )}; path=/ranges; max-age=31536000; samesite=lax`;
  }, [position, action, stackDepth, vsPosition]);

  // Fermer l'onglet avec des retouches pas encore parties : le navigateur
  // demande confirmation.
  useEffect(() => {
    if (nbASauver === 0) return undefined;
    const retenir = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", retenir);
    return () => window.removeEventListener("beforeunload", retenir);
  }, [nbASauver]);

  /** « Valider » : enregistre le spot affiché même sans retouche. */
  function valider() {
    marquerModifie(key);
    sauver([...aSauver.current.keys()], ranges);
  }

  // Les autres spots déjà remplis, pour la copie.
  const filledSpots = Object.entries(ranges)
    .filter(([k, v]) => k !== key && Object.keys(v ?? {}).length > 0)
    .map(([k]) => k);

  return (
    // Trois colonnes en xl : le spot à gauche, la grille au centre, les
    // outils à droite — serrées autour de la grille plutôt qu'étalées, pour
    // qu'il ne reste pas de vide de part et d'autre d'un carré plafonné. En
    // lg, le spot passe au-dessus de la grille ; sur mobile, tout s'empile
    // dans l'ordre spot → grille → outils.
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6 xl:grid-cols-[250px_minmax(0,540px)_300px] xl:justify-center xl:gap-7">
        {/* Sélecteur de spot */}
        <Card className="p-4 lg:col-start-1 lg:row-start-1 xl:sticky xl:top-6">
        <p className="kicker mb-2">Position</p>
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 lg:flex-wrap lg:overflow-x-visible">
          {POSITIONS.map((p) => (
            <Chip key={p} active={p === position} onClick={() => choisirPosition(p)}>
              {p}
            </Chip>
          ))}
        </div>

        <p className="kicker mb-2">Action</p>
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 lg:flex-wrap lg:overflow-x-visible">
          {RANGE_ACTIONS.map((a) => (
            <Chip
              key={a.key}
              active={a.key === action}
              disabled={!actionPossible(a.key, position)}
              onClick={() => choisirAction(a.key)}
            >
              {a.label}
            </Chip>
          ))}
        </div>

        {demandeAdversaire(action) ? (
          <>
            <p className="kicker mb-2">
              {action === "VS_3BET" ? "3bet par" : "Contre"}
            </p>
            <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 lg:flex-wrap lg:overflow-x-visible">
              <Chip
                active={vsPosition === ""}
                marque={marque(spotKey({ position, action, stackDepth }))}
                onClick={() => setVsPosition("")}
              >
                Tous
              </Chip>
              {adversaires.map((p) => (
                <Chip
                  key={p}
                  active={p === vsPosition}
                  marque={marque(
                    spotKey({ position, action, stackDepth, vsPosition: p })
                  )}
                  onClick={() => setVsPosition(p)}
                >
                  {p}
                </Chip>
              ))}
            </div>
          </>
        ) : null}

        <p className="kicker mb-2">Profondeur</p>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 lg:flex-wrap lg:overflow-x-visible">
          {STACK_DEPTHS.map((d) => (
            <Chip
              key={d.key}
              active={d.key === stackDepth}
              marque={marque(
                spotKey({ position, action, stackDepth: d.key, vsPosition })
              )}
              onClick={() => setStackDepth(d.key)}
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </Card>

      {/* Grille. Elle est carrée : sans plafond, elle prend la largeur de la
          colonne et dépasse le bas de l'écran. On la borne donc aussi par la
          hauteur restante. Bandeau et stats prennent la même largeur qu'elle,
          pour former un seul bloc. */}
      <div className="mx-auto w-full max-w-[min(100%,calc(100dvh-240px),540px)] lg:col-start-1 lg:row-start-2 xl:col-start-2 xl:row-start-1">
        {aVerifier.size > 0 || estAVerifier ? (
          <div
            className={`mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-tile border px-4 py-3 text-sm ${
              estAVerifier
                ? "border-warning/40 bg-warning/10 text-warning"
                : "border-line bg-surface text-ink-muted"
            }`}
          >
            <p className="min-w-0 flex-1">
              {estAVerifier ? (
                <>
                  <span className="font-semibold">À vérifier.</span> Range de
                  base écrite par Claude, pas une sortie de solver. Corrige-la si
                  besoin, puis valide.
                </>
              ) : (
                <>
                  <span className="num">{aVerifier.size}</span>{" "}
                  {aVerifier.size > 1 ? "ranges restent" : "range reste"} à
                  vérifier.
                </>
              )}
            </p>
            {estAVerifier ? (
              <span className="num shrink-0 text-ink-muted">
                {aVerifier.size} à vérifier
              </span>
            ) : null}
            {suivante ? (
              <button
                type="button"
                onClick={() => ouvrir(suivante)}
                className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-pill border border-line bg-surface-2 px-3 text-ink-section"
              >
                <SkipForward size={16} />
                Suivante à vérifier
              </button>
            ) : null}
          </div>
        ) : null}
        <RangeGrid
          cells={cells}
          brushes={pinceaux}
          onPaint={paint}
          onLongPress={(hand) => setTuning(hand)}
        />

        {/* Stats en direct, collées sous la grille */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-line bg-surface px-4 py-3">
          <p className="num text-lg font-bold">
            {stats.percent.toFixed(1).replace(".", ",")} %
            <span className="ml-1.5 text-sm font-normal text-ink-muted">
              {stats.combos} combos
            </span>
          </p>
          {Object.keys(stats.byAction).length > 0 ? (
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {Object.entries(stats.byAction).map(([act, v]) => {
                const brushDef = trouverPinceau(act, pinceaux);
                return (
                  <li key={act} className="flex items-center gap-1.5 text-sm">
                    <span
                      className="size-2.5 rounded-[3px]"
                      style={{ background: brushDef?.color }}
                      aria-hidden
                    />
                    <span className="text-ink-section">
                      {brushDef?.label ?? act}
                    </span>
                    <span className="num text-ink-muted">
                      {v.percent.toFixed(1).replace(".", ",")} %
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">
              Tape une case pour peindre, maintiens pour régler la fréquence.
            </p>
          )}
        </div>
      </div>

      {/* Colonne des réglages */}
      <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 xl:col-start-3">
        {/* Pinceaux */}
        <SectionTitle tight>Pinceau</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        {pinceaux.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setBrush(b.key)}
            aria-pressed={brush === b.key}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-tile border text-sm ${
              brush === b.key
                ? "border-ink/40 bg-surface-3 text-ink"
                : "border-line bg-surface text-ink-section"
            }`}
          >
            <span
              className="size-3 rounded-[2px]"
              style={{ background: b.color }}
              aria-hidden
            />
            {b.label}
          </button>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 flex items-baseline justify-between text-sm text-ink-muted">
          Fréquence du pinceau
          <span className="num text-ink">{frequency} %</span>
        </span>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={frequency}
          onChange={(e) => setFrequency(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </label>

      {/* Sélections rapides */}
      <SectionTitle>Sélection rapide</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {QUICK_SELECTS.map((q) => {
          const hands = q.hands();
          const posee = selectionPosee(cells, hands, brush, frequency);
          return (
            <button
              key={q.key}
              type="button"
              aria-pressed={posee}
              onClick={() => applyQuickSelect(q.key)}
              className={`min-h-[44px] rounded-pill border px-4 text-sm transition-colors ${
                posee
                  ? "border-accent-line bg-accent-soft text-accent-hover"
                  : "border-line bg-surface text-ink-section"
              }`}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      {/* Saisie en texte : plus rapide que peindre case par case quand on
          recopie une range lue ailleurs. */}
      <SectionTitle>Écrire la range</SectionTitle>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={3}
        placeholder="22+, A2s+, KTo+, T8s+, 98s, A5o:50"
        aria-label="Range en texte"
        className="w-full rounded-tile border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/60"
      />
      <p className="mt-1.5 text-sm text-ink-muted">
        Posé avec le pinceau et la fréquence choisis. « :50 » après une main
        fixe sa fréquence.
      </p>
      {illisibles.length > 0 ? (
        <p className="mt-1.5 text-sm text-warning">
          Non reconnu : {illisibles.join(", ")}
        </p>
      ) : null}
      <Button
        type="button"
        className="mt-2 w-full"
        onClick={ecrireRange}
        disabled={texte.trim() === ""}
      >
        Poser sur la grille
      </Button>

      {/* Outils */}
      <SectionTitle>Outils</SectionTitle>
      <div className="grid gap-2">
        {filledSpots.length > 0 ? (
          <div>
            <p className="mb-1.5 text-sm text-ink-muted">
              Copier une range existante
            </p>
            {/* Une action, pas un état : la valeur retombe à vide aussitôt
                pour qu'on puisse recopier deux fois le même spot. */}
            <Select
              label="Copier une range existante"
              value=""
              placeholder="Choisir un spot…"
              onChange={(k) => {
                if (k) copyFrom(k);
              }}
              options={filledSpots.map((k) => {
                const { position: pos, action, stackDepth: depth, vsPosition: vs } =
                  parseSpotKey(k);
                return {
                  value: k,
                  label: vs ? `${pos} vs ${vs}` : pos,
                  sub: [
                    RANGE_ACTIONS.find((x) => x.key === action)?.label ?? action,
                    STACK_DEPTHS.find((x) => x.key === depth)?.label ?? depth,
                  ].join(" · "),
                };
              })}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={clearRange}>
            <Eraser size={18} />
            Vider
          </Button>
          <Button
            type="button"
            onClick={() => {
              const next = STACK_DEPTHS.find((d) => d.key !== stackDepth);
              if (!next) return;
              const target = spotKey({
                position,
                action,
                stackDepth: next.key,
                vsPosition,
              });
              marquerModifie(target);
              setRanges((prev) => ({ ...prev, [target]: { ...cells } }));
              setStackDepth(next.key);
            }}
          >
            <Copy size={18} />
            Dupliquer
          </Button>
        </div>

        {/* Sur grand écran l'enregistrement est une action parmi les autres :
            il se range ici, là où on cherche les boutons. La barre fixe du bas
            n'existe plus que sur mobile, où le pouce ne remonte pas. */}
        <div className="mt-2 max-lg:hidden">
          <EtatEnregistrement
            statut={statut}
            aVerifier={estAVerifier}
            onValider={valider}
          />
        </div>

        {error ? (
          <p className="mt-3 rounded-tile border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            {error}
          </p>
        ) : null}
      </div>
      </div>

      {/* Réserve sous la barre fixe, mobile seulement */}
      <div className="h-28 lg:hidden" />

      {/* Barre d'enregistrement, mobile seulement */}
      <div
        className="fixed inset-x-0 bottom-[76px] z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur lg:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-[560px]">
          <EtatEnregistrement
            statut={statut}
            aVerifier={estAVerifier}
            onValider={valider}
          />
        </div>
      </div>

      {tuning ? (
        <FrequencySheet
          pinceaux={pinceaux}
          hand={tuning}
          actions={cells[tuning] ?? {}}
          onClose={() => setTuning(null)}
          onApply={(actions) => {
            setHandFrequencies(tuning, actions);
            setTuning(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** Rang d'un spot dans l'ordre de l'éditeur : position, action, profondeur, adversaire. */
function rangDuSpot(k) {
  const c = parseSpotKey(k);
  return [
    POSITIONS.indexOf(c.position),
    RANGE_ACTIONS.findIndex((a) => a.key === c.action),
    STACK_DEPTHS.findIndex((d) => d.key === c.stackDepth),
    c.vsPosition ? POSITIONS.indexOf(c.vsPosition) + 1 : 0,
  ];
}

function comparerSpots(a, b) {
  const [ra, rb] = [rangDuSpot(a), rangDuSpot(b)];
  for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
  return 0;
}

/**
 * Le prochain spot à vérifier après `courant`, dans l'ordre de l'éditeur.
 * On repart du début après le dernier ; null quand il n'en reste pas.
 */
function prochaineAVerifier(aVerifier, courant) {
  const liste = [...aVerifier].filter((k) => k !== courant).sort(comparerSpots);
  if (liste.length === 0) return null;
  return liste.find((k) => comparerSpots(k, courant) > 0) ?? liste[0];
}

/**
 * Où en est l'enregistrement automatique. Sur une range de base pas encore
 * relue, le bouton « Valider » reste : la valider sans la retoucher doit
 * rester possible.
 */
function EtatEnregistrement({ statut, aVerifier, onValider }) {
  if (aVerifier && statut !== "envoi") {
    return (
      <Button type="button" variant="primary" className="w-full" onClick={onValider}>
        <Check size={18} />
        Valider la range
      </Button>
    );
  }
  const textes = {
    idle: { icone: Check, texte: "Enregistrement automatique", ton: "text-ink-muted" },
    attente: { icone: Loader2, texte: "Modifications en cours…", ton: "text-ink-muted" },
    envoi: { icone: Loader2, texte: "Enregistrement…", ton: "text-ink-muted" },
    ok: { icone: Check, texte: "Tout est enregistré", ton: "text-positive" },
    echec: { icone: CloudOff, texte: "Pas enregistré", ton: "text-warning" },
  };
  const { icone: Icone, texte, ton } = textes[statut] ?? textes.idle;
  const tourne = statut === "attente" || statut === "envoi";
  return (
    <div
      role="status"
      className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-tile border border-line bg-surface text-sm ${ton}`}
    >
      <Icone size={18} className={tourne ? "animate-spin" : undefined} />
      {texte}
      {statut === "echec" ? (
        <button type="button" onClick={onValider} className="ml-1 underline">
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

function premiereActionPossible(position) {
  return RANGE_ACTIONS.find((a) => actionPossible(a.key, position))?.key ?? "RFI";
}

/**
 * `marque` : une pastille quand ce spot a une range — orange si elle est
 * encore à vérifier, verte si elle est relue. On voit d'un coup d'oeil ce
 * qui reste à faire.
 */
function Chip({ active, children, onClick, disabled = false, marque = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={`relative min-h-[40px] shrink-0 rounded-pill border px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "border-negative/40 bg-negative/15 text-negative"
          : "border-line bg-surface-2 text-ink-section"
      }`}
    >
      {children}
      {marque ? (
        <span
          className={`absolute right-1.5 top-1.5 size-1.5 rounded-full ${
            marque === "verifier" ? "bg-warning" : "bg-positive"
          }`}
          aria-label={marque === "verifier" ? "à vérifier" : "validée"}
        />
      ) : null}
    </button>
  );
}

/** Réglage des fréquences d'une main, action par action. */
function FrequencySheet({ hand, actions, pinceaux, onClose, onApply }) {
  const [draft, setDraft] = useState(() => ({ ...actions }));
  const total = Object.entries(draft)
    .filter(([k]) => k !== "fold")
    .reduce((s, [, v]) => s + (v ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        className="flottant relative w-full max-w-[480px] rounded-t-xl border-t border-line bg-surface p-5 lg:rounded-xl lg:border"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <h2 className="mb-1 text-xl font-bold">{hand}</h2>
        <p className="mb-4 text-sm text-ink-muted">
          Répartis les fréquences entre les actions.
        </p>

        {pinceaux.filter((b) => b.key !== "fold").map((b) => (
          <label key={b.key} className="mb-4 block">
            <span className="mb-1.5 flex items-center gap-2 text-sm">
              <span
                className="size-2.5 rounded-[2px]"
                style={{ background: b.color }}
                aria-hidden
              />
              <span className="flex-1 text-ink-section">{b.label}</span>
              <span className="num text-ink">{draft[b.key] ?? 0} %</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={draft[b.key] ?? 0}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [b.key]: Number(e.target.value) }))
              }
              className="w-full accent-accent"
            />
          </label>
        ))}

        {/* Le fold n'a pas de curseur : c'est ce qui reste. L'afficher évite
            d'avoir à faire la soustraction de tête. */}
        <p
          className={`mb-3 text-sm ${total > 100 ? "text-warning" : "text-ink-muted"}`}
        >
          {total > 100 ? (
            <>
              Total : <span className="num">{total} %</span> — au-dessus de
              100 %
            </>
          ) : (
            <>
              Fold : <span className="num">{100 - total} %</span>
            </>
          )}
        </p>

        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={() => onApply(draft)}
        >
          Appliquer
        </Button>
      </div>
    </div>
  );
}
