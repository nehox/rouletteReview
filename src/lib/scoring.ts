import {
  DEFAULT_CRITERIA,
  type Criterion,
  type CriterionKey,
} from "./criteria";

export { DEFAULT_CRITERIA as CRITERIA } from "./criteria";
export type { Criterion, CriterionKey } from "./criteria";

export type Scores = Record<string, number | undefined>;

export function computeWeightedScore(
  scores: Scores,
  criteria: Criterion[] = DEFAULT_CRITERIA,
): number | null {
  let total = 0;
  let totalWeight = 0;
  for (const criterion of criteria) {
    const value = scores[criterion.key];
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }
    total += (value / 10) * criterion.weight;
    totalWeight += criterion.weight;
  }
  if (totalWeight <= 0) return null;
  return Math.round((total / totalWeight) * 20 * 100) / 100;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

export interface AggregatedResult {
  reviewCount: number;
  criteria: Record<string, number | null>;
  weightedScore: number | null;
}

export function aggregateReviews(
  entries: { scores: Record<string, number>; weightedScore: number | null }[],
  criteria: Criterion[] = DEFAULT_CRITERIA,
): AggregatedResult {
  const aggregated: Record<string, number | null> = {};
  for (const criterion of criteria) {
    aggregated[criterion.key] = average(
      entries
        .map((entry) => entry.scores[criterion.key])
        .filter((value): value is number => typeof value === "number"),
    );
  }
  return {
    reviewCount: entries.length,
    criteria: aggregated,
    weightedScore: average(
      entries
        .map((entry) => entry.weightedScore)
        .filter((value): value is number => typeof value === "number"),
    ),
  };
}

const noteFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

export function formatNote(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${noteFormatter.format(value)}/20`;
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return noteFormatter.format(value);
}
