"use server";

import { revalidatePath } from "next/cache";
import { db, reviews } from "@/db";
import { logAudit } from "@/lib/audit";
import { criteriaFromSettings } from "@/lib/criteria";
import {
  getAssignmentForReviewer,
  getSettings,
} from "@/lib/data";
import { computeWeightedScore } from "@/lib/scoring";
import { getSession } from "@/lib/session";
import {
  parseDraftPayload,
  parseReviewPayload,
} from "@/lib/validation";

export interface ActionResult {
  ok: boolean;
  error?: string;
  savedAt?: string;
}

async function currentGroupId(): Promise<number | null> {
  const session = await getSession();
  if (session.role !== "group" || !session.groupId) return null;
  return session.groupId;
}

export async function saveDraft(
  assignmentId: number,
  payload: unknown,
): Promise<ActionResult> {
  const groupId = await currentGroupId();
  if (!groupId) {
    return { ok: false, error: "Session expirée. Reconnectez-vous." };
  }

  const settings = await getSettings();
  if (settings.phase !== "REVIEWS") {
    return { ok: false, error: "La phase de reviews n'est pas ouverte." };
  }

  const assignment = await getAssignmentForReviewer(assignmentId, groupId);
  if (!assignment) {
    return { ok: false, error: "Affectation introuvable." };
  }
  if (assignment.review?.status === "submitted") {
    return { ok: false, error: "Cette review est déjà soumise." };
  }

  const draft = parseDraftPayload(payload, criteriaFromSettings(settings));
  const now = new Date();

  await db
    .insert(reviews)
    .values({
      assignmentId,
      scores: draft.scores,
      criterionComments: draft.criterionComments,
      generalComment: draft.generalComment,
      status: "draft",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: reviews.assignmentId,
      set: {
        scores: draft.scores,
        criterionComments: draft.criterionComments,
        generalComment: draft.generalComment,
        updatedAt: now,
      },
    });

  return { ok: true, savedAt: now.toISOString() };
}

export async function submitReview(
  assignmentId: number,
  payload: unknown,
): Promise<ActionResult> {
  const groupId = await currentGroupId();
  if (!groupId) {
    return { ok: false, error: "Session expirée. Reconnectez-vous." };
  }

  const settings = await getSettings();
  if (settings.phase !== "REVIEWS") {
    return { ok: false, error: "La phase de reviews n'est pas ouverte." };
  }

  const assignment = await getAssignmentForReviewer(assignmentId, groupId);
  if (!assignment) {
    return { ok: false, error: "Affectation introuvable." };
  }
  if (assignment.review?.status === "submitted") {
    return { ok: false, error: "Cette review est déjà soumise." };
  }

  const criteria = criteriaFromSettings(settings);
  const parsed = parseReviewPayload(payload, criteria);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  if (parsed.generalComment.length < 10) {
    return {
      ok: false,
      error:
        "Ajoutez un commentaire général d'au moins 10 caractères pour aider le groupe évalué.",
    };
  }

  const weightedScore = computeWeightedScore(parsed.scores, criteria);
  if (weightedScore === null) {
    return { ok: false, error: "Toutes les notes doivent être renseignées." };
  }

  const now = new Date();
  await db
    .insert(reviews)
    .values({
      assignmentId,
      scores: parsed.scores,
      criterionComments: parsed.criterionComments,
      generalComment: parsed.generalComment,
      weightedScore,
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: reviews.assignmentId,
      set: {
        scores: parsed.scores,
        criterionComments: parsed.criterionComments,
        generalComment: parsed.generalComment,
        weightedScore,
        status: "submitted",
        submittedAt: now,
        updatedAt: now,
      },
    });

  await logAudit({
    actorType: "group",
    actorId: groupId,
    action: "group.review.submit",
    details: { assignmentId, weightedScore },
  });

  revalidatePath("/espace");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/resultats");

  return { ok: true, savedAt: now.toISOString() };
}
