import { spawn } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { chmod, copyFile, mkdir, readFile, stat, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { SettingsManager } from "../hook/settings-manager.js";

const HOOKS_DIR = join(homedir(), ".claude", "hooks");
const HOOK_BINARY_NAME = "kaban-hook";
const LOG_FILE = "sync.log";

interface CheckResult {
  name: string;
  ok: boolean;
  message: string;
}

interface LogEntry {
  timestamp: string;
  todosCount: number;
  created: number;
  moved: number;
  skipped: number;
  errors: string[];
  durationMs: number;
}

async function checkKabanCli(): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    try {
      const proc = spawn("kaban", ["--version"]);
      let stdout = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve({ ok: true, message: stdout.trim() });
        } else {
          resolve({ ok: false, message: "not working" });
        }
      });

      proc.on("error", () => {
        resolve({ ok: false, message: "not found in PATH" });
      });
    } catch {
      resolve({ ok: false, message: "not found in PATH" });
    }
  });
}

async function checkDependencies(): Promise<{ ok: boolean; results: CheckResult[] }> {
  const results: CheckResult[] = [];

  const isBun = typeof Bun !== "undefined";
  results.push({
    name: "Runtime",
    ok: true,
    message: isBun ? `Bun v${Bun.version}` : `Node ${process.version}`,
  });

  const claudeDir = join(homedir(), ".claude");
  if (existsSync(claudeDir)) {
    results.push({
      name: "Claude Code",
      ok: true,
      message: "~/.claude/ exists",
    });
  } else {
    results.push({
      name: "Claude Code",
      ok: false,
      message: "~/.claude/ not found - run Claude Code first",
    });
  }

  const settingsPath = join(claudeDir, "settings.json");
  if (existsSync(settingsPath)) {
    try {
      const content = await readFile(settingsPath, "utf-8");
      JSON.parse(content);
      results.push({
        name: "Settings",
        ok: true,
        message: "settings.json valid",
      });
    } catch {
      results.push({
        name: "Settings",
        ok: false,
        message: "settings.json is not valid JSON",
      });
    }
  } else {
    results.push({
      name: "Settings",
      ok: true,
      message: "settings.json will be created",
    });
  }

  const kabanInstalled = await checkKabanCli();
  results.push({
    name: "Kaban CLI",
    ok: kabanInstalled.ok,
    message: kabanInstalled.message,
  });

  const allOk = results.every((r) => r.ok);
  return { ok: allOk, results };
}

function formatCheckResults(results: CheckResult[]): string {
  const maxNameLen = Math.max(...results.map((r) => r.name.length));

  return results
    .map((r) => {
      const icon = r.ok ? chalk.green("\u2713") : chalk.red("\u2717");
      const name = r.name.padEnd(maxNameLen);
      const msg = r.ok ? chalk.dim(r.message) : chalk.red(r.message);
      return `  ${icon} ${name}  ${msg}`;
    })
    .join("\n");
}

async function installHook(
  spinner: ReturnType<typeof p.spinner>,
): Promise<{ hookInstalled: boolean; hookConfigured: boolean; backupPath?: string }> {
  spinner.message("Creating hooks directory...");

  if (!existsSync(HOOKS_DIR)) {
    await mkdir(HOOKS_DIR, { recursive: true });
  }

  spinner.message("Installing hook binary...");

  // Resolve symlinks to get actual package path (handles npm/brew global installs)
  const scriptPath = realpathSync(process.argv[1]);
  const scriptDir = dirname(scriptPath);
  const isDevMode = scriptPath.includes("/src/");
  const distDir = isDevMode ? join(scriptDir, "..", "dist") : scriptDir;
  const sourceBinary = join(distDir, HOOK_BINARY_NAME);
  const targetBinary = join(HOOKS_DIR, HOOK_BINARY_NAME);

  if (!existsSync(sourceBinary)) {
    throw new Error(`Binary not found at ${sourceBinary}. Run 'bun run build' first.`);
  }

  await copyFile(sourceBinary, targetBinary);
  await chmod(targetBinary, 0o755);

  spinner.message("Configuring Claude Code settings...");

  const settingsManager = new SettingsManager();
  const result = await settingsManager.addHook();

  const installResult: { hookInstalled: boolean; hookConfigured: boolean; backupPath?: string } = {
    hookInstalled: true,
    hookConfigured: result.added,
  };

  if (result.backupPath) {
    installResult.backupPath = result.backupPath;
  }

  return installResult;
}

async function uninstallHook(cleanLogs: boolean): Promise<{
  hookRemoved: boolean;
  binaryRemoved: boolean;
  logRemoved: boolean;
}> {
  const result = {
    hookRemoved: false,
    binaryRemoved: false,
    logRemoved: false,
  };

  const settingsManager = new SettingsManager();
  const hookResult = await settingsManager.removeHook();
  result.hookRemoved = hookResult.removed;

  const binaryPath = join(HOOKS_DIR, HOOK_BINARY_NAME);
  if (existsSync(binaryPath)) {
    await unlink(binaryPath);
    result.binaryRemoved = true;
  }

  const logPath = join(HOOKS_DIR, LOG_FILE);
  if (existsSync(logPath) && cleanLogs) {
    await unlink(logPath);
    result.logRemoved = true;
  }

  return result;
}

async function getRecentActivity(): Promise<{
  syncs: number;
  created: number;
  moved: number;
  errors: number;
  lastSync?: Date;
  logSize?: number;
} | null> {
  const logPath = join(HOOKS_DIR, LOG_FILE);

  if (!existsSync(logPath)) {
    return null;
  }

  try {
    const content = await readFile(logPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    const entries: LogEntry[] = lines.map((line) => JSON.parse(line) as LogEntry);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEntries = entries.filter((e) => new Date(e.timestamp) > oneDayAgo);

    const stats = recentEntries.reduce(
      (acc, e) => ({
        syncs: acc.syncs + 1,
        created: acc.created + e.created,
        moved: acc.moved + e.moved,
        errors: acc.errors + e.errors.length,
      }),
      { syncs: 0, created: 0, moved: 0, errors: 0 },
    );

    const lastEntry = entries.at(-1);
    const logStats = await stat(logPath);

    const result: {
      syncs: number;
      created: number;
      moved: number;
      errors: number;
      lastSync?: Date;
      logSize?: number;
    } = { ...stats };

    if (lastEntry) {
      result.lastSync = new Date(lastEntry.timestamp);
    }
    if (logStats.size > 0) {
      result.logSize = logStats.size;
    }

    return result;
  } catch {
    return null;
  }
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} KB`;
}

const installCommand = new Command("install")
  .description("Install TodoWrite sync hook for Claude Code")
  .option("-y, --yes", "Skip confirmation")
  .action(async (options) => {
    p.intro(chalk.bgCyan.black(" kaban hook install "));

    const s = p.spinner();

    s.start("Checking dependencies...");
    const { ok, results } = await checkDependencies();
    s.stop("Dependencies checked");

    p.note(formatCheckResults(results), "Environment");

    if (!ok) {
      p.cancel("Dependency check failed. Please fix the issues above.");
      process.exit(1);
    }

    if (!options.yes) {
      const proceed = await p.confirm({
        message: "Install TodoWrite-Kaban sync hook?",
        initialValue: true,
      });

      if (p.isCancel(proceed) || !proceed) {
        p.cancel("Installation cancelled.");
        process.exit(0);
      }
    }

    s.start("Installing...");

    try {
      const installResult = await installHook(s);
      s.stop("Installation complete");

      const summaryLines = [
        "",
        `  ${chalk.cyan("Hook Binary")}`,
        `    ${chalk.dim("Path:")} ~/.claude/hooks/${HOOK_BINARY_NAME}`,
        "",
        `  ${chalk.cyan("Hook Configuration")}`,
        `    ${chalk.dim("Event:")} PostToolUse`,
        `    ${chalk.dim("Matcher:")} TodoWrite`,
        `    ${chalk.dim("Timeout:")} 10s`,
        "",
      ];

      if (installResult.backupPath) {
        summaryLines.push(`  ${chalk.cyan("Backup")}`);
        summaryLines.push(`    ${chalk.dim(installResult.backupPath)}`);
        summaryLines.push("");
      }

      if (!installResult.hookConfigured) {
        summaryLines.push(`  ${chalk.yellow("\u26a0")} Hook was already configured`);
        summaryLines.push("");
      }

      p.note(summaryLines.join("\n"), "Installation Summary");
      p.log.success("TodoWrite changes will now auto-sync to Kaban board!");

      p.note(
        [
          `  ${chalk.cyan("Verify:")}  kaban hook status`,
          `  ${chalk.cyan("Logs:")}    ~/.claude/hooks/sync.log`,
          `  ${chalk.cyan("Remove:")}  kaban hook uninstall`,
        ].join("\n"),
        "Next Steps",
      );

      p.outro(chalk.green("Done!"));
    } catch (error) {
      s.stop("Installation failed");
      p.cancel(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

const uninstallCommand = new Command("uninstall")
  .description("Remove TodoWrite sync hook")
  .option("-y, --yes", "Skip confirmation")
  .option("--clean", "Also remove sync logs")
  .action(async (options) => {
    p.intro(chalk.bgRed.white(" kaban hook uninstall "));

    const binaryExists = existsSync(join(HOOKS_DIR, HOOK_BINARY_NAME));
    const logExists = existsSync(join(HOOKS_DIR, LOG_FILE));

    const settingsManager = new SettingsManager();
    let hookExists = false;
    try {
      const settings = await settingsManager.read();
      hookExists = settingsManager.hasHook(settings);
    } catch {
      hookExists = false;
    }

    if (!binaryExists && !hookExists) {
      p.log.warn("TodoWrite-Kaban sync hook is not installed.");
      p.outro("Nothing to uninstall.");
      process.exit(0);
    }

    const formatStatusLine = (exists: boolean, label: string): string => {
      const icon = exists ? chalk.green("\u2713") : chalk.dim("\u25cb");
      const text = exists ? "" : chalk.dim(" (not found)");
      return `  ${icon} ${label}${text}`;
    };

    const formatLogStatus = (): string => {
      if (!logExists) return formatStatusLine(false, "Sync log");
      const suffix = options.clean
        ? chalk.yellow(" (will be removed)")
        : chalk.dim(" (will be preserved)");
      return `  ${chalk.yellow("\u25cb")} Sync log${suffix}`;
    };

    const statusLines = [
      formatStatusLine(binaryExists, "Hook binary"),
      formatStatusLine(hookExists, "Settings configuration"),
      formatLogStatus(),
    ];

    p.note(statusLines.join("\n"), "Current Installation");

    if (!options.yes) {
      const confirmed = await p.confirm({
        message: "Remove TodoWrite-Kaban sync?",
        initialValue: false,
      });

      if (p.isCancel(confirmed) || !confirmed) {
        p.cancel("Uninstallation cancelled.");
        process.exit(0);
      }
    }

    const s = p.spinner();
    s.start("Removing...");

    try {
      const result = await uninstallHook(options.clean);
      s.stop("Removal complete");

      const summaryLines: string[] = [];
      if (result.hookRemoved)
        summaryLines.push(`  ${chalk.green("\u2713")} Removed hook from settings.json`);
      if (result.binaryRemoved)
        summaryLines.push(`  ${chalk.green("\u2713")} Removed ${HOOK_BINARY_NAME}`);
      if (result.logRemoved) summaryLines.push(`  ${chalk.green("\u2713")} Removed ${LOG_FILE}`);
      if (logExists && !options.clean)
        summaryLines.push(
          `  ${chalk.yellow("\u25cb")} Preserved ${LOG_FILE} (use --clean to remove)`,
        );

      if (summaryLines.length > 0) {
        p.note(summaryLines.join("\n"), "Removed");
      }

      p.outro(chalk.green("Done!"));
    } catch (error) {
      s.stop("Removal failed");
      p.cancel(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

const statusCommand = new Command("status")
  .description("Check hook installation status")
  .action(async () => {
    p.intro(chalk.bgBlue.white(" kaban hook status "));

    const s = p.spinner();
    s.start("Checking status...");

    const binaryPath = join(HOOKS_DIR, HOOK_BINARY_NAME);
    const binaryExists = existsSync(binaryPath);

    const settingsManager = new SettingsManager();
    let hookConfigured = false;
    try {
      const settings = await settingsManager.read();
      hookConfigured = settingsManager.hasHook(settings);
    } catch {
      hookConfigured = false;
    }

    const kabanCheck = await checkKabanCli();
    const activity = await getRecentActivity();

    s.stop("Status checked");

    const results = [
      {
        name: "Hook Binary",
        ok: binaryExists,
        detail: binaryExists ? binaryPath : "Not found",
      },
      {
        name: "Settings Config",
        ok: hookConfigured,
        detail: hookConfigured ? "PostToolUse[TodoWrite] active" : "Hook not configured",
      },
      {
        name: "Kaban CLI",
        ok: kabanCheck.ok,
        detail: kabanCheck.ok ? kabanCheck.message : "Not found in PATH",
      },
    ];

    const maxNameLen = Math.max(...results.map((r) => r.name.length));
    const statusLines = results.map((r) => {
      const icon = r.ok ? chalk.green("\u2713") : chalk.red("\u2717");
      const name = r.name.padEnd(maxNameLen);
      const detail = r.ok ? chalk.dim(r.detail) : chalk.red(r.detail);
      return `  ${icon} ${name}  ${detail}`;
    });

    p.note(statusLines.join("\n"), "Installation Status");

    if (activity) {
      const activityLines = [
        `  ${chalk.cyan("Syncs (24h):")}     ${activity.syncs}`,
        `  ${chalk.cyan("Tasks created:")}  ${activity.created}`,
        `  ${chalk.cyan("Tasks moved:")}    ${activity.moved}`,
        `  ${chalk.cyan("Errors:")}         ${activity.errors > 0 ? chalk.red(activity.errors.toString()) : chalk.green("0")}`,
        "",
        activity.lastSync
          ? `  ${chalk.dim("Last sync:")}      ${formatTimeAgo(activity.lastSync)}`
          : "",
        activity.logSize ? `  ${chalk.dim("Log size:")}       ${formatSize(activity.logSize)}` : "",
      ].filter(Boolean);

      p.note(activityLines.join("\n"), "Recent Activity");
    } else {
      p.log.info("No sync activity logged yet.");
    }

    const allOk = results.every((r) => r.ok);

    if (allOk) {
      p.outro(chalk.green("All systems operational!"));
    } else {
      p.outro(chalk.yellow("Some checks failed. Run 'kaban hook install' to fix."));
      process.exit(1);
    }
  });

export const hookCommand = new Command("hook")
  .description("Manage TodoWrite sync hook for Claude Code")
  .addCommand(installCommand)
  .addCommand(uninstallCommand)
  .addCommand(statusCommand);
