import { COLUMN_TO_STATUS, STATUS_PRIORITY, STATUS_TO_COLUMN } from "./constants.js";
import type { SyncConfig, TodoItem, TodoStatus } from "./schemas.js";
import type { KabanTask } from "./types.js";

export type ConflictWinner = "todo" | "kaban";

export interface ResolveResult {
  winner: ConflictWinner;
  targetColumn: string;
  reason: string;
}

export class ConflictResolver {
  constructor(private strategy: SyncConfig["conflictStrategy"]) {}

  resolve(todo: TodoItem, kabanTask: KabanTask): ResolveResult {
    const kabanStatus = this.columnToStatus(kabanTask.columnId);
    const todoColumn = STATUS_TO_COLUMN[todo.status];

    if (this.strategy === "todowrite_wins") {
      return {
        winner: "todo",
        targetColumn: todoColumn,
        reason: "todowrite_wins strategy",
      };
    }

    if (this.strategy === "kaban_wins") {
      return {
        winner: "kaban",
        targetColumn: kabanTask.columnId,
        reason: "kaban_wins strategy",
      };
    }

    if (todo.status === "completed") {
      return {
        winner: "todo",
        targetColumn: "done",
        reason: "completed status always wins (terminal state)",
      };
    }

    if (kabanTask.columnId === "done") {
      return {
        winner: "kaban",
        targetColumn: "done",
        reason: "kaban task already completed (terminal state)",
      };
    }

    const todoPriority = STATUS_PRIORITY[todo.status];
    const kabanPriority = STATUS_PRIORITY[kabanStatus];

    if (todoPriority > kabanPriority) {
      return {
        winner: "todo",
        targetColumn: todoColumn,
        reason: `todo status priority (${todoPriority}) > kaban (${kabanPriority})`,
      };
    }

    if (kabanPriority > todoPriority) {
      return {
        winner: "kaban",
        targetColumn: kabanTask.columnId,
        reason: `kaban status priority (${kabanPriority}) > todo (${todoPriority})`,
      };
    }

    return {
      winner: "todo",
      targetColumn: todoColumn,
      reason: "equal priority, todo wins (most recent)",
    };
  }

  shouldSync(todo: TodoItem, cancelledPolicy: SyncConfig["cancelledPolicy"]): boolean {
    if (todo.status === "cancelled") {
      return cancelledPolicy === "backlog";
    }
    return true;
  }

  private columnToStatus(columnId: string): TodoStatus {
    return COLUMN_TO_STATUS[columnId] ?? "pending";
  }
}
