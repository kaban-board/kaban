import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { Command } from "commander";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function hasBun(): boolean {
  try {
    const result = spawnSync("bun", ["--version"], { stdio: "ignore" });
    return result.status === 0;
  } catch {
    return false;
  }
}

function resolveTuiPackage(): string | null {
  try {
    return require.resolve("@kaban-board/tui");
  } catch {
    return null;
  }
}

export const tuiCommand = new Command("tui")
  .description("Start interactive Terminal UI")
  .action(async () => {
    const cwd = process.cwd();
    const useBun = hasBun();

    // 1. Development mode: Try monorepo TypeScript source
    const tuiDevEntry = join(__dirname, "../../../tui/src/index.ts");
    if (existsSync(tuiDevEntry)) {
      if (useBun) {
        const child = spawn("bun", ["run", tuiDevEntry], { stdio: "inherit", cwd });
        child.on("exit", (code) => process.exit(code ?? 0));
        return;
      }
      console.error("Development mode requires bun. Install: curl -fsSL https://bun.sh/install | bash");
      process.exit(1);
    }

    // 2. Production: Use the bundled @kaban-board/tui dependency
    const tuiEntry = resolveTuiPackage();
    if (tuiEntry) {
      const runtime = useBun ? "bun" : "node";
      const child = spawn(runtime, [tuiEntry], { stdio: "inherit", cwd });
      child.on("exit", (code) => process.exit(code ?? 0));
      return;
    }

    // 3. Fallback: npx (should rarely happen now that tui is a dependency)
    console.error("Fetching TUI via npx...");
    const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(npxCmd, ["--yes", "@kaban-board/tui"], { stdio: "inherit", cwd });
    child.on("exit", (code) => process.exit(code ?? 0));
  });
