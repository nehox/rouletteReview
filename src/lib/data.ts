import { and, asc, count, desc, eq } from "drizzle-orm";
import {
  assignments,
  auditLog,
  db,
  groups,
  reviews,
  settings,
  type Assignment,
  type Group,
  type Review,
  type Settings,
} from "@/db";
import { criteriaFromSettings } from "./criteria";
import {
  aggregateReviews,
  type AggregatedResult,
  type CriterionKey,
} from "./scoring";

export async function getSettings(): Promise<Settings> {
  const row = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .get();
  if (!row) {
    throw new Error("Configuration introuvable.");
  }
  return row;
}

export async function getGroups(): Promise<Group[]> {
  return db.select().from(groups).orderBy(asc(groups.id)).all();
}

export async function getRegisteredGroups(): Promise<Group[]> {
  return db
    .select()
    .from(groups)
    .where(eq(groups.status, "registered"))
    .orderBy(asc(groups.id))
    .all();
}

export async function getGroupById(id: number): Promise<Group | undefined> {
  return db.select().from(groups).where(eq(groups.id, id)).get();
}

export async function getGroupByCode(code: string): Promise<Group | undefined> {
  return db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, code.toUpperCase()))
    .get();
}

export interface Stats {
  totalGroups: number;
  registeredGroups: number;
  submittedReviews: number;
  expectedReviews: number;
}

export async function getStats(): Promise<Stats> {
  const totalRow = await db
    .select({ value: count() })
    .from(groups)
    .get();
  const registeredRow = await db
    .select({ value: count() })
    .from(groups)
    .where(eq(groups.status, "registered"))
    .get();
  const submittedRow = await db
    .select({ value: count() })
    .from(reviews)
    .where(eq(reviews.status, "submitted"))
    .get();

  const totalGroups = Number(totalRow?.value ?? 0);
  return {
    totalGroups,
    registeredGroups: Number(registeredRow?.value ?? 0),
    submittedReviews: Number(submittedRow?.value ?? 0),
    expectedReviews: totalGroups * 2,
  };
}

export interface ReviewerAssignment {
  assignment: Assignment;
  reviewed: Group;
  review: Review | null;
}

export async function getAssignmentsForReviewer(
  reviewerGroupId: number,
): Promise<ReviewerAssignment[]> {
  const rows = await db
    .select({
      assignment: assignments,
      reviewed: groups,
      review: reviews,
    })
    .from(assignments)
    .innerJoin(groups, eq(assignments.reviewedGroupId, groups.id))
    .leftJoin(reviews, eq(reviews.assignmentId, assignments.id))
    .where(eq(assignments.reviewerGroupId, reviewerGroupId))
    .orderBy(asc(assignments.id))
    .all();

  return rows.map((row) => ({
    assignment: row.assignment,
    reviewed: row.reviewed,
    review: row.review ?? null,
  }));
}

export async function getAssignmentForReviewer(
  assignmentId: number,
  reviewerGroupId: number,
): Promise<ReviewerAssignment | null> {
  const row = await db
    .select({
      assignment: assignments,
      reviewed: groups,
      review: reviews,
    })
    .from(assignments)
    .innerJoin(groups, eq(assignments.reviewedGroupId, groups.id))
    .leftJoin(reviews, eq(reviews.assignmentId, assignments.id))
    .where(
      and(
        eq(assignments.id, assignmentId),
        eq(assignments.reviewerGroupId, reviewerGroupId),
      ),
    )
    .get();

  if (!row) return null;
  return {
    assignment: row.assignment,
    reviewed: row.reviewed,
    review: row.review ?? null,
  };
}

export interface AdminAssignmentRow {
  assignment: Assignment;
  reviewer: Group;
  reviewed: Group;
  review: Review | null;
}

export async function getAllAssignments(): Promise<AdminAssignmentRow[]> {
  const reviewerAlias = groups;
  const rows = await db
    .select({
      assignment: assignments,
      reviewer: reviewerAlias,
      review: reviews,
    })
    .from(assignments)
    .innerJoin(reviewerAlias, eq(assignments.reviewerGroupId, reviewerAlias.id))
    .leftJoin(reviews, eq(reviews.assignmentId, assignments.id))
    .orderBy(asc(assignments.id))
    .all();

  const reviewedGroups = await getGroups();
  const byId = new Map(reviewedGroups.map((group) => [group.id, group]));

  return rows
    .map((row) => ({
      assignment: row.assignment,
      reviewer: row.reviewer,
      reviewed: byId.get(row.assignment.reviewedGroupId) as Group,
      review: row.review ?? null,
    }))
    .filter((row) => Boolean(row.reviewed));
}

export interface GroupResult {
  group: Group;
  result: AggregatedResult;
  reviews: {
    scores: Record<string, number>;
    criterionComments: Record<string, string>;
    generalComment: string | null;
    weightedScore: number | null;
    submittedAt: Date | null;
  }[];
}

export async function getResults(): Promise<GroupResult[]> {
  const [allGroups, settings] = await Promise.all([getGroups(), getSettings()]);
  const criteria = criteriaFromSettings(settings);
  const rows = await db
    .select({
      reviewedGroupId: assignments.reviewedGroupId,
      review: reviews,
    })
    .from(assignments)
    .leftJoin(reviews, eq(reviews.assignmentId, assignments.id))
    .all();

  return allGroups.map((group) => {
    const groupReviews = rows
      .filter(
        (row) =>
          row.reviewedGroupId === group.id &&
          row.review &&
          row.review.status === "submitted",
      )
      .map((row) => row.review as Review);

    const result = aggregateReviews(
      groupReviews.map((review) => ({
        scores: review.scores,
        weightedScore: review.weightedScore,
      })),
      criteria,
    );

    return {
      group,
      result,
      reviews: groupReviews.map((review) => ({
        scores: review.scores,
        criterionComments: review.criterionComments,
        generalComment: review.generalComment,
        weightedScore: review.weightedScore,
        submittedAt: review.submittedAt,
      })),
    };
  });
}

export async function getGroupResult(
  groupId: number,
): Promise<GroupResult | null> {
  const results = await getResults();
  return results.find((entry) => entry.group.id === groupId) ?? null;
}

export async function getAuditEntries(limit = 200) {
  return db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.id))
    .limit(limit)
    .all();
}

export function resultCriteria(result: AggregatedResult): {
  key: CriterionKey;
  value: number | null;
}[] {
  return Object.entries(result.criteria).map(([key, value]) => ({
    key: key as CriterionKey,
    value,
  }));
}
