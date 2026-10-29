"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Grid3x3,
  BookOpen,
  Target,
  CreditCard,
  Play,
  Landmark,
  Briefcase,
  CalendarRange,
} from "lucide-react";

/**
 * Neuf onglets. Les six premiers sont le poker, les trois derniers la vie
 * autour : le compte bancaire où arrivent les retraits, les projets web qui
 * le remplissent, et l'agenda qui répartit les journées entre les trois.
 * Ils sont au même rang parce qu'on y va aussi souvent, et qu'un onglet
 * « divers » qui en cacherait trois ne ferait qu'ajouter un tap à chaque
 * visite.
 *
 * L'agenda vient en dernier et non dans le poker : il planifie le grind,
 * l'étude et les projets ensemble — le ranger sous l'un des trois le
 * cacherait aux deux autres.
 *
 * Passé six, la barre basse ne tient plus dans la largeur d'un téléphone :
 * elle défile à l'horizontale, chaque onglet gardant sa cible tactile.
 */
const TABS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/session", label: "Session", icon: Play },
  { href: "/ranges", label: "Ranges", icon: Grid3x3 },
  { href: "/etude", label: "Étude", icon: BookOpen },
  { href: "/trainer", label: "Trainer", icon: Target },
  { href: "/bankroll", label: "Bankroll", icon: CreditCard },
  { href: "/compte", label: "Compte", icon: Landmark },
  { href: "/projets", label: "Projets", icon: Briefcase },
  { href: "/agenda", label: "Agenda", icon: CalendarRange },
];

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Une seule source de navigation, deux présentations :
 * barre basse fixe sur mobile, rail latéral fixe à partir de `lg`.
 */
export default function MainNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile : barre basse */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-deep/90 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigation principale"
      >
        {/* Deux conteneurs : celui du dessus défile, celui du dessous prend la
            largeur de son contenu pour que `mx-auto` le centre tant qu'il
            tient à l'écran. Un `justify-center` sur le conteneur défilant
            rendrait les premiers onglets inatteignables dès qu'il déborde. */}
        <div className="no-scrollbar h-[76px] overflow-x-auto overscroll-x-contain">
        <ul className="mx-auto flex h-full w-max items-stretch">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="w-[74px] shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-full flex-col items-center justify-center gap-1.5 text-2xs font-semibold transition-colors ${
                    active ? "text-accent-hover" : "text-ink-muted"
                  }`}
                >
                  {/* Trait d'accent au-dessus de l'onglet actif */}
                  {active ? (
                    <span
                      className="absolute inset-x-[22%] top-0 h-[2px] rounded-full bg-accent"
                      aria-hidden
                    />
                  ) : null}
                  <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        </div>
      </nav>

      {/* Desktop : rail latéral */}
      <nav
        className="fixed inset-y-0 left-0 z-40 hidden w-[244px] flex-col border-r border-line bg-bg-deep px-4 py-7 lg:flex"
        aria-label="Navigation principale"
      >
        <Link href="/" className="mb-9 flex items-center gap-3 px-2">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-sm border border-accent-line bg-accent-soft text-lg font-black text-accent"
            aria-hidden
          >
            ♠
          </span>
          <span className="leading-none">
            <span className="kicker block">Poker</span>
            <span className="text-2xl font-bold tracking-[var(--ls-heading)]">
              BRM
            </span>
          </span>
        </Link>

        <ul className="flex flex-col gap-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex min-h-[var(--control-lg)] items-center gap-3 rounded-sm px-3 text-lg transition-colors ${
                    active
                      ? "bg-accent-soft font-semibold text-accent-hover"
                      : "text-ink-section hover:bg-surface hover:text-ink"
                  }`}
                >
                  {/* Barre d'accent collée au bord gauche de l'onglet actif */}
                  {active ? (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
                      aria-hidden
                    />
                  ) : null}
                  <Icon
                    size={19}
                    strokeWidth={active ? 2.3 : 1.8}
                    className={active ? "text-accent" : ""}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
