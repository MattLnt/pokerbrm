"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import Popover from "@/components/Popover";

/**
 * Calendrier maison, en remplacement de `<input type="date">`.
 *
 * Le champ natif ouvre le calendrier du système : un chrome différent sur
 * chaque navigateur, et sur mobile un sélecteur plein écran qu'on ne peut ni
 * mettre à la charte ni traduire. Celui-ci est une grille de boutons.
 *
 * La valeur reste au format `AAAA-MM-JJ`, comme le champ natif, pour que les
 * appels d'API ne changent pas. Tout est manipulé en date locale : passer par
 * `new Date("2026-10-28")` la lirait en UTC et décalerait le jour d'un cran
 * selon le fuseau.
 */

// La semaine commence le lundi. Deux « M » : mardi et mercredi.
const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function enTexte(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function depuisTexte(v) {
  const [a, m, j] = String(v ?? "")
    .split("-")
    .map(Number);
  if (!a || !m || !j) return null;
  const d = new Date(a, m - 1, j);
  return Number.isNaN(d.getTime()) ? null : d;
}

function memeJour(a, b) {
  return Boolean(a && b) && enTexte(a) === enTexte(b);
}

/** Les 42 cases du mois affiché, lundi en tête. */
function grilleDuMois(ancre) {
  const premier = new Date(ancre.getFullYear(), ancre.getMonth(), 1);
  // getDay() rend 0 pour dimanche ; on veut 6, pour que lundi vaille 0.
  const decalage = (premier.getDay() + 6) % 7;

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(premier);
    d.setDate(1 - decalage + i);
    return d;
  });
}

function libelleLong(d) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export default function DatePicker({
  value,
  onChange,
  label,
  className = "",
  disabled = false,
}) {
  const declencheur = useRef(null);
  const [ouvert, setOuvert] = useState(false);

  const choisie = depuisTexte(value);

  function fermer({ rendreLeFocus = true } = {}) {
    setOuvert(false);
    if (rendreLeFocus) declencheur.current?.focus();
  }

  return (
    <>
      <button
        ref={declencheur}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-label={label}
        disabled={disabled}
        onClick={() => (ouvert ? fermer() : setOuvert(true))}
        className={`bd-select flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={`truncate ${choisie ? "" : "text-ink-muted"}`}>
          {choisie ? libelleLong(choisie) : "Choisir une date"}
        </span>
        <CalendarDays
          size={17}
          aria-hidden
          className="shrink-0 text-ink-muted"
        />
      </button>

      {ouvert ? (
        <Calendrier
          ancre={declencheur}
          choisie={choisie}
          label={label}
          onFermer={fermer}
          onChoisir={(d) => {
            onChange(enTexte(d));
            fermer();
          }}
        />
      ) : null}
    </>
  );
}

function Calendrier({ ancre, choisie, label, onFermer, onChoisir }) {
  const aujourdhui = new Date();
  const depart = choisie ?? aujourdhui;

  const [mois, setMois] = useState(
    () => new Date(depart.getFullYear(), depart.getMonth(), 1)
  );
  // Le jour que les flèches déplacent, et qui porte le focus.
  const [curseur, setCurseur] = useState(() => depart);
  const cases = useRef(new Map());

  useEffect(() => {
    cases.current.get(enTexte(curseur))?.focus();
  }, [curseur]);

  function bouger(pas) {
    const d = new Date(curseur);
    d.setDate(curseur.getDate() + pas);
    setMois(new Date(d.getFullYear(), d.getMonth(), 1));
    setCurseur(d);
  }

  function changerMois(pas) {
    const m = new Date(mois.getFullYear(), mois.getMonth() + pas, 1);
    setMois(m);
    // Le curseur suit le mois en gardant son jour quand celui-ci existe :
    // un 31 janvier ne doit pas devenir un 3 mars.
    const d = new Date(m.getFullYear(), m.getMonth(), curseur.getDate());
    setCurseur(d.getMonth() === m.getMonth() ? d : m);
  }

  function surTouche(e) {
    const pas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (pas[e.key] !== undefined) {
      e.preventDefault();
      bouger(pas[e.key]);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      changerMois(e.key === "PageUp" ? -1 : 1);
    } else if (e.key === "Tab") {
      onFermer({ rendreLeFocus: false });
    }
  }

  return (
    <Popover
      ancre={ancre}
      onClose={onFermer}
      suivreLargeur={false}
      role="dialog"
      aria-label={label ?? "Choisir une date"}
      className="w-[19.5rem] p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <FlecheMois sens={-1} onClick={() => changerMois(-1)} />
        <p className="text-base font-semibold capitalize">
          {MOIS[mois.getMonth()]} {mois.getFullYear()}
        </p>
        <FlecheMois sens={1} onClick={() => changerMois(1)} />
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1" aria-hidden>
        {JOURS.map((j, i) => (
          <span
            key={`${j}-${i}`}
            className="kicker grid h-7 place-items-center text-ink-muted/70"
          >
            {j}
          </span>
        ))}
      </div>

      {/* Une seule case est atteignable au tabulateur : les flèches font le
          reste, comme dans un vrai calendrier. */}
      <div className="grid grid-cols-7 gap-1" onKeyDown={surTouche}>
        {grilleDuMois(mois).map((d) => {
          const horsMois = d.getMonth() !== mois.getMonth();
          const retenu = memeJour(d, choisie);
          const cestAujourdhui = memeJour(d, aujourdhui);
          return (
            <button
              key={enTexte(d)}
              ref={(el) => {
                const cle = enTexte(d);
                if (el) cases.current.set(cle, el);
                else cases.current.delete(cle);
              }}
              type="button"
              tabIndex={memeJour(d, curseur) ? 0 : -1}
              aria-label={libelleLong(d)}
              aria-current={cestAujourdhui ? "date" : undefined}
              aria-pressed={retenu}
              onClick={() => onChoisir(d)}
              className={`num grid h-9 place-items-center rounded-sm text-base transition-colors ${
                retenu
                  ? "bg-rose-bg font-bold text-rose-hover ring-1 ring-rose-line"
                  : horsMois
                    ? "text-ink-muted/40 hover:bg-surface-2"
                    : "text-ink-section hover:bg-surface-2"
              } ${cestAujourdhui && !retenu ? "ring-1 ring-line-strong" : ""}`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Un mouvement se saisit presque toujours le jour même ou la veille :
          autant ne pas faire chercher dans la grille. */}
      <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-line pt-3">
        {[
          { label: "Aujourd’hui", recul: 0 },
          { label: "Hier", recul: 1 },
          { label: "Avant-hier", recul: 2 },
        ].map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => {
              const d = new Date(aujourdhui);
              d.setDate(aujourdhui.getDate() - r.recul);
              onChoisir(d);
            }}
            className="min-h-[36px] rounded-sm border border-line bg-surface-2 text-sm text-ink-section transition-colors hover:border-ink-muted"
          >
            {r.label}
          </button>
        ))}
      </div>
    </Popover>
  );
}

function FlecheMois({ sens, onClick }) {
  const Icone = sens < 0 ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={sens < 0 ? "Mois précédent" : "Mois suivant"}
      className="grid size-9 place-items-center rounded-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <Icone size={18} />
    </button>
  );
}
