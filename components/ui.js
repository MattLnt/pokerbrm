// Primitives d'interface partagées. Mobile first, thème sombre.

export function Screen({ children }) {
  return <main className="px-4 pt-6">{children}</main>;
}

export function PageHeader({ eyebrow, title, action }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-sm text-ink-muted">{eyebrow}</p>
        ) : null}
        <h1 className="text-[2rem] font-bold leading-none tracking-tight">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-ink-section">{children}</h2>
      {action}
    </div>
  );
}

export function Card({ children, className = "", as: Tag = "div", ...rest }) {
  return (
    <Tag
      className={`rounded-card border border-line bg-surface ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Liste de lignes séparées dans une seule carte (cf. « Par site »). */
export function CardList({ children }) {
  return (
    <Card className="divide-y divide-line overflow-hidden">{children}</Card>
  );
}

export function Pill({ tone = "neutral", children }) {
  const tones = {
    neutral: "bg-surface-3 text-ink-section",
    positive: "bg-positive text-[#06251a]",
    warning: "bg-warning text-[#2b1605]",
    accent: "bg-accent text-[#08121f]",
    rose: "bg-rose-bg text-rose border border-rose-line",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Pastille de statut avec point, reprise de la créa de référence. */
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
    <div className="relative rounded-tile border border-line bg-surface p-4">
      {index ? (
        <span className="num absolute right-3 top-3 text-[11px] tracking-widest text-ink-muted/60">
          {String(index).padStart(2, "0")}
        </span>
      ) : null}
      <p className="mb-1.5 text-sm text-ink-muted">{label}</p>
      <p className={`num text-2xl font-bold ${tone}`}>{value}</p>
      {sub ? <p className="mt-1 text-sm text-ink-muted">{sub}</p> : null}
    </div>
  );
}

export function ProgressBar({ value, max, tone = "bg-accent" }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-pill bg-surface-3"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-pill ${tone}`} style={{ width: `${pct}%` }} />
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
    primary: "bg-accent text-[#08121f] font-semibold",
    secondary: "bg-surface border border-line text-ink",
    ghost: "text-accent",
  };
  return (
    <Tag
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-tile px-4 text-base transition-opacity active:opacity-70 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      {Icon ? (
        <span className="grid size-12 place-items-center rounded-tile bg-surface-3 text-accent">
          <Icon size={24} />
        </span>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="text-sm text-ink-muted">{description}</p>
      ) : null}
      {action}
    </Card>
  );
}

/** Courbe d'évolution en SVG pur (pas de dépendance de charting). */
export function Sparkline({ points = [], height = 110, tone = "#6ea8fe" }) {
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
  const pad = 6;
  const usable = height - pad * 2;

  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = pad + usable - ((p - min) / span) * usable;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Évolution de la bankroll sur la période"
    >
      <path
        d={d}
        fill="none"
        stroke={tone}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
