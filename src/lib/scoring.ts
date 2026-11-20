export type CriterionKey =
  | "cleanliness"
  | "architecture"
  | "unitTests"
  | "uiTests"
  | "comments"
  | "gitHistory";

export interface Criterion {
  key: CriterionKey;
  label: string;
  shortLabel: string;
  weight: number;
  hint: string;
  levels: [string, string, string, string];
}

export const CRITERIA: Criterion[] = [
  {
    key: "cleanliness",
    label: "Propreté du code",
    shortLabel: "Propreté",
    weight: 0.2,
    hint: "Lisibilité, nommage, formatage, organisation des fichiers.",
    levels: [
      "Code difficile à suivre, nommage incohérent.",
      "Base compréhensible, quelques maladresses de forme.",
      "Code globalement propre et lisible.",
      "Très propre, homogène et facile à parcourir.",
    ],
  },
  {
    key: "architecture",
    label: "Architecture",
    shortLabel: "Architecture",
    weight: 0.2,
    hint: "Séparation des responsabilités, structure, réutilisabilité.",
    levels: [
      "Tout est mélangé dans peu de fichiers.",
      "Quelques séparations existent mais restent fragiles.",
      "Structure claire, responsabilités plutôt bien réparties.",
      "Architecture soignée, modulaire et cohérente.",
    ],
  },
  {
    key: "unitTests",
    label: "Tests unitaires",
    shortLabel: "Tests unit.",
    weight: 0.15,
    hint: "Présence, pertinence et diversité des tests unitaires.",
    levels: [
      "Aucun test unitaire visible.",
      "Quelques tests isolés, peu représentatifs.",
      "Tests présents sur les parties importantes.",
      "Bonne couverture des cas principaux et limites.",
    ],
  },
  {
    key: "uiTests",
    label: "Tests UI",
    shortLabel: "Tests UI",
    weight: 0.1,
    hint: "Présence et pertinence de tests d'interface.",
    levels: [
      "Aucun test d'interface.",
      "Un scénario isolé ou très superficiel.",
      "Quelques parcours d'interface testés.",
      "Scénarios UI variés et utiles.",
    ],
  },
  {
    key: "comments",
    label: "Commentaires & documentation",
    shortLabel: "Docs",
    weight: 0.15,
    hint: "README, documentation et commentaires utiles.",
    levels: [
      "Pas de README ni de commentaires.",
      "Documentation minimale, commentaires rares.",
      "README correct et commentaires présents.",
      "Documentation claire et commentaires pertinents.",
    ],
  },
  {
    key: "gitHistory",
    label: "Historique Git",
    shortLabel: "Git",
    weight: 0.2,
    hint: "Commits réguliers, messages clairs, collaboration.",
    levels: [
      "Un seul commit ou historique difficile à exploiter.",
      "Quelques commits, messages peu explicites.",
      "Commits réguliers avec des messages compréhensibles.",
      "Historique riche, régulier et bien documenté.",
    ],
  },
];

export const CRITERION_KEYS = CRITERIA.map((criterion) => criterion.key);

export type Scores = Partial<Record<CriterionKey, number>>;

export function computeWeightedScore(scores: Scores): number | null {
  let total = 0;
  for (const criterion of CRITERIA) {
    const value = scores[criterion.key];
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }
    total += (value / 10) * criterion.weight;
  }
  return Math.round(total * 20 * 100) / 100;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

export interface AggregatedResult {
  reviewCount: number;
  criteria: Record<CriterionKey, number | null>;
  weightedScore: number | null;
}

export function aggregateReviews(
  entries: { scores: Record<string, number>; weightedScore: number | null }[],
): AggregatedResult {
  const criteria = {} as Record<CriterionKey, number | null>;
  for (const criterion of CRITERIA) {
    criteria[criterion.key] = average(
      entries
        .map((entry) => entry.scores[criterion.key])
        .filter((value): value is number => typeof value === "number"),
    );
  }
  return {
    reviewCount: entries.length,
    criteria,
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
