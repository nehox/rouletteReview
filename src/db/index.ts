import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_label TEXT NOT NULL,
  display_name TEXT,
  invite_code TEXT NOT NULL,
  password_hash TEXT,
  members TEXT NOT NULL DEFAULT '[]',
  repo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  registered_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS groups_invite_code_unique ON groups (invite_code);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  phase TEXT NOT NULL DEFAULT 'SETUP',
  num_groups INTEGER NOT NULL DEFAULT 10,
  draw_seed TEXT,
  draw_at INTEGER,
  reviews_closed_at INTEGER,
  results_published_at INTEGER,
  review_criteria TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reviewer_group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  reviewed_group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS assignments_unique_pair
  ON assignments (reviewer_group_id, reviewed_group_id);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  scores TEXT NOT NULL DEFAULT '{}',
  criterion_comments TEXT NOT NULL DEFAULT '{}',
  general_comment TEXT,
  weighted_score REAL,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS reviews_assignment_unique ON reviews (assignment_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id INTEGER,
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
`;

function createDatabase() {
  const dbPath =
    process.env.DATABASE_PATH ??
    path.join(process.cwd(), "data", "app.db");

  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const sqlite = new Database(dbPath, { timeout: 10000 });
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 10000");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(SCHEMA_SQL);

  const settingsColumns = sqlite
    .prepare("PRAGMA table_info(settings)")
    .all() as { name: string }[];
  if (!settingsColumns.some((column) => column.name === "review_criteria")) {
    sqlite.exec("ALTER TABLE settings ADD COLUMN review_criteria TEXT");
  }

  sqlite
    .prepare(
      `INSERT INTO settings (id, phase, num_groups, updated_at)
       VALUES (1, 'SETUP', ?, ?)
       ON CONFLICT(id) DO NOTHING`,
    )
    .run(
      Number.parseInt(process.env.NUM_GROUPS ?? "10", 10) || 10,
      Math.floor(Date.now() / 1000),
    );

  return { sqlite, db: drizzle(sqlite, { schema }) };
}

const globalForDb = globalThis as unknown as {
  __rouletteDb?: ReturnType<typeof createDatabase>;
};

const instance = globalForDb.__rouletteDb ?? createDatabase();
if (process.env.NODE_ENV !== "production") {
  globalForDb.__rouletteDb = instance;
}

export const db = instance.db;
export const sqlite = instance.sqlite;
export * from "./schema";
