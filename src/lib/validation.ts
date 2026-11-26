import { z } from "zod";
import { DEFAULT_CRITERIA, type Criterion } from "./criteria";
import { isValidRepoUrl } from "./repo";

export const inviteCodeSchema = z
  .string()
  .trim()
  .min(4, "Code trop court.")
  .max(32, "Code trop long.")
  .transform((value) => value.toUpperCase());

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(128, "Le mot de passe est trop long.");

export const registrationSchema = z
  .object({
    code: inviteCodeSchema,
    displayName: z
      .string()
      .trim()
      .min(2, "Le nom du groupe est trop court.")
      .max(80, "Le nom du groupe est trop long."),
    members: z
      .string()
      .trim()
      .max(500, "La liste des membres est trop longue.")
      .optional()
      .default(""),
    repoUrl: z
      .string()
      .trim()
      .refine(isValidRepoUrl, "Lien GitHub invalide (attendu : github.com/owner/repo)."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export const repoUrlSchema = z
  .string()
  .trim()
  .refine(isValidRepoUrl, "Lien GitHub invalide (attendu : github.com/owner/repo).");

export function parseMembers(input: string): string[] {
  return input
    .split(/[,;\n]/)
    .map((member) => member.trim())
    .filter(Boolean)
    .slice(0, 20);
}

const scoreSchema = z.number().int().min(0).max(10);

export interface DraftPayload {
  scores: Record<string, number>;
  criterionComments: Record<string, string>;
  generalComment: string;
}

export function parseDraftPayload(
  payload: unknown,
  criteria: Criterion[] = DEFAULT_CRITERIA,
): DraftPayload {
  const data =
    typeof payload === "object" && payload !== null
      ? (payload as {
          scores?: Record<string, unknown>;
          criterionComments?: Record<string, unknown>;
          generalComment?: unknown;
        })
      : {};

  const scores: Record<string, number> = {};
  for (const criterion of criteria) {
    const raw = data.scores?.[criterion.key];
    const parsed = scoreSchema.safeParse(
      typeof raw === "string" ? Number(raw) : raw,
    );
    if (parsed.success) {
      scores[criterion.key] = parsed.data;
    }
  }

  const criterionComments: Record<string, string> = {};
  for (const criterion of criteria) {
    const raw = data.criterionComments?.[criterion.key];
    criterionComments[criterion.key] =
      typeof raw === "string" ? raw.trim().slice(0, 1500) : "";
  }

  const generalComment =
    typeof data.generalComment === "string"
      ? data.generalComment.trim().slice(0, 4000)
      : "";

  return { scores, criterionComments, generalComment };
}

export function parseReviewPayload(
  payload: unknown,
  criteria: Criterion[] = DEFAULT_CRITERIA,
):
  | {
      ok: true;
      scores: Record<string, number>;
      criterionComments: Record<string, string>;
      generalComment: string;
    }
  | { ok: false; error: string } {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "Données de review invalides." };
  }

  const data = payload as {
    scores?: Record<string, unknown>;
    criterionComments?: Record<string, unknown>;
    generalComment?: unknown;
  };

  const scores: Record<string, number> = {};
  for (const criterion of criteria) {
    const raw = data.scores?.[criterion.key];
    const parsed = scoreSchema.safeParse(
      typeof raw === "string" ? Number(raw) : raw,
    );
    if (!parsed.success) {
      return {
        ok: false,
        error: `La note « ${criterion.label} » doit être comprise entre 0 et 10.`,
      };
    }
    scores[criterion.key] = parsed.data;
  }

  const criterionComments: Record<string, string> = {};
  for (const criterion of criteria) {
    const raw = data.criterionComments?.[criterion.key];
    criterionComments[criterion.key] =
      typeof raw === "string" ? raw.trim().slice(0, 1500) : "";
  }

  const generalComment =
    typeof data.generalComment === "string"
      ? data.generalComment.trim().slice(0, 4000)
      : "";

  return { ok: true, scores, criterionComments, generalComment };
}
