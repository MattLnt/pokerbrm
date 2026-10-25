"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PERIODS } from "@/lib/constants";

export default function PeriodSelect({ value }) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(e) {
    const next = new URLSearchParams(params);
    next.set("periode", e.target.value);
    router.replace(`/bankroll?${next}`, { scroll: false });
  }

  return (
    <label className="relative">
      <span className="sr-only">Période</span>
      <select
        value={value}
        onChange={onChange}
        className="appearance-none rounded-pill border border-line bg-surface-2 py-2 pl-4 pr-9 text-sm text-ink-section"
      >
        {PERIODS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
        aria-hidden
      >
        ▾
      </span>
    </label>
  );
}
