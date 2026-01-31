import { Command } from "commander";
import { getKabanPaths } from "../lib/context.js";
import { readFileSync } from "node:fs";
import { createDb, type Config } from "@kaban-board/core";

export const tursoSyncCommand = new Command("turso-sync")
  .description("Sync local database with Turso Cloud")
  .option("-w, --watch", "Watch for changes and sync automatically")
  .option("-i, --interval <seconds>", "Sync interval in seconds (default: 30)", "30")
  .action(async (options) => {
    try {
      const { dbPath, configPath } = getKabanPaths();
      const config: Config = JSON.parse(readFileSync(configPath, "utf-8"));
      
      if (!config.driver || config.driver !== "libsql") {
        console.error("Turso not configured. Run: kaban init --turso");
        process.exit(1);
      }

      if (!config.syncUrl) {
        console.error("syncUrl not configured. Check .kaban/config.json");
        process.exit(1);
      }

      const interval = parseInt(options.interval) * 1000;

      async function performSync() {
        try {
          const db = await createDb({
            url: `file:${dbPath}`,
            authToken: config.authToken,
            syncUrl: config.syncUrl,
          });

          const client = db.$client as { sync?: () => Promise<void> };
          if (client.sync) {
            await client.sync();
            console.log(`Sync completed at ${new Date().toLocaleTimeString()}`);
          } else {
            console.log("Sync not available (client does not support sync)");
          }

          await db.$close();
        } catch (error) {
          console.error("Sync failed:", error instanceof Error ? error.message : error);
        }
      }

      console.log("Starting Turso sync...");
      console.log(`Database: ${dbPath}`);
      console.log(`Sync URL: ${config.syncUrl}`);
      await performSync();

      if (options.watch) {
        console.log(`\nWatching for changes (interval: ${options.interval}s)...`);
        console.log("Press Ctrl+C to stop\n");
        
        setInterval(performSync, interval);
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
