import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const tuiCommand = new Command("tui")
  .description("Start interactive Terminal UI")
  .action(async () => {
    const tuiEntry = join(__dirname, "../../../tui/src/index.ts");

    const child = spawn("bun", ["run", tuiEntry], {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    child.on("exit", (code) => {
      process.exit(code ?? 0);
    });
  });
