"use client";

import { useState } from "react";
import {
  MAX_CRITERIA,
  MIN_CRITERIA,
  weightPercent,
  type Criterion,
} from "@/lib/criteria";
import { saveCriteria } from "@/server/actions/admin";

const LEVEL_LABELS = ["Faible (0-3)", "Moyen (4-6)", "Bon (7-8)", "Excellent (9-10)"];

export function CriteriaEditor({
  initialCriteria,
}: {
  initialCriteria: Criterion[];
}) {
  const [criteria, setCriteria] = useState<Criterion[]>(initialCriteria);
  const total = Math.round(
    criteria.reduce((sum, criterion) => sum + criterion.weight * 100, 0),
  );

  function update(index: number, patch: Partial<Criterion>) {
    setCriteria((current) =>
      current.map((criterion, position) =>
        position === index ? { ...criterion, ...patch } : criterion,
      ),
    );
  }

  function updateLevel(index: number, levelIndex: number, value: string) {
    setCriteria((current) =>
      current.map((criterion, position) => {
        if (position !== index) return criterion;
        const levels = [...criterion.levels] as Criterion["levels"];
        levels[levelIndex] = value;
        return { ...criterion, levels };
      }),
    );
  }

  function addCriterion() {
    if (criteria.length >= MAX_CRITERIA) return;
    setCriteria((current) => [
      ...current,
      {
        key: "",
        label: "",
        shortLabel: "",
        hint: "",
        weight: 0.01,
        levels: ["", "", "", ""],
      },
    ]);
  }

  function removeCriterion(index: number) {
    if (criteria.length <= MIN_CRITERIA) return;
    setCriteria((current) => current.filter((_, position) => position !== index));
  }

  function distributeEqually() {
    const base = Math.floor(100 / criteria.length);
    const remainder = 100 - base * criteria.length;
    setCriteria((current) =>
      current.map((criterion, index) => ({
        ...criterion,
        weight: (base + (index < remainder ? 1 : 0)) / 100,
      })),
    );
  }

  return (
    <form action={saveCriteria} className="space-y-4">
      <input type="hidden" name="count" value={criteria.length} />

      {criteria.map((criterion, index) => (
        <section key={index} className="card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              Critère {index + 1}
            </h2>
            <button
              type="button"
              onClick={() => removeCriterion(index)}
              disabled={criteria.length <= MIN_CRITERIA}
              className="btn-danger px-2.5 py-1 text-xs disabled:opacity-40"
            >
              Supprimer
            </button>
          </div>

          <input type="hidden" name={`key-${index}`} value={criterion.key} />

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor={`label-${index}`}>
                Libellé
              </label>
              <input
                id={`label-${index}`}
                name={`label-${index}`}
                value={criterion.label}
                maxLength={80}
                required
                onChange={(event) => update(index, { label: event.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor={`shortLabel-${index}`}>
                Libellé court
              </label>
              <input
                id={`shortLabel-${index}`}
                name={`shortLabel-${index}`}
                value={criterion.shortLabel}
                maxLength={32}
                required
                onChange={(event) =>
                  update(index, { shortLabel: event.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor={`weight-${index}`}>
                Poids (%)
              </label>
              <input
                id={`weight-${index}`}
                name={`weight-${index}`}
                type="number"
                min={1}
                max={100}
                step={1}
                value={weightPercent(criterion)}
                required
                onChange={(event) =>
                  update(index, {
                    weight: Number(event.target.value) / 100,
                  })
                }
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor={`hint-${index}`}>
              Description affichée sous le libellé
            </label>
            <textarea
              id={`hint-${index}`}
              name={`hint-${index}`}
              rows={2}
              value={criterion.hint}
              maxLength={300}
              onChange={(event) => update(index, { hint: event.target.value })}
              className="input"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {criterion.levels.map((level, levelIndex) => (
              <div key={levelIndex}>
                <label
                  className="label"
                  htmlFor={`level-${index}-${levelIndex}`}
                >
                  {LEVEL_LABELS[levelIndex]}
                </label>
                <textarea
                  id={`level-${index}-${levelIndex}`}
                  name={`level-${index}-${levelIndex}`}
                  rows={2}
                  value={level}
                  maxLength={300}
                  onChange={(event) =>
                    updateLevel(index, levelIndex, event.target.value)
                  }
                  className="input"
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addCriterion}
            disabled={criteria.length >= MAX_CRITERIA}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Ajouter un critère
          </button>
          <button
            type="button"
            onClick={distributeEqually}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            Répartir également
          </button>
        </div>
        <p
          className={`text-xs font-semibold ${
            total === 100 ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          Somme des poids : {total} %
          {total !== 100 ? " (doit faire 100 %)" : null}
        </p>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={total !== 100}>
          Enregistrer la grille
        </button>
      </div>
    </form>
  );
}
