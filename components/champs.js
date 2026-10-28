"use client";

// Briques de formulaire des écrans Compte et Projets. Elles ne font
// qu'habiller les classes `.bd-*` de la charte, pour que les trois
// formulaires de ces écrans se tiennent exactement pareil.

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
