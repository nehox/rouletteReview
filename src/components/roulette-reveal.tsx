"use client";

import { useEffect, useState } from "react";

export interface RevealRow {
  reviewer: string;
  reviewed: string;
  repoUrl: string | null;
}

export function RouletteReveal({ rows }: { rows: RevealRow[] }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    setVisible(0);
    const interval = window.setInterval(() => {
      setVisible((current) => {
        if (current >= rows.length) {
          window.clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, 160);
    return () => window.clearInterval(interval);
  }, [rows]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Révélation des affectations ({Math.min(visible, rows.length)}/
          {rows.length})
        </p>
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-xs"
          onClick={() => setVisible(0)}
        >
          Rejouer l&apos;animation
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row, index) => {
          const shown = index < visible;
          return (
            <div
              key={`${row.reviewer}-${row.reviewed}-${index}`}
              className="card flex items-center gap-3 p-3 transition-all duration-300"
              style={{
                opacity: shown ? 1 : 0,
                transform: shown ? "none" : "translateY(10px) scale(0.98)",
              }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {row.reviewer}
                  <span className="mx-1.5 text-slate-400">→</span>
                  {row.reviewed}
                </p>
                {row.repoUrl ? (
                  <a
                    href={row.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs text-brand-600 hover:underline"
                  >
                    {row.repoUrl.replace("https://github.com/", "")}
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">Dépôt manquant</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
