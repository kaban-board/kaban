import { existsSync } from "node:fs";
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname } from "node:path";
import type { SyncResult } from "./types.js";

interface SyncLogEntry {
  timestamp: string;
  todosCount: number;
  created: number;
  moved: number;
  skipped: number;
  errors: string[];
  durationMs: number;
}

export class SyncLogger {
  private logPath: string;

  constructor(logPath: string) {
    this.logPath = this.expandPath(logPath);
  }

  async log(todosCount: number, result: SyncResult, durationMs: number): Promise<void> {
    const entry: SyncLogEntry = {
      timestamp: new Date().toISOString(),
      todosCount,
      created: result.created,
      moved: result.moved,
      skipped: result.skipped,
      errors: result.errors,
      durationMs,
    };

    await this.ensureDir();
    await appendFile(this.logPath, `${JSON.stringify(entry)}\n`);
  }

  private async ensureDir(): Promise<void> {
    const dir = dirname(this.logPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  private expandPath(path: string): string {
    if (path.startsWith("~/")) {
      return path.replace("~", homedir());
    }
    return path;
  }
}
