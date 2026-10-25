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
} from "lucide-react";

/**
 * Six onglets au lieu des cinq prévus : la session est l'écran le plus
 * sollicité pendant qu'on joue, il doit être à un tap depuis n'importe où.
 */
const TABS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/session", label: "Session", icon: Play },
  { href: "/ranges", label: "Ranges", icon: Grid3x3 },
  { href: "/etude", label: "Étude", icon: BookOpen },
  { href: "/trainer", label: "Trainer", icon: Target },
  { href: "/bankroll", label: "Bankroll", icon: CreditCard },
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-deep/85 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigation principale"
      >
        <ul className="mx-auto flex h-[76px] w-full max-w-[560px] items-stretch">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-full flex-col items-center justify-center gap-1.5 text-[10px] font-medium transition-colors ${
                    active ? "text-accent" : "text-ink-muted"
                  }`}
                >
                  {/* Trait lumineux au-dessus de l'onglet actif */}
                  {active ? (
                    <span
                      className="absolute inset-x-[22%] top-0 h-[2px] rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)]"
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
      </nav>

      {/* Desktop : rail latéral */}
      <nav
        className="fixed inset-y-0 left-0 z-40 hidden w-[244px] flex-col border-r border-line bg-bg-deep/70 px-4 py-7 backdrop-blur-xl lg:flex"
        aria-label="Navigation principale"
      >
        <Link href="/" className="mb-9 flex items-center gap-3 px-2">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-accent to-[#3f6fd8] text-[15px] font-black text-[#06101f] shadow-[0_8px_20px_-8px_var(--color-accent)]"
            aria-hidden
          >
            ♠
          </span>
          <span className="leading-none">
            <span className="kicker block text-[0.5625rem]">Poker</span>
            <span className="text-[1.3rem] font-bold tracking-tight">BRM</span>
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
                  className={`group relative flex min-h-[46px] items-center gap-3 rounded-tile px-3 text-[0.9375rem] transition-all ${
                    active
                      ? "surface-soft bg-surface-2 font-semibold text-ink"
                      : "text-ink-muted hover:bg-surface/60 hover:text-ink-section"
                  }`}
                >
                  {/* Barre d'accent collée au bord gauche de l'onglet actif */}
                  {active ? (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_10px_var(--color-accent)]"
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
