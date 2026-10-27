"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui";
import { SITES, TRANSACTION_LABELS } from "@/lib/constants";

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Bottom sheet de saisie d'un mouvement hors jeu (2 taps + un montant). */
export default function MovementSheet({ type, demo, onClose, onSaved }) {
  const [site, setSite] = useState(SITES[0].slug);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  function submit(e) {
    e.preventDefault();
    const value = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Montant invalide.");
      return;
    }
    if (demo) {
      setError("Branche la base Railway pour enregistrer un mouvement.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, type, amount: value, date, note }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Enregistrement impossible.");
        return;
      }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <form
        onSubmit={submit}
        className="flottant relative w-full max-w-[480px] rounded-t-xl border-t border-line bg-surface p-5 lg:rounded-xl lg:border"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{TRANSACTION_LABELS[type]}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-2 grid size-11 place-items-center text-ink-muted"
          >
            <X size={22} />
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-sm text-ink-muted">Site</span>
          <div className="grid grid-cols-3 gap-2">
            {SITES.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => setSite(s.slug)}
                aria-pressed={site === s.slug}
                className={`min-h-[44px] rounded-tile border text-sm ${
                  site === s.slug
                    ? "border-rose-line bg-rose-bg text-rose-hover"
                    : "border-line bg-surface-2 text-ink-section"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </label>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-sm text-ink-muted">Montant (€)</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            autoFocus
            className="bd-input num text-xl"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-sm text-ink-muted">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bd-input num"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm text-ink-muted">
            Note (facultatif)
          </span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bd-input"
          />
        </label>

        {error ? (
          <p className="mb-3 text-sm text-warning">{error}</p>
        ) : null}

        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
