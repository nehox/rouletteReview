import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/db/schema";
import { generateDraw, verifyDraw } from "../src/lib/draw";
import { aggregateReviews, computeWeightedScore, CRITERIA } from "../src/lib/scoring";

describe("Scénario complet : cycle de vie d'une revue", () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(() => {
    sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    sqlite.exec(`
      CREATE TABLE groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_label TEXT NOT NULL,
        display_name TEXT,
        invite_code TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        members TEXT NOT NULL DEFAULT '[]',
        repo_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        registered_at INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reviewer_group_id INTEGER NOT NULL REFERENCES groups(id),
        reviewed_group_id INTEGER NOT NULL REFERENCES groups(id),
        created_at INTEGER NOT NULL
      );
      CREATE TABLE reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER NOT NULL UNIQUE REFERENCES assignments(id),
        scores TEXT NOT NULL DEFAULT '{}',
        criterion_comments TEXT NOT NULL DEFAULT '{}',
        general_comment TEXT,
        weighted_score REAL,
        status TEXT NOT NULL DEFAULT 'draft',
        submitted_at INTEGER,
        updated_at INTEGER NOT NULL
      );
    `);
    db = drizzle(sqlite, { schema });
  });

  afterAll(() => {
    sqlite.close();
  });

  it("exécute le cycle complet pour 10 groupes", () => {
    const now = new Date();

    // 1. Inscription des 10 groupes
    const groupIds: number[] = [];
    for (let i = 1; i <= 10; i += 1) {
      const res = sqlite
        .prepare(
          `INSERT INTO groups (slot_label, display_name, invite_code, repo_url, status, created_at)
           VALUES (?, ?, ?, ?, 'registered', ?)`,
        )
        .run(
          `Groupe ${i}`,
          `Team Swift ${i}`,
          `CODE${i.toString().padStart(4, "0")}`,
          `https://github.com/etudiants/projet-${i}`,
          now.getTime(),
        );
      groupIds.push(Number(res.lastInsertRowid));
    }
    expect(groupIds).toHaveLength(10);

    // 2. Tirage au sort
    const edges = generateDraw(groupIds);
    expect(edges).toHaveLength(20);
    expect(verifyDraw(groupIds, edges)).toEqual([]);

    const assignmentIds: number[] = [];
    for (const edge of edges) {
      const res = sqlite
        .prepare(
          `INSERT INTO assignments (reviewer_group_id, reviewed_group_id, created_at)
           VALUES (?, ?, ?)`,
        )
        .run(edge.reviewerGroupId, edge.reviewedGroupId, now.getTime());
      assignmentIds.push(Number(res.lastInsertRowid));
    }
    expect(assignmentIds).toHaveLength(20);

    // 3. Soumission de toutes les reviews avec notes réalistes
    for (const assignmentId of assignmentIds) {
      const scores = Object.fromEntries(
        CRITERIA.map((criterion, index) => [
          criterion.key,
          ((assignmentId + index) % 5) + 6, // notes entre 6 et 10
        ]),
      );
      const weightedScore = computeWeightedScore(scores);
      expect(weightedScore).not.toBeNull();

      sqlite
        .prepare(
          `INSERT INTO reviews (assignment_id, scores, criterion_comments, general_comment, weighted_score, status, submitted_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?)`,
        )
        .run(
          assignmentId,
          JSON.stringify(scores),
          JSON.stringify({ cleanliness: "Beau travail" }),
          "Projet bien mené, félicitations.",
          weightedScore,
          now.getTime(),
          now.getTime(),
        );
    }

    // 4. Vérification que chaque projet a reçu exactement 2 reviews
    for (const groupId of groupIds) {
      const received = sqlite
        .prepare(
          `SELECT r.scores, r.weighted_score
           FROM reviews r
           INNER JOIN assignments a ON r.assignment_id = a.id
           WHERE a.reviewed_group_id = ? AND r.status = 'submitted'`,
        )
        .all(groupId) as { scores: string; weighted_score: number }[];

      expect(received).toHaveLength(2);

      const parsed = received.map((entry) => ({
        scores: JSON.parse(entry.scores) as Record<string, number>,
        weightedScore: entry.weighted_score,
      }));
      const aggregated = aggregateReviews(parsed);
      expect(aggregated.reviewCount).toBe(2);
      expect(aggregated.weightedScore).toBeGreaterThanOrEqual(10);
      expect(aggregated.weightedScore).toBeLessThanOrEqual(20);
    }
  });
});
