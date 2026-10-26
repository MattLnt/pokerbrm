// Primitives d'interface partagées. Mobile first puis desktop, thème sombre.

/**
 * Conteneur de page.
 * `width="narrow"` (défaut) : colonne unique, lecture confortable — convient
 * aux écrans dont le contenu reste linéaire (trainer).
 * `width="wide"` : laisse la place à une mise en page multi-colonnes sur
 * grand écran. Sur mobile les deux sont identiques.
 */
export function Screen({ children, width = "narrow" }) {
  const max = width === "wide" ? "lg:max-w-[1180px]" : "lg:max-w-[640px]";
  return (
    <main
      className={`mx-auto w-full max-w-[560px] px-4 pt-6 lg:px-10 lg:pt-12 ${max}`}
    >
      {children}
    </main>
  );
}

export function PageHeader({ eyebrow, title, action }) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4 lg:mb-9">
      <div className="min-w-0">
        {eyebrow ? <p className="kicker mb-2">{eyebrow}</p> : null}
        <h1 className="text-[var(--fs-xl)] font-bold leading-[var(--lh-tight)] tracking-[var(--ls-heading)] lg:text-[var(--fs-2xl)]">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

/**
 * `tight` : pour le premier titre d'une colonne de droite — on garde l'espace
 * au-dessus quand tout est empilé sur mobile, on le supprime sur grand écran
 * pour que les deux colonnes démarrent à la même hauteur.
 */
export function SectionTitle({ children, action, tight = false }) {
  return (
    <div
      className={`mb-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 ${
        tight ? "mt-8 lg:mt-0" : "mt-8"
      }`}
    >
      {/* whitespace-nowrap : le titre ne se casse pas en plein milieu quand
          la pastille d'action le serre sur un écran étroit — elle passe à la
          ligne à la place. */}
      <h2 className="kicker flex items-center gap-2.5 whitespace-nowrap">
        <span className="h-3 w-[3px] rounded-full bg-accent" aria-hidden />
        {children}
      </h2>
      {action}
    </div>
  );
}

/**
 * Colonnes de tableau de bord : empilées sur mobile, côte à côte sur grand
 * écran. Chaque enfant direct est une colonne.
 *
 * Une colonne peut porter `contents lg:block` : ses blocs deviennent alors
 * des enfants directs du flex sur mobile, ce qui permet de leur donner un
 * `order-*` et de retrouver l'ordre de la maquette malgré le découpage en
 * colonnes, qui n'existe que sur grand écran.
 */
export function Columns({ children }) {
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 lg:items-start lg:gap-7">
      {children}
    </div>
  );
}

/**
 * `tone` : "plain" pour une carte ordinaire, "hero" pour celle qui porte le
 * chiffre principal d'un écran, "soft" pour un bloc imbriqué.
 */
export function Card({
  children,
  className = "",
  as: Tag = "div",
  tone = "plain",
  liftable = false,
  ...rest
}) {
  const matiere = {
    plain: "surface",
    hero: "surface-hero",
    soft: "surface-soft",
  }[tone];

  return (
    <Tag
      className={`rounded-card border border-line bg-surface ${matiere} ${
        liftable ? "liftable" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Liste de lignes séparées dans une seule carte (cf. « Par site »). */
export function CardList({ children }) {
  return (
    <Card className="divide-y divide-line/70 overflow-hidden">{children}</Card>
  );
}

export function Pill({ tone = "neutral", children }) {
  // Chaque ton : un fond très dilué, un texte dans la teinte claire de la
  // même couleur. Pas d'anneau — le fond suffit à détacher la pastille.
  const tones = {
    neutral: "bg-surface-3 text-ink-section",
    positive: "bg-positive/15 text-positive",
    warning: "bg-warning/15 text-warning",
    accent: "bg-accent/15 text-accent-hover",
    rose: "bg-rose/15 text-rose",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill px-3 py-1 text-[var(--fs-sm)] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Point de statut. Plein, sans halo : la couleur se suffit. */
export function StatusDot({ tone = "positive" }) {
  const colors = {
    positive: "bg-positive",
    warning: "bg-warning",
    accent: "bg-accent",
  };
  return (
    <span className={`size-1.5 rounded-full ${colors[tone]}`} aria-hidden />
  );
}

/** Tuile « label discret + grande valeur », avec numéro optionnel en coin. */
export function StatTile({ label, value, sub, tone = "", index }) {
  return (
    <div
      className="relative overflow-hidden rounded-tile border border-line bg-surface p-4"
      style={{ containerType: "inline-size" }}
    >
      {index ? (
        <span
          className="num absolute right-3.5 top-3.5 text-[var(--fs-overline)] font-bold tracking-[var(--overline-tracking)] text-ink-muted/40"
          aria-hidden
        >
          {String(index).padStart(2, "0")}
        </span>
      ) : null}
      <p className="kicker mb-2.5">{label}</p>
      <p
        className={`num whitespace-nowrap text-[clamp(17px,5.5cqw,22px)] font-bold leading-[var(--lh-tight)] ${tone}`}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-2 text-[var(--fs-sm)] text-ink-muted">{sub}</p>
      ) : null}
    </div>
  );
}

export function ProgressBar({ value, max, tone = "accent" }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const couleurs = {
    accent: "bg-accent",
    positive: "bg-positive",
    warning: "bg-warning",
  };
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-pill bg-bg-sunken ring-1 ring-inset ring-line"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-pill ${couleurs[tone] ?? couleurs.accent}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * Bouton d'action tactile (≥ 44 px), sur les classes `.bd-btn` de la charte.
 * `secondary` = le bouton encadré de la charte ; `ghost` = sans fond.
 */
export function Button({
  children,
  variant = "secondary",
  className = "",
  as: Tag = "button",
  ...rest
}) {
  const variants = {
    primary: "bd-btn--primary",
    secondary: "bd-btn--outline",
    ghost: "bd-btn--ghost text-accent-hover",
    danger: "bd-btn--danger",
  };
  return (
    <Tag
      className={`bd-btn ${variants[variant] ?? variants.secondary} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {Icon ? (
        <span className="mb-1 grid size-12 place-items-center rounded-tile border border-accent-line bg-accent-soft text-accent">
          <Icon size={24} />
        </span>
      ) : null}
      <h3 className="text-[var(--fs-lg)] font-semibold tracking-[var(--ls-heading)]">
        {title}
      </h3>
      {description ? (
        <p className="max-w-[26rem] text-[var(--fs-base)] leading-[var(--lh-normal)] text-ink-muted">
          {description}
        </p>
      ) : null}
      {action}
    </Card>
  );
}

/**
 * Courbe d'évolution en SVG pur, sans dépendance de charting.
 * Aire dégradée sous la ligne, ligne lissée, point sur la dernière valeur :
 * une ligne nue flottant dans le vide ne se lit pas.
 */
export function Sparkline({ points = [], height = 132, tone = "#38bdf8" }) {
  if (points.length < 2) {
    return (
      <div
        className="grid place-items-center text-sm text-ink-muted"
        style={{ height }}
      >
        Pas encore assez de données
      </div>
    );
  }

  const w = 100;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const padTop = 10;
  const padBas = 14;
  const usable = height - padTop - padBas;

  const xy = points.map((p, i) => [
    (i / (points.length - 1)) * w,
    padTop + usable - ((p - min) / span) * usable,
  ]);

  // Lissage par courbes cubiques : les segments droits font « graphique Excel ».
  const ligne = xy.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x.toFixed(2)},${y.toFixed(2)}`;
    const [px, py] = xy[i - 1];
    const cx = (px + x) / 2;
    return `${d} C${cx.toFixed(2)},${py.toFixed(2)} ${cx.toFixed(2)},${y.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`;
  }, "");

  const aire = `${ligne} L${w},${height} L0,${height} Z`;
  const [dernierX, dernierY] = xy.at(-1);
  const id = `spark-${tone.replace("#", "")}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="w-full overflow-visible"
      style={{ height }}
      role="img"
      aria-label="Évolution de la bankroll sur la période"
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.32" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={aire} fill={`url(#${id}-fill)`} />
      <path
        d={ligne}
        fill="none"
        stroke={tone}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Deux cercles : le halo diffus, puis le point net. */}
      <circle cx={dernierX} cy={dernierY} r="5" fill={tone} opacity="0.22" />
      <circle
        cx={dernierX}
        cy={dernierY}
        r="2.5"
        fill={tone}
        stroke="var(--color-bg)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
