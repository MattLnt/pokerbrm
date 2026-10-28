"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import Popover from "@/components/Popover";

/**
 * Sélecteur maison, en remplacement de `<select>`.
 *
 * Le menu natif est dessiné par le système : fond blanc sur mobile, police
 * de l'OS, impossible à mettre à la charte. Celui-ci est une liste de
 * boutons dans un panneau flottant, avec le clavier d'un vrai `listbox` —
 * flèches, Début / Fin, Entrée, Échap — et le focus déplacé sur l'option
 * courante à l'ouverture.
 *
 * `options` : `[{ value, label, sub? }]`. Une option de valeur `""` sert
 * d'entrée « aucun » et s'affiche comme les autres.
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder = "Choisir…",
  label,
  variant = "input",
  align = "start",
  className = "",
  disabled = false,
}) {
  const declencheur = useRef(null);
  const [ouvert, setOuvert] = useState(false);
  // L'index à focaliser à l'ouverture : l'option courante, ou la première.
  const [actif, setActif] = useState(0);
  const listeId = useId();

  const choisie = options.find((o) => o.value === value) ?? null;

  function ouvrir(index) {
    if (disabled) return;
    const i = options.findIndex((o) => o.value === value);
    setActif(index ?? (i >= 0 ? i : 0));
    setOuvert(true);
  }

  function fermer({ rendreLeFocus = true } = {}) {
    setOuvert(false);
    if (rendreLeFocus) declencheur.current?.focus();
  }

  function surToucheDeclencheur(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      ouvrir(e.key === "ArrowDown" ? undefined : options.length - 1);
    }
  }

  const apparence =
    variant === "pill"
      ? "flex items-center gap-1.5 rounded-pill border border-line bg-surface-2 py-2 pl-4 pr-3 text-sm text-ink-section transition-colors hover:border-ink-muted"
      : "bd-select flex items-center justify-between gap-2 text-left";

  return (
    <>
      <button
        ref={declencheur}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-controls={ouvert ? listeId : undefined}
        aria-label={label}
        disabled={disabled}
        onClick={() => (ouvert ? fermer() : ouvrir())}
        onKeyDown={surToucheDeclencheur}
        className={`${apparence} ${className}`}
      >
        <span
          className={`truncate ${choisie ? "" : "text-ink-muted"}`}
        >
          {choisie ? choisie.label : placeholder}
        </span>
        <ChevronDown
          size={variant === "pill" ? 15 : 17}
          aria-hidden
          className={`shrink-0 text-ink-muted transition-transform ${
            ouvert ? "rotate-180" : ""
          }`}
        />
      </button>

      {ouvert ? (
        <Liste
          id={listeId}
          ancre={declencheur}
          align={align}
          options={options}
          value={value}
          actif={actif}
          label={label}
          onFermer={fermer}
          onChoisir={(v) => {
            onChange(v);
            fermer();
          }}
        />
      ) : null}
    </>
  );
}

function Liste({
  id,
  ancre,
  align,
  options,
  value,
  actif,
  label,
  onFermer,
  onChoisir,
}) {
  const items = useRef([]);

  // Le focus entre dans la liste à l'ouverture : les flèches pilotent alors
  // les options et non la page derrière.
  useEffect(() => {
    items.current[actif]?.focus();
  }, [actif]);

  function surTouche(e, i) {
    const aller = (j) => {
      e.preventDefault();
      const n = options.length;
      items.current[((j % n) + n) % n]?.focus();
    };

    if (e.key === "ArrowDown") aller(i + 1);
    else if (e.key === "ArrowUp") aller(i - 1);
    else if (e.key === "Home") aller(0);
    else if (e.key === "End") aller(options.length - 1);
    else if (e.key === "Tab") onFermer({ rendreLeFocus: false });
  }

  return (
    <Popover
      ancre={ancre}
      align={align}
      onClose={onFermer}
      role="listbox"
      id={id}
      aria-label={label}
    >
      {options.map((o, i) => {
        const retenue = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              items.current[i] = el;
            }}
            type="button"
            role="option"
            aria-selected={retenue}
            tabIndex={-1}
            onClick={() => onChoisir(o.value)}
            onKeyDown={(e) => surTouche(e, i)}
            className={`flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-left text-base transition-colors ${
              retenue
                ? "bg-rose-bg text-rose-hover"
                : "text-ink-section hover:bg-surface-2"
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate">{o.label}</span>
              {o.sub ? (
                <span className="mt-0.5 block truncate text-sm text-ink-muted">
                  {o.sub}
                </span>
              ) : null}
            </span>
            {retenue ? (
              <Check size={15} strokeWidth={3} aria-hidden className="shrink-0" />
            ) : null}
          </button>
        );
      })}
    </Popover>
  );
}
