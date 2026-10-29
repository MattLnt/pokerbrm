"use client";

// Briques de formulaire des écrans Compte, Projets et Agenda. Elles ne font
// qu'habiller les classes `.bd-*` de la charte, pour que les formulaires de
// ces écrans se tiennent exactement pareil.

import { minutesDepuisTexte, texteDepuisMinutes } from "@/lib/agenda";

/** Champ texte avec son libellé. `num` pour les champs de chiffres. */
export function Champ({ label, value, onChange, aide, num = false, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-muted">{label}</span>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`bd-input ${num ? "num" : ""}`}
        {...rest}
      />
      {aide ? <span className="mt-1.5 block text-sm text-ink-muted">{aide}</span> : null}
    </label>
  );
}

/** Champ numérique suivi de son unité, posée dans le champ lui-même. */
export function ChampUnite({ label, unite, value, onChange, aide, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-muted">{label}</span>
      <span className="relative block">
        <input
          type="text"
          value={value ?? ""}
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
      {aide ? <span className="mt-1.5 block text-sm text-ink-muted">{aide}</span> : null}
    </label>
  );
}

/**
 * Heure saisie librement : « 21:30 », « 2130 », « 21h30 », « 21 ».
 *
 * Pas de liste d'heures rondes ni de sélecteur natif : un grind commence à
 * 18 h 45 aussi bien qu'à 19 h. La saisie est relue à la sortie du champ et
 * réécrite en « 21:30 » — on voit tout de suite si elle a été comprise, sans
 * attendre l'enregistrement. Ce qui n'est pas une heure est laissé tel quel :
 * corriger sous les doigts de qui tape serait pire.
 */
export function ChampHeure({ label, value, onChange, aide, ...rest }) {
  function relire() {
    const minutes = minutesDepuisTexte(value);
    if (minutes !== null) onChange(texteDepuisMinutes(minutes));
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-muted">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={relire}
        className="bd-input num"
        {...rest}
      />
      {aide ? <span className="mt-1.5 block text-sm text-ink-muted">{aide}</span> : null}
    </label>
  );
}

export function ChampZone({ label, value, onChange, rows = 3, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-muted">{label}</span>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="bd-textarea"
        {...rest}
      />
    </label>
  );
}

/** Bouton d'une rangée de choix exclusifs. Le retenu passe en rose. */
export function Option({ actif, children, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`min-h-[44px] rounded-tile border px-2 text-sm transition-colors ${
        actif
          ? "border-rose-line bg-rose-bg text-rose-hover"
          : "border-line bg-surface-2 text-ink-section hover:border-line-strong"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Bouton d'action réduit à son icône, cible tactile comprise. */
export function IconeBouton({ label, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid size-11 shrink-0 place-items-center rounded-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink active:text-ink disabled:opacity-40"
      {...rest}
    >
      {children}
    </button>
  );
}
