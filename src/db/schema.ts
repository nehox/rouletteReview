import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { Criterion } from "../lib/criteria";

export const PHASES = [
  "SETUP",
  "INSCRIPTIONS",
  "DRAW",
  "REVIEWS",
  "CLOSED",
] as const;

export type Phase = (typeof PHASES)[number];

export const groups = sqliteTable(
  "groups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slotLabel: text("slot_label").notNull(),
    displayName: text("display_name"),
    inviteCode: text("invite_code").notNull(),
    passwordHash: text("password_hash"),
    members: text("members", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    repoUrl: text("repo_url"),
    status: text("status", { enum: ["pending", "registered"] })
      .notNull()
      .default("pending"),
    registeredAt: integer("registered_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("groups_invite_code_unique").on(table.inviteCode)],
);

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  phase: text("phase", { enum: PHASES }).notNull().default("SETUP"),
  numGroups: integer("num_groups").notNull().default(10),
  drawSeed: text("draw_seed"),
  drawAt: integer("draw_at", { mode: "timestamp" }),
  reviewsClosedAt: integer("reviews_closed_at", { mode: "timestamp" }),
  resultsPublishedAt: integer("results_published_at", { mode: "timestamp" }),
  reviewCriteria: text("review_criteria", { mode: "json" }).$type<Criterion[]>(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const assignments = sqliteTable(
  "assignments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reviewerGroupId: integer("reviewer_group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    reviewedGroupId: integer("reviewed_group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("assignments_unique_pair").on(
      table.reviewerGroupId,
      table.reviewedGroupId,
    ),
  ],
);

export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    scores: text("scores", { mode: "json" })
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    criterionComments: text("criterion_comments", { mode: "json" })
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    generalComment: text("general_comment"),
    weightedScore: real("weighted_score"),
    status: text("status", { enum: ["draft", "submitted"] })
      .notNull()
      .default("draft"),
    submittedAt: integer("submitted_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("reviews_assignment_unique").on(table.assignmentId)],
);

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorType: text("actor_type", { enum: ["admin", "group", "system"] })
    .notNull()
    .default("system"),
  actorId: integer("actor_id"),
  action: text("action").notNull(),
  details: text("details", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Group = typeof groups.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
