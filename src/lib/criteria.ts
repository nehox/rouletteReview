import { z } from "zod";

export const MIN_CRITERIA = 1;
export const MAX_CRITERIA = 12;

export const CriterionSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]{1,64}$/, "Clé de critère invalide.")
    .max(64),
  label: z.string().trim().min(1, "Libellé requis.").max(80),
  shortLabel: z.string().trim().min(1, "Libellé court requis.").max(32),
  weight: z.number().min(0.01).max(1),
  hint: z.string().trim().max(300),
  levels: z.tuple([
    z.string().trim().max(300),
    z.string().trim().max(300),
    z.string().trim().max(300),
    z.string().trim().max(300),
  ]),
});

export const CriteriaSchema = z
  .array(CriterionSchema)
  .min(MIN_CRITERIA)
  .max(MAX_CRITERIA)
  .refine(
    (criteria) =>
      new Set(criteria.map((criterion) => criterion.key)).size === criteria.length,
    { message: "Les clés de critères doivent être uniques." },
  )
  .refine(
    (criteria) =>
      Math.abs(criteria.reduce((sum, criterion) => sum + criterion.weight, 0) - 1) <
      0.001,
    { message: "La somme des poids doit faire 100 %." },
  );

export type Criterion = z.infer<typeof CriterionSchema>;
export type CriterionKey = string;

export const DEFAULT_CRITERIA: Criterion[] = [
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

export function parseCriteria(value: unknown): Criterion[] {
  const parsed = CriteriaSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_CRITERIA;
}

export function criteriaFromSettings(settings: {
  reviewCriteria: unknown;
}): Criterion[] {
  return parseCriteria(settings.reviewCriteria);
}

export function criterionLevelIndex(score: number): number {
  if (score <= 3) return 0;
  if (score <= 6) return 1;
  if (score <= 8) return 2;
  return 3;
}

export function weightPercent(criterion: Criterion): number {
  return Math.round(criterion.weight * 100);
}
