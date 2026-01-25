import { Command } from "commander";
import { DEFAULT_CONFIG, TodoWriteHookInputSchema } from "../hook/schemas.js";
import { SyncEngine } from "../hook/sync-engine.js";
import { SyncLogger } from "../hook/sync-logger.js";
import { getContext } from "../lib/context.js";

export const syncCommand = new Command("sync")
  .description("Sync TodoWrite input to Kaban board (reads from stdin)")
  .option("--no-log", "Disable sync logging")
  .action(async (options) => {
    const startTime = performance.now();

    let input: string;
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      input = Buffer.concat(chunks).toString("utf-8");
    } catch {
      process.exit(0);
    }

    if (!input.trim()) {
      process.exit(0);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      process.exit(0);
    }

    const validation = TodoWriteHookInputSchema.safeParse(parsed);
    if (!validation.success) {
      process.exit(0);
    }

    const hookInput = validation.data;
    const { cwd, tool_input } = hookInput;
    const { todos } = tool_input;

    if (todos.length === 0) {
      process.exit(0);
    }

    const config = { ...DEFAULT_CONFIG, logEnabled: options.log !== false };
    const engine = new SyncEngine(cwd, config);
    const logger = new SyncLogger(config.logPath);

    try {
      const result = await engine.sync(todos);
      const durationMs = Math.round(performance.now() - startTime);

      if (config.logEnabled) {
        await logger.log(todos.length, result, durationMs);
      }

      process.exit(result.success ? 0 : 1);
    } catch {
      process.exit(1);
    }
  });
