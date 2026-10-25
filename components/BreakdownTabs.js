"use client";

import { useState } from "react";
import { formatEuro, formatPercent, plural, toneClass } from "@/lib/format";
import { FORMAT_LABELS } from "@/lib/constants";

const DIMENSIONS = [
  { key: "format", label: "Par format" },
  { key: "buyin", label: "Par buy-in" },
  { key: "site", label: "Par site" },
];

export default function BreakdownTabs({ data }) {
  const [dimension, setDimension] = useState("format");
  const rows = data[dimension] ?? [];

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5">
        {DIMENSIONS.map((d) => {
          const active = d.key === dimension;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setDimension(d.key)}
              aria-pressed={active}
              className={`min-h-[44px] rounded-tile border px-2 text-sm transition-colors ${
                active
                  ? "border-rose-line bg-rose-bg text-ink"
                  : "border-line bg-surface text-ink-section"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 rounded-card border border-line bg-surface px-4 py-5 text-center text-sm text-ink-muted">
          Aucun tournoi sur la période.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {rows.map((r) => (
            <li
              key={r.key}
              className="flex items-center justify-between gap-3 px-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {FORMAT_LABELS[r.key] ?? r.key}
                </p>
                <p className="num text-sm text-ink-muted">
                  {plural(r.count, "tournoi")} · ROI{" "}
                  {formatPercent(r.roi, { sign: true })}{" "}
                  · ITM {formatPercent(r.itm)}
                </p>
              </div>
              <p className={`num font-semibold ${toneClass(r.net)}`}>
                {formatEuro(r.net, { sign: true })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
