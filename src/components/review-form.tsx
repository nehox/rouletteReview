"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CRITERIA, type CriterionKey } from "@/lib/scoring";
import { saveDraft, submitReview } from "@/server/actions/reviews";

interface ReviewFormProps {
  assignmentId: number;
  reviewedName: string;
  repoUrl: string | null;
  initialScores: Record<string, number>;
  initialComments: Record<string, string>;
  initialGeneralComment: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function ReviewForm({
  assignmentId,
  reviewedName,
  repoUrl,
  initialScores,
  initialComments,
  initialGeneralComment,
}: ReviewFormProps) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    for (const criterion of CRITERIA) {
      base[criterion.key] = initialScores[criterion.key] ?? 5;
    }
    return base;
  });
  const [comments, setComments] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const criterion of CRITERIA) {
      base[criterion.key] = initialComments[criterion.key] ?? "";
    }
    return base;
  });
  const [generalComment, setGeneralComment] = useState(initialGeneralComment);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const interacted = useRef(false);

  useEffect(() => {
    if (!interacted.current || pending) return;
    const timer = window.setTimeout(async () => {
      setStatus("saving");
      const result = await saveDraft(assignmentId, {
        scores,
        criterionComments: comments,
        generalComment,
      });
      if (result.ok) {
        setStatus("saved");
        setSavedAt(result.savedAt ?? new Date().toISOString());
        setError(null);
      } else {
        setStatus("error");
        setError(result.error ?? "Impossible d'enregistrer le brouillon.");
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [scores, comments, generalComment, assignmentId, pending]);

  function updateScore(key: CriterionKey, value: number) {
    interacted.current = true;
    setScores((current) => ({ ...current, [key]: value }));
  }

  function updateComment(key: CriterionKey, value: string) {
    interacted.current = true;
    setComments((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (
      !window.confirm(
        "Soumettre définitivement cette review ? Elle ne pourra plus être modifiée sans intervention de l'admin.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await submitReview(assignmentId, {
        scores,
        criterionComments: comments,
        generalComment,
      });
      if (result.ok) {
        router.push(
          `/espace?ok=${encodeURIComponent("Review soumise. Merci pour votre retour !")}`,
        );
        router.refresh();
      } else {
        setError(result.error ?? "Impossible de soumettre la review.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Projet évalué
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-lg font-bold text-slate-900">{reviewedName}</p>
          {repoUrl ? (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              Ouvrir le dépôt GitHub
            </a>
          ) : (
            <span className="text-sm text-rose-600">Dépôt manquant</span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Votre évaluation est anonyme : le groupe évalué ne verra ni votre nom
          ni votre code. Restez constructif et bienveillant.
        </p>
      </div>

      {CRITERIA.map((criterion) => {
        const score = scores[criterion.key] ?? 5;
        const levelIndex = score <= 3 ? 0 : score <= 6 ? 1 : score <= 8 ? 2 : 3;
        return (
          <div key={criterion.key} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {criterion.label}
                  <span className="ml-2 text-xs font-medium text-slate-400">
                    poids {Math.round(criterion.weight * 100)}%
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{criterion.hint}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-9 w-12 items-center justify-center rounded-xl text-sm font-bold ${
                    score >= 7
                      ? "bg-emerald-50 text-emerald-700"
                      : score >= 4
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {score}/10
                </span>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={score}
              disabled={pending}
              onChange={(event) =>
                updateScore(criterion.key, Number(event.target.value))
              }
              className="mt-4 w-full accent-brand-600"
              aria-label={`Note pour ${criterion.label}`}
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>

            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {criterion.levels[levelIndex]}
            </p>

            <label className="label mt-3" htmlFor={`comment-${criterion.key}`}>
              Commentaire (optionnel)
            </label>
            <textarea
              id={`comment-${criterion.key}`}
              rows={2}
              value={comments[criterion.key] ?? ""}
              disabled={pending}
              onChange={(event) =>
                updateComment(criterion.key, event.target.value)
              }
              placeholder="Précisez votre note avec un exemple concret..."
              className="input"
            />
          </div>
        );
      })}

      <div className="card p-5">
        <label className="label" htmlFor="general-comment">
          Commentaire général <span className="text-rose-600">*</span>
        </label>
        <p className="hint mb-2">
          Au moins 10 caractères. Mettez en avant les points forts et une piste
          d&apos;amélioration concrète.
        </p>
        <textarea
          id="general-comment"
          rows={4}
          value={generalComment}
          disabled={pending}
          onChange={(event) => {
            interacted.current = true;
            setGeneralComment(event.target.value);
          }}
          placeholder="Ce que le groupe a bien réussi, et ce qu'il pourrait améliorer en priorité..."
          className="input"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-500">
          {status === "saving" ? "Enregistrement du brouillon..." : null}
          {status === "saved" && savedAt
            ? `Brouillon enregistré à ${new Date(savedAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}.`
            : null}
          {status === "idle" ? "Sauvegarde automatique du brouillon activée." : null}
          {status === "error" ? (
            <span className="text-rose-600">Échec de la sauvegarde.</span>
          ) : null}
        </div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Soumission..." : "Soumettre ma review"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
    </form>
  );
}
