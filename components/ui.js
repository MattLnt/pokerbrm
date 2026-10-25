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
        <h1 className="text-[2.1rem] font-bold leading-[0.95] tracking-[-0.035em] lg:text-[2.75rem]">
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
      <h2 className="flex items-center gap-2.5 whitespace-nowrap text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
        <span className="h-3.5 w-[3px] rounded-full bg-accent/70" aria-hidden />
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
  const tones = {
    neutral: "bg-surface-3 text-ink-section",
    positive: "bg-positive/15 text-positive ring-1 ring-positive/30",
    warning: "bg-warning/15 text-warning ring-1 ring-warning/30",
    accent: "bg-accent/15 text-accent ring-1 ring-accent/30",
    rose: "bg-rose/15 text-rose ring-1 ring-rose/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-[0.8125rem] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Pastille de statut avec point, reprise de la créa de référence. */
export function StatusDot({ tone = "positive" }) {
  const colors = {
    positive: "bg-positive shadow-[0_0_8px_var(--color-positive)]",
    warning: "bg-warning shadow-[0_0_8px_var(--color-warning)]",
    accent: "bg-accent shadow-[0_0_8px_var(--color-accent)]",
  };
  return (
    <span className={`size-1.5 rounded-full ${colors[tone]}`} aria-hidden />
  );
}

/** Tuile « label discret + grande valeur », avec numéro optionnel en coin. */
export function StatTile({ label, value, sub, tone = "", index }) {
  return (
    <div
      className="surface relative overflow-hidden rounded-tile border border-line bg-surface p-4"
      style={{ containerType: "inline-size" }}
    >
      {index ? (
        <span
          className="num absolute right-3.5 top-3.5 text-[0.625rem] font-bold tracking-[0.2em] text-ink-muted/40"
          aria-hidden
        >
          {String(index).padStart(2, "0")}
        </span>
      ) : null}
      <p className="kicker mb-2.5 text-[0.625rem]">{label}</p>
      <p
        className={`num whitespace-nowrap text-[clamp(1.25rem,5.5cqw,1.625rem)] font-bold leading-none ${tone}`}
      >
        {value}
      </p>
      {sub ? <p className="mt-2 text-[0.8125rem] text-ink-muted">{sub}</p> : null}
    </div>
  );
}

export function ProgressBar({ value, max, tone = "accent" }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const couleurs = {
    accent: "from-accent/70 to-accent",
    positive: "from-positive/70 to-positive",
    warning: "from-warning/70 to-warning",
  };
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-pill bg-bg-deep ring-1 ring-inset ring-white/5"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-pill bg-gradient-to-r ${couleurs[tone] ?? couleurs.accent}`}
        style={{
          width: `${pct}%`,
          boxShadow: "0 0 12px -2px currentColor",
        }}
      />
    </div>
  );
}

/** Bouton d'action tactile (≥ 44 px). */
export function Button({
  children,
  variant = "secondary",
  className = "",
  as: Tag = "button",
  ...rest
}) {
  const variants = {
    primary:
      "bg-gradient-to-b from-[#8cbcff] to-accent text-[#06101f] font-semibold shadow-[0_8px_20px_-10px_var(--color-accent)]",
    secondary: "surface bg-surface border border-line text-ink",
    ghost: "text-accent",
  };
  return (
    <Tag
      className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-tile px-4 text-base transition-all active:scale-[0.985] active:opacity-80 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card
      tone="hero"
      className="flex flex-col items-center gap-3 px-6 py-12 text-center"
    >
      {Icon ? (
        <span className="surface-soft mb-1 grid size-14 place-items-center rounded-[16px] bg-surface-2 text-accent ring-1 ring-accent/20">
          <Icon size={24} />
        </span>
      ) : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="max-w-[26rem] text-[0.9375rem] leading-relaxed text-ink-muted">
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
export function Sparkline({ points = [], height = 132, tone = "#6ea8fe" }) {
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
