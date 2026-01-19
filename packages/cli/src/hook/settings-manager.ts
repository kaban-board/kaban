import { existsSync } from "node:fs";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  type ClaudeSettings,
  ClaudeSettingsSchema,
  type HookEntry,
  TODOWRITE_HOOK_ENTRY,
} from "./schemas.js";

const SETTINGS_PATH = join(homedir(), ".claude", "settings.json");

export class SettingsManager {
  private settingsPath: string;

  constructor(settingsPath: string = SETTINGS_PATH) {
    this.settingsPath = settingsPath;
  }

  async read(): Promise<ClaudeSettings> {
    if (!existsSync(this.settingsPath)) {
      return {};
    }

    const content = await readFile(this.settingsPath, "utf-8");
    const parsed = JSON.parse(content);
    return ClaudeSettingsSchema.parse(parsed);
  }

  async write(settings: ClaudeSettings): Promise<void> {
    const content = JSON.stringify(settings, null, 2);
    await writeFile(this.settingsPath, `${content}\n`);
  }

  async backup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupPath = `${this.settingsPath}.backup-${timestamp}`;
    await copyFile(this.settingsPath, backupPath);
    return backupPath;
  }

  async addHook(): Promise<{ added: boolean; backupPath?: string | undefined }> {
    const settings = await this.read();

    if (this.hasHook(settings)) {
      return { added: false };
    }

    let backupPath: string | undefined;
    if (existsSync(this.settingsPath)) {
      backupPath = await this.backup();
    }

    if (!settings.hooks) {
      settings.hooks = {};
    }
    if (!settings.hooks.PostToolUse) {
      settings.hooks.PostToolUse = [];
    }

    settings.hooks.PostToolUse.push(TODOWRITE_HOOK_ENTRY);
    await this.write(settings);

    return { added: true, backupPath };
  }

  async removeHook(): Promise<{ removed: boolean }> {
    const settings = await this.read();

    if (!this.hasHook(settings)) {
      return { removed: false };
    }

    const hooks = settings.hooks;
    if (hooks?.PostToolUse) {
      hooks.PostToolUse = hooks.PostToolUse.filter((hook) => !this.isTodoWriteHook(hook));

      if (hooks.PostToolUse.length === 0) {
        delete hooks.PostToolUse;
      }
      if (Object.keys(hooks).length === 0) {
        delete settings.hooks;
      }
    }

    await this.write(settings);
    return { removed: true };
  }

  hasHook(settings: ClaudeSettings): boolean {
    const postToolUseHooks = settings.hooks?.PostToolUse;
    if (!postToolUseHooks) return false;
    return postToolUseHooks.some((hook) => this.isTodoWriteHook(hook));
  }

  private isTodoWriteHook(hook: HookEntry): boolean {
    return hook.matcher === "TodoWrite" && hook.hooks.some((h) => h.command.includes("kaban-hook"));
  }
}
