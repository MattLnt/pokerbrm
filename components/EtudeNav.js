"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, BookOpen, Layers, TrendingDown, History } from "lucide-react";

/**
 * Navigation du module Étude.
 *
 * L'étude n'est pas un écran mais un atelier : le programme, la revue de
 * mains, les faiblesses et le journal sont quatre tables de travail
 * différentes. Les empiler sur une page les écrasait toutes.
 *
 * Rangée défilante sur mobile, rail horizontal sur grand écran — jamais un
 * menu déroulant : on passe d'un onglet à l'autre en permanence.
 */
const ONGLETS = [
  { href: "/etude", label: "Vue d'ensemble", icon: Gauge, exact: true },
  { href: "/etude/revue", label: "Revue de mains", icon: BookOpen },
  { href: "/etude/programme", label: "Programme", icon: Layers },
  { href: "/etude/faiblesses", label: "Faiblesses", icon: TrendingDown },
  { href: "/etude/journal", label: "Journal", icon: History },
];

function estActif(pathname, { href, exact }) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function EtudeNav({ aRevoir = 0 }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections de l'étude"
      className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0"
    >
      {ONGLETS.map((onglet) => {
        const actif = estActif(pathname, onglet);
        const Icon = onglet.icon;
        return (
          <Link
            key={onglet.href}
            href={onglet.href}
            aria-current={actif ? "page" : undefined}
            className={`flex min-h-[40px] shrink-0 items-center gap-2 rounded-pill border px-4 text-sm transition-colors ${
              actif
                ? "border-accent-line bg-accent-soft text-accent-hover"
                : "border-line bg-surface-2 text-ink-section hover:border-line-strong hover:text-ink"
            }`}
          >
            <Icon size={15} strokeWidth={actif ? 2.3 : 1.8} />
            {onglet.label}
            {/* Le compteur ne s'affiche que sur Revue, et que s'il reste
                quelque chose à faire : un « 0 » permanent ne dit rien. */}
            {onglet.href === "/etude/revue" && aRevoir > 0 ? (
              <span className="num rounded-pill bg-negative/15 px-1.5 text-[var(--fs-overline)] font-bold text-negative">
                {aRevoir}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
