"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
  Eraser,
  AlertTriangle,
} from "lucide-react";

import Feuille from "@/components/Feuille";
import Select from "@/components/Select";
import { Button } from "@/components/ui";
import { Champ, ChampHeure, Option, IconeBouton } from "@/components/champs";
import { PLAN_KINDS, identiteCreneau } from "@/lib/constants";
import {
  minutesDepuisTexte,
  texteDepuisMinutes,
  normaliserFin,
  duree,
  libelleCreneau,
  libelleJourLong,
  libelleJourCourt,
} from "@/lib/agenda";
import { formatDuree } from "@/lib/format";

/**
 * Une journée de l'agenda : ce qui y est posé, et le formulaire pour en
 * ajouter.
 *
 * Les deux flèches de l'en-tête passent au jour suivant sans refermer la
 * feuille — on planifie une semaine d'affilée, pas une journée isolée.
 */
export default function JourFeuille({
  jour,
  source,
  habitudes = {},
  projets = [],
  pending,
  premier = false,
  dernier = false,
  onClose,
  onEnregistrer,
  onSupprimer,
  onCopier,
  onVider,
  onNaviguer,
}) {
  const [edition, setEdition] = useState(null);

  return (
    <Feuille
      titre={libelleJourLong(jour.jour)}
      onClose={onClose}
      avant={
        <div className="-ml-2 flex shrink-0">
          <IconeBouton
            label="Jour précédent"
            onClick={() => onNaviguer(-1)}
            disabled={premier}
          >
            <ChevronLeft size={20} />
          </IconeBouton>
          <IconeBouton
            label="Jour suivant"
            onClick={() => onNaviguer(1)}
            disabled={dernier}
          >
            <ChevronRight size={20} />
          </IconeBouton>
        </div>
      }
      pied={
        <div className="flex flex-wrap gap-2">
          {source ? (
            <Button onClick={() => onCopier(source)} disabled={pending}>
              <Copy size={17} />
              Copier {libelleJourCourt(source)}
            </Button>
          ) : null}
          {jour.blocs.length > 0 ? (
            <Button variant="ghost" onClick={onVider} disabled={pending}>
              <Eraser size={17} />
              Vider la journée
            </Button>
          ) : null}
        </div>
      }
    >
      {jour.conflit ? (
        <p className="mb-3 flex items-center gap-2.5 rounded-tile border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle size={17} className="shrink-0" />
          Deux créneaux de cette journée se chevauchent.
        </p>
      ) : null}

      {jour.blocs.length > 0 ? (
        <>
          <p className="kicker mb-2">
            {formatDuree(jour.total)} de prévu
          </p>
          <ul className="mb-5 grid gap-2">
            {jour.blocs.map((bloc) => (
              <LigneCreneau
                key={bloc.id}
                bloc={bloc}
                pending={pending}
                enEdition={edition?.id === bloc.id}
                onEditer={() => setEdition(bloc)}
                onSupprimer={() => onSupprimer(bloc.id)}
              />
            ))}
          </ul>
        </>
      ) : (
        <p className="mb-5 rounded-tile border border-line bg-surface-2 px-4 py-3.5 text-sm text-ink-muted">
          Journée libre. Pose un créneau ci-dessous, ou recopie une journée
          déjà remplie.
        </p>
      )}

      <Formulaire
        key={edition?.id ?? "nouveau"}
        jour={jour.jour}
        bloc={edition}
        habitudes={habitudes}
        projets={projets}
        pending={pending}
        onAnnuler={() => setEdition(null)}
        onEnregistrer={(valeurs, apres) =>
          onEnregistrer(valeurs, () => {
            setEdition(null);
            apres?.();
          })
        }
      />
    </Feuille>
  );
}

function LigneCreneau({ bloc, pending, enEdition, onEditer, onSupprimer }) {
  const identite = identiteCreneau(bloc.kind);
  const dessous = [formatDuree(duree(bloc)), bloc.projet, bloc.note]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className={`flex items-center gap-3 rounded-tile border bg-surface-2 py-1.5 pl-3 pr-1 ${
        enEdition ? "border-rose-line" : "border-line"
      }`}
    >
      <span
        className="h-8 w-1.5 shrink-0 rounded-pill"
        style={{ backgroundColor: identite.couleur }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">
          {identite.label}{" "}
          <span className="num font-normal text-ink-section">
            {libelleCreneau(bloc)}
          </span>
        </p>
        {dessous ? (
          <p className="truncate text-sm text-ink-muted">{dessous}</p>
        ) : null}
      </div>
      <IconeBouton label="Modifier" onClick={onEditer} disabled={pending}>
        <Pencil size={17} />
      </IconeBouton>
      <IconeBouton label="Supprimer" onClick={onSupprimer} disabled={pending}>
        <Trash2 size={17} />
      </IconeBouton>
    </li>
  );
}

/**
 * Le formulaire, en ajout comme en modification.
 *
 * À l'ajout, les heures sont préremplies avec celles du dernier créneau du
 * même type déjà planifié : c'est la seule valeur par défaut qui ne soit pas
 * inventée. Sans précédent, les champs restent vides.
 */
function Formulaire({
  jour,
  bloc,
  habitudes,
  projets,
  pending,
  onAnnuler,
  onEnregistrer,
}) {
  const modification = Boolean(bloc?.id);
  const typeDepart = bloc?.kind ?? PLAN_KINDS[0].key;

  const [kind, setKind] = useState(typeDepart);
  const [heures, setHeures] = useState(() => ({
    start: bloc ? texteDepuisMinutes(bloc.startMinute) : (habitudes[typeDepart]?.start ?? ""),
    end: bloc ? texteDepuisMinutes(bloc.endMinute) : (habitudes[typeDepart]?.end ?? ""),
  }));
  const [projectId, setProjectId] = useState(bloc?.projectId ?? "");
  const [note, setNote] = useState(bloc?.note ?? "");
  const [probleme, setProbleme] = useState(null);

  /** Changer de type en ajout rappelle les heures habituelles de ce type. */
  function choisirType(prochain) {
    setKind(prochain);
    if (modification) return;
    const habitude = habitudes[prochain];
    if (habitude) setHeures({ start: habitude.start, end: habitude.end });
  }

  const debut = minutesDepuisTexte(heures.start);
  const fin = minutesDepuisTexte(heures.end);
  const minutes =
    debut !== null && fin !== null ? normaliserFin(debut, fin) - debut : null;

  function envoyer(e) {
    e.preventDefault();

    if (debut === null) return setProbleme("Heure de début illisible (ex. 19:30).");
    if (fin === null) return setProbleme("Heure de fin illisible (ex. 23:00).");
    setProbleme(null);

    onEnregistrer(
      {
        id: bloc?.id,
        jour,
        kind,
        start: heures.start,
        end: heures.end,
        projectId: kind === "PROJET" ? projectId : null,
        note,
      },
      () => {
        if (modification) return;
        setNote("");
      }
    );
  }

  return (
    <form onSubmit={envoyer} className="border-t border-line pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="kicker">
          {modification ? "Modifier le créneau" : "Nouveau créneau"}
        </p>
        {modification ? (
          <button
            type="button"
            onClick={onAnnuler}
            className="text-sm text-accent-hover"
          >
            Annuler
          </button>
        ) : null}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {PLAN_KINDS.map((k) => (
          <Option
            key={k.key}
            actif={kind === k.key}
            onClick={() => choisirType(k.key)}
            className="flex items-center justify-center gap-1.5"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: k.couleur }}
              aria-hidden
            />
            <span className="truncate">{k.pluriel}</span>
          </Option>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChampHeure
          label="Début"
          value={heures.start}
          onChange={(v) => setHeures((h) => ({ ...h, start: v }))}
          placeholder="19:00"
        />
        <ChampHeure
          label="Fin"
          value={heures.end}
          onChange={(v) => setHeures((h) => ({ ...h, end: v }))}
          placeholder="01:30"
        />
      </div>
      <p className="mt-1.5 text-sm text-ink-muted">
        {minutes !== null
          ? `${formatDuree(minutes)} de créneau.`
          : "Une fin avant le début veut dire le lendemain : 21:00 → 02:00."}
      </p>

      {kind === "PROJET" && projets.length > 0 ? (
        <div className="mt-4">
          <p className="mb-1.5 text-sm text-ink-muted">Projet (facultatif)</p>
          <Select
            label="Projet du créneau"
            value={projectId}
            onChange={setProjectId}
            placeholder="Aucun"
            options={[
              { value: "", label: "Aucun" },
              ...projets.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </div>
      ) : null}

      <div className="mt-4">
        <Champ
          label="Note (facultatif)"
          value={note}
          onChange={setNote}
          placeholder={identiteCreneau(kind).aide}
          maxLength={300}
        />
      </div>

      {probleme ? (
        <p className="mt-3 text-sm text-warning">{probleme}</p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        className="mt-4 w-full"
        disabled={pending}
      >
        {pending
          ? "Enregistrement…"
          : modification
            ? "Enregistrer"
            : "Ajouter le créneau"}
      </Button>
    </form>
  );
}
