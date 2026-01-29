import { existsSync, renameSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { ExitCode, KabanError } from "../types.js";

export interface RecoveryResult {
  recovered: boolean;
  method?: "wal_checkpoint" | "dump_restore" | "fts_rebuild";
  backupPath?: string;
}

/**
 * Check if database is corrupted using PRAGMA integrity_check
 */
export function checkIntegrity(
  db: { query: (sql: string) => { get: () => Record<string, unknown> | null } },
): boolean {
  try {
    const result = db.query("PRAGMA integrity_check").get();
    return result?.integrity_check === "ok";
  } catch {
    return false;
  }
}

/**
 * Attempt WAL checkpoint to recover from WAL-related corruption
 */
export function attemptWalRecovery(
  db: { query: (sql: string) => { get: () => Record<string, unknown> | null } },
): boolean {
  try {
    db.query("PRAGMA wal_checkpoint(TRUNCATE)").get();
    return checkIntegrity(db);
  } catch {
    return false;
  }
}

/**
 * Dump database using sqlite3 CLI and restore to new file
 */
export function dumpAndRestore(dbPath: string): { success: boolean; backupPath: string } {
  const backupPath = `${dbPath}.corrupted.${Date.now()}`;
  const dumpPath = `${dbPath}.dump.sql`;

  try {
    // Dump what we can recover
    execSync(`sqlite3 "${dbPath}" ".dump" > "${dumpPath}" 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 30000,
    });

    // Rename corrupted DB
    renameSync(dbPath, backupPath);

    // Remove WAL/SHM files if they exist
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (existsSync(walPath)) unlinkSync(walPath);
    if (existsSync(shmPath)) unlinkSync(shmPath);

    // Restore from dump
    execSync(`sqlite3 "${dbPath}" < "${dumpPath}"`, {
      encoding: "utf-8",
      timeout: 30000,
    });

    // Clean up dump file
    unlinkSync(dumpPath);

    return { success: true, backupPath };
  } catch {
    // Clean up on failure
    try {
      if (existsSync(dumpPath)) unlinkSync(dumpPath);
      // Restore original if backup exists but restore failed
      if (existsSync(backupPath) && !existsSync(dbPath)) {
        renameSync(backupPath, dbPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    return { success: false, backupPath };
  }
}

/**
 * Rebuild FTS table and triggers (fixes corrupted FTS)
 * Uses simple standalone FTS compatible with both bun:sqlite and libsql
 */
export function rebuildFts(
  db: { run: (sql: string) => void; query: (sql: string) => { all: () => unknown[] } },
): boolean {
  try {
    // Drop old FTS
    db.run("DROP TABLE IF EXISTS tasks_fts");
    db.run("DROP TRIGGER IF EXISTS tasks_fts_insert");
    db.run("DROP TRIGGER IF EXISTS tasks_fts_delete");
    db.run("DROP TRIGGER IF EXISTS tasks_fts_update");

    // Recreate simple standalone FTS (no content/content_rowid for cross-driver compatibility)
    db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
        id, title, description,
        tokenize='unicode61 remove_diacritics 2'
      )
    `);

    // Simple triggers using DELETE/UPDATE (compatible with libsql)
    db.run(`
      CREATE TRIGGER IF NOT EXISTS tasks_fts_insert AFTER INSERT ON tasks BEGIN
        INSERT INTO tasks_fts (id, title, description)
        VALUES (NEW.id, NEW.title, COALESCE(NEW.description, ''));
      END
    `);

    db.run(`
      CREATE TRIGGER IF NOT EXISTS tasks_fts_delete AFTER DELETE ON tasks BEGIN
        DELETE FROM tasks_fts WHERE id = OLD.id;
      END
    `);

    db.run(`
      CREATE TRIGGER IF NOT EXISTS tasks_fts_update AFTER UPDATE ON tasks BEGIN
        UPDATE tasks_fts 
        SET title = NEW.title, description = COALESCE(NEW.description, '')
        WHERE id = OLD.id;
      END
    `);

    // Repopulate FTS from existing tasks
    db.run(`
      INSERT INTO tasks_fts (id, title, description)
      SELECT id, title, COALESCE(description, '') FROM tasks
    `);

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if FTS is corrupted by attempting a test delete
 */
export function checkFtsHealth(
  db: { run: (sql: string) => void; query: (sql: string) => { get: () => unknown } },
): boolean {
  try {
    // Try a harmless operation that would trigger FTS
    db.query("SELECT COUNT(*) FROM tasks_fts").get();
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempt automatic database recovery
 */
export async function attemptRecovery(
  dbPath: string,
  openDb: () => {
    query: (sql: string) => { get: () => Record<string, unknown> | null; all: () => unknown[] };
    run: (sql: string) => void;
    close: () => void;
  },
): Promise<RecoveryResult> {
  let db: ReturnType<typeof openDb> | null = null;

  try {
    db = openDb();

    // Step 1: Check basic integrity
    const integrityOk = checkIntegrity(db);

    // Step 2: Check FTS health (can be corrupted even if integrity_check passes)
    const ftsOk = checkFtsHealth(db);

    if (integrityOk && ftsOk) {
      return { recovered: false }; // No recovery needed
    }

    // Step 3: If only FTS is broken, rebuild it
    if (integrityOk && !ftsOk) {
      console.warn("[kaban] FTS corruption detected, rebuilding...");
      if (rebuildFts(db)) {
        console.warn("[kaban] FTS rebuilt successfully");
        return { recovered: true, method: "fts_rebuild" };
      }
    }

    if (integrityOk) {
      return { recovered: false }; // Integrity OK, FTS rebuild failed but continue
    }

    console.warn("[kaban] Database corruption detected, attempting recovery...");

    // Step 2: Try WAL checkpoint
    if (attemptWalRecovery(db)) {
      console.warn("[kaban] Recovery successful via WAL checkpoint");
      return { recovered: true, method: "wal_checkpoint" };
    }

    // Close before dump/restore
    db.close();
    db = null;

    // Step 3: Dump and restore
    const { success, backupPath } = dumpAndRestore(dbPath);
    if (success) {
      console.warn(`[kaban] Recovery successful via dump/restore. Backup: ${backupPath}`);
      return { recovered: true, method: "dump_restore", backupPath };
    }

    throw new KabanError(
      `Database is corrupted and automatic recovery failed. Backup at: ${backupPath}`,
      ExitCode.GENERAL_ERROR,
    );
  } finally {
    try {
      db?.close();
    } catch {
      // Ignore close errors
    }
  }
}
