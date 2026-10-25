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

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#14171c]/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-[76px] w-full max-w-[480px] items-stretch">
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
  );
}
