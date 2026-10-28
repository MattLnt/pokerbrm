"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, KeyRound } from "lucide-react";

/**
 * Navigation du module Projets.
 *
 * Deux tables de travail différentes : le pipeline — ce qui se vend et ce qui
 * se facture — et le registre des comptes, qu'on ouvre pour retrouver « sur
 * quel compte Vercel tourne ce site ». Les mélanger sur un écran noierait le
 * second sous le premier.
 */
const ONGLETS = [
  { href: "/projets", label: "Pipeline", icon: Briefcase, exact: true },
  { href: "/projets/acces", label: "Comptes et accès", icon: KeyRound },
];

export default function ProjetsNav({ relances = 0 }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections des projets"
      className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0"
    >
      {ONGLETS.map(({ href, label, icon: Icon, exact }) => {
        const actif = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={actif ? "page" : undefined}
            className={`flex min-h-[40px] shrink-0 items-center gap-2 rounded-pill border px-4 text-sm transition-colors ${
              actif
                ? "border-accent-line bg-accent-soft text-accent-hover"
                : "border-line bg-surface-2 text-ink-section hover:border-line-strong hover:text-ink"
            }`}
          >
            <Icon size={15} strokeWidth={actif ? 2.3 : 1.8} />
            {label}
            {/* Les devis sans réponse depuis trois semaines : le seul chiffre
                qui demande une action, donc le seul affiché. */}
            {href === "/projets" && relances > 0 ? (
              <span className="num rounded-pill bg-warning/15 px-1.5 text-2xs font-bold text-warning">
                {relances}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
