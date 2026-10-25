"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderDown, Plus, Minus, RefreshCw, Gift } from "lucide-react";

import { Card, CardList, SectionTitle, Button } from "@/components/ui";
import MovementSheet from "@/components/MovementSheet";
import { parseFiles } from "@/lib/parsers";
import { SITES, FORMAT_LABELS, SPEED_LABELS } from "@/lib/constants";
import { formatEuro, plural, toneClass } from "@/lib/format";

const SITE_NAMES = Object.fromEntries(SITES.map((s) => [s.slug, s.name]));

const MOVEMENTS = [
  { type: "DEPOSIT", label: "Dépôt", icon: Plus },
  { type: "WITHDRAWAL", label: "Retrait", icon: Minus },
  { type: "RAKEBACK", label: "Rakeback", icon: RefreshCw },
  { type: "BONUS", label: "Bonus / ticket", icon: Gift },
];

const MAX_FILE_SIZE = 5_000_000;

export default function ImportClient({ demo }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [report, setReport] = useState(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState(null);
  const [pending, startTransition] = useTransition();

  async function handleFiles(fileList) {
    const files = [...fileList].filter((f) => f.size < MAX_FILE_SIZE);
    if (files.length === 0) return;

    setReading(true);
    setError(null);
    try {
      const contents = await Promise.all(
        files.map(async (f) => ({ name: f.name, content: await f.text() }))
      );
      setReport(parseFiles(contents));
    } catch {
      setError("Impossible de lire ces fichiers.");
    } finally {
      setReading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function confirmImport() {
    if (!report || report.tournaments.length === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournaments: report.tournaments }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "L'import a échoué.");
        return;
      }
      router.push("/bankroll");
      router.refresh();
    });
  }

  const total = report?.tournaments.length ?? 0;
  const preview = showAll
    ? (report?.tournaments ?? [])
    : (report?.tournaments ?? []).slice(0, 3);
  // Sites présents dans le lot mais dont le format n'est pas encore codé.
  const sitesASpecifier = (report?.bySite ?? [])
    .filter((s) => s.needsSpec && s.fileCount > 0)
    .map((s) => SITE_NAMES[s.site] ?? s.site);

  return (
    <>
      {/* Zone de dépôt */}
      <Card
        className={`border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? "border-accent bg-accent-soft" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-tile bg-surface-3 text-accent">
          <FolderDown size={26} />
        </span>
        <h2 className="text-lg font-bold">Dépose ton dossier d&apos;historiques</h2>
        <p className="mx-auto mt-2 max-w-[18rem] text-sm text-ink-muted">
          Les résumés de tournoi sont détectés automatiquement. Les doublons sont
          ignorés.
        </p>
        <Button
          type="button"
          className="mt-5"
          onClick={() => inputRef.current?.click()}
          disabled={reading}
        >
          {reading ? "Lecture…" : "Choisir des fichiers"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </Card>

      {error ? (
        <p className="mt-3 rounded-tile border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </p>
      ) : null}

      {report ? (
        <>
          {/* Détecté */}
          <SectionTitle>Détecté</SectionTitle>
          <CardList>
            {report.bySite.map((s) => (
              <div
                key={s.site}
                className="flex items-center justify-between gap-3 px-4 py-4"
              >
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{SITE_NAMES[s.site]}</p>
                  <p
                    className={`text-sm ${
                      s.needsSpec ? "text-warning" : "text-ink-muted"
                    }`}
                  >
                    {s.needsSpec
                      ? `${plural(s.fileCount, "fichier")} · format à valider`
                      : [
                          plural(s.newCount, "nouveau", "nouveaux"),
                          s.duplicateCount
                            ? `${plural(s.duplicateCount, "doublon")} ignoré${s.duplicateCount > 1 ? "s" : ""}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </p>
                </div>
                <p className={`num shrink-0 font-semibold ${toneClass(s.net)}`}>
                  {s.needsSpec ? "—" : formatEuro(s.net, { sign: true })}
                </p>
              </div>
            ))}
          </CardList>

          {report.unrecognized.length > 0 ? (
            <p className="mt-2 px-1 text-sm text-ink-muted">
              {report.unrecognized.length} fichier
              {report.unrecognized.length > 1 ? "s" : ""} non importé
              {report.unrecognized.length > 1 ? "s" : ""} — les autres passent
              quand même.
            </p>
          ) : null}

          {/* Aperçu */}
          {total > 0 ? (
            <>
              <SectionTitle>Aperçu</SectionTitle>
              <CardList>
                {preview.map((t) => (
                  <div
                    key={`${t.site}-${t.tournamentId}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.name}</p>
                      <p className="truncate text-sm text-ink-muted">
                        {SITE_NAMES[t.site]} ·{" "}
                        {t.speed === "NORMAL"
                          ? FORMAT_LABELS[t.format]
                          : SPEED_LABELS[t.speed]}
                        {t.reEntries
                          ? ` · ${plural(t.reEntries, "re-entry", "re-entries")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-3">
                      {t.finishPosition ? (
                        <span className="num text-sm text-ink-muted">
                          {t.finishPosition}e
                        </span>
                      ) : null}
                      <span
                        className={`num font-semibold ${toneClass(t.netResult)}`}
                      >
                        {formatEuro(t.netResult, { sign: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </CardList>

              {total > 3 ? (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-3 min-h-[44px] text-base font-medium text-accent"
                >
                  {showAll ? "Réduire" : `Voir les ${plural(total, "tournoi")}`}
                </button>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {/* Mouvements hors jeu */}
      <SectionTitle>Mouvements hors jeu</SectionTitle>
      <p className="-mt-2 mb-3 text-sm text-ink-muted">
        Comptés à part du profit de jeu
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {MOVEMENTS.map(({ type, label, icon: Icon }) => (
          <Button key={type} type="button" onClick={() => setSheet(type)}>
            <Icon size={18} />
            {label}
          </Button>
        ))}
      </div>

      <div className="h-32" />

      {/* Barre d'action fixe */}
      {total > 0 ? (
        <div
          className="fixed inset-x-0 bottom-[76px] z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-[240px] lg:px-8"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto w-full max-w-[560px] lg:max-w-[640px]">
            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={confirmImport}
              disabled={pending || demo}
            >
              {pending
                ? "Import en cours…"
                : `Importer ${plural(total, "tournoi")}`}
            </Button>
            {demo || sitesASpecifier.length > 0 ? (
              <p className="mt-2 text-center text-sm text-ink-muted">
                {demo
                  ? "Branche la base Railway pour enregistrer l'import."
                  : `${sitesASpecifier.join(" et ")} sera importé une fois le format validé`}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {sheet ? (
        <MovementSheet
          type={sheet}
          demo={demo}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
