import type { TodoStatus } from "./schemas.js";

export const STATUS_PRIORITY: Record<TodoStatus, number> = {
  completed: 3,
  in_progress: 2,
  pending: 1,
  cancelled: 0,
};

export const STATUS_TO_COLUMN: Record<TodoStatus, string> = {
  pending: "todo",
  in_progress: "in_progress",
  completed: "done",
  cancelled: "backlog",
};

export const COLUMN_TO_STATUS: Record<string, TodoStatus> = {
  backlog: "pending",
  todo: "pending",
  in_progress: "in_progress",
  review: "in_progress",
  done: "completed",
};

export const HOOK_NAME = "kaban-hook";
export const HOOK_PATH = "~/.claude/hooks/kaban-hook";
export const LOG_PATH = "~/.claude/hooks/sync.log";
