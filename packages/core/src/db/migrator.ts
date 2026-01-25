import type { DB } from "./index.js";

interface MigrationEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface MigrationJournal {
  version: string;
  dialect: string;
  entries: MigrationEntry[];
}

interface Migration {
  tag: string;
  sql: string;
}

// Import generated migrations - these get bundled
import journal from "../../drizzle/meta/_journal.json";
import sql0000 from "../../drizzle/0000_init.sql";
import sql0001 from "../../drizzle/0001_add_fts5.sql";

const migrationSql: Record<string, string> = {
  "0000_init": sql0000,
  "0001_add_fts5": sql0001,
};

function getMigrations(): Migration[] {
  const j = journal as MigrationJournal;
  return j.entries.map((entry) => ({
    tag: entry.tag,
    sql: migrationSql[entry.tag] ?? "",
  }));
}

async function getAppliedMigrations(db: DB): Promise<Set<string>> {
  try {
    // Use raw SQL to check applied migrations
    const results: { tag: string }[] = [];

    // Try to query the migrations table
    const client = db.$client as unknown;

    // bun:sqlite client
    if (client && typeof (client as { prepare?: unknown }).prepare === "function") {
      const bunClient = client as { prepare: (sql: string) => { all: () => { tag: string }[] } };
      const rows = bunClient.prepare("SELECT tag FROM __drizzle_migrations").all();
      return new Set(rows.map((r) => r.tag));
    }

    // libsql client
    if (client && typeof (client as { execute?: unknown }).execute === "function") {
      const libsqlClient = client as {
        execute: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
      };
      const res = await libsqlClient.execute("SELECT tag FROM __drizzle_migrations");
      return new Set(res.rows.map((r) => String(r.tag)));
    }

    return new Set(results.map((r) => r.tag));
  } catch {
    // Table doesn't exist yet
    return new Set();
  }
}

async function createMigrationsTable(db: DB): Promise<void> {
  await db.$runRaw(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )
  `);
}

async function recordMigration(db: DB, tag: string): Promise<void> {
  const now = Date.now();
  await db.$runRaw(`INSERT INTO __drizzle_migrations (tag, created_at) VALUES ('${tag}', ${now})`);
}

export async function runMigrations(db: DB): Promise<{ applied: string[] }> {
  await createMigrationsTable(db);

  const applied = await getAppliedMigrations(db);
  const migrations = getMigrations();
  const toApply = migrations.filter((m) => !applied.has(m.tag));

  const newlyApplied: string[] = [];

  for (const migration of toApply) {
    if (!migration.sql) {
      throw new Error(`Migration SQL not found for: ${migration.tag}`);
    }

    // Split by statement breakpoint marker
    const statements = migration.sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await db.$runRaw(stmt);
    }

    await recordMigration(db, migration.tag);
    newlyApplied.push(migration.tag);
  }

  return { applied: newlyApplied };
}
