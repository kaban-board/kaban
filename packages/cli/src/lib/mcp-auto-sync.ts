import { type McpResponse } from "../commands/mcp.js";

interface TursoConfig {
  syncUrl?: string;
  authToken?: string;
  enabled: boolean;
}

export class McpAutoSync {
  private config: TursoConfig;
  private syncInProgress: boolean = false;

  constructor(config: TursoConfig) {
    this.config = config;
  }

  wrapHandler<TArgs extends unknown[], TReturn extends McpResponse>(
    handler: (...args: TArgs) => Promise<TReturn>,
    options: { syncAfter: boolean } = { syncAfter: true }
  ): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs): Promise<TReturn> => {
      const result = await handler(...args);

      if (options.syncAfter && this.config.enabled && !result.isError) {
        this.syncInBackground();
      }

      return result;
    };
  }

  private async syncInBackground(): Promise<void> {
    if (this.syncInProgress || !this.config.syncUrl) {
      return;
    }

    this.syncInProgress = true;

    try {
      const { exec } = await import("node:child_process");
      exec(
        `kaban turso-sync`,
        { env: { ...process.env, KABAN_AUTO_SYNC: "1" } },
        (error) => {
          if (error) {
            console.error("[AutoSync] Failed:", error.message);
          } else {
            console.log("[AutoSync] Success");
          }
          this.syncInProgress = false;
        }
      );
    } catch (error) {
      console.error("[AutoSync] Error:", error);
      this.syncInProgress = false;
    }
  }
}

export function getTursoConfig(): TursoConfig {
  try {
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const configPath = join(process.cwd(), ".kaban", "config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));

    return {
      enabled: config.driver === "libsql" && !!config.syncUrl,
      syncUrl: config.syncUrl,
      authToken: config.authToken,
    };
  } catch {
    return { enabled: false };
  }
}
