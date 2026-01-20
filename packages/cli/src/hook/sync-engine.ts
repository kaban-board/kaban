import { ConflictResolver } from "./conflict-resolver.js";
import { STATUS_TO_COLUMN } from "./constants.js";
import { KabanClient } from "./kaban-client.js";
import type { SyncConfig, TodoItem } from "./schemas.js";
import type { KabanTask, SyncResult } from "./types.js";

export class SyncEngine {
  private kaban: KabanClient;
  private resolver: ConflictResolver;
  private config: SyncConfig;

  constructor(cwd: string, config: SyncConfig) {
    this.kaban = new KabanClient(cwd);
    this.resolver = new ConflictResolver(config.conflictStrategy);
    this.config = config;
  }

  async sync(todos: TodoItem[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      created: 0,
      moved: 0,
      skipped: 0,
      errors: [],
    };

    if (!(await this.kaban.boardExists())) {
      result.skipped = todos.length;
      return result;
    }

    if (todos.length === 0) {
      return result;
    }

    const kabanTasks = await this.kaban.listTasks();
    const tasksByTitle = new Map(kabanTasks.map((t) => [t.title, t]));
    const tasksById = new Map(kabanTasks.map((t) => [t.id, t]));

    for (const todo of todos) {
      if (!this.resolver.shouldSync(todo, this.config.cancelledPolicy)) {
        result.skipped++;
        continue;
      }

      try {
        const syncResult = await this.syncTodo(todo, tasksByTitle, tasksById);
        if (syncResult === "created") result.created++;
        else if (syncResult === "moved") result.moved++;
        else result.skipped++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`${this.truncateTitle(todo.content)}: ${errorMsg}`);
        result.success = false;
      }
    }

    return result;
  }

  private async syncTodo(
    todo: TodoItem,
    tasksByTitle: Map<string, KabanTask>,
    tasksById: Map<string, KabanTask>,
  ): Promise<"created" | "moved" | "skipped"> {
    const normalizedTitle = this.truncateTitle(todo.content);
    const existing =
      tasksById.get(todo.id) ?? tasksByTitle.get(normalizedTitle) ?? tasksByTitle.get(todo.content);

    if (existing) {
      return this.handleExisting(todo, existing);
    }
    return this.handleNew(todo);
  }

  private async handleExisting(todo: TodoItem, existing: KabanTask): Promise<"moved" | "skipped"> {
    const resolution = this.resolver.resolve(todo, existing);

    if (resolution.winner === "kaban" || existing.columnId === resolution.targetColumn) {
      return "skipped";
    }

    if (resolution.targetColumn === "done") {
      const success = await this.kaban.completeTask(existing.id);
      if (!success) throw new Error("failed to complete task");
    } else {
      const success = await this.kaban.moveTask(existing.id, resolution.targetColumn);
      if (!success) throw new Error(`failed to move task to ${resolution.targetColumn}`);
    }

    return "moved";
  }

  private async handleNew(todo: TodoItem): Promise<"created"> {
    const column = todo.status === "cancelled" ? "backlog" : STATUS_TO_COLUMN[todo.status];

    const title = this.truncateTitle(todo.content);
    const taskId = await this.kaban.addTask(title, column);

    if (!taskId) {
      throw new Error("failed to create task");
    }

    return "created";
  }

  private truncateTitle(title: string): string {
    if (title.length <= this.config.maxTitleLength) return title;
    return `${title.slice(0, this.config.maxTitleLength - 3)}...`;
  }
}
