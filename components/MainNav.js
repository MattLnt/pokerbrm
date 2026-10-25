"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3x3, BookOpen, Target, CreditCard } from "lucide-react";

const TABS = [
  { href: "/", label: "Accueil", icon: Home },
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
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile : barre basse */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#14171c]/95 backdrop-blur lg:hidden"
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
                  className={`flex h-full flex-col items-center justify-center gap-1.5 text-[11px] transition-colors ${
                    active ? "text-accent" : "text-ink-muted"
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop : rail latéral */}
      <nav
        className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-line bg-[#0c0d20]/80 px-4 py-6 backdrop-blur lg:flex"
        aria-label="Navigation principale"
      >
        <Link href="/" className="mb-8 block px-3">
          <span className="kicker block">Poker</span>
          <span className="text-xl font-bold tracking-tight">BRM</span>
        </Link>

        <ul className="flex flex-col gap-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[48px] items-center gap-3 rounded-tile px-3 text-base transition-colors ${
                    active
                      ? "bg-rose-bg text-ink ring-1 ring-rose-line"
                      : "text-ink-muted hover:bg-surface hover:text-ink-section"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
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
