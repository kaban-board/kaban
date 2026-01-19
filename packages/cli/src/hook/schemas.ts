import { z } from "zod";

export const TodoStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"]);
export const TodoPrioritySchema = z.enum(["high", "medium", "low"]);

export const TodoItemSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1).max(500),
  status: TodoStatusSchema,
  priority: TodoPrioritySchema,
});

export const TodoWriteInputSchema = z.object({
  todos: z.array(TodoItemSchema),
});

export type TodoStatus = z.infer<typeof TodoStatusSchema>;
export type TodoPriority = z.infer<typeof TodoPrioritySchema>;
export type TodoItem = z.infer<typeof TodoItemSchema>;
export type TodoWriteInput = z.infer<typeof TodoWriteInputSchema>;

export const HookInputSchema = z.object({
  session_id: z.string(),
  transcript_path: z.string(),
  cwd: z.string(),
  permission_mode: z.string(),
  hook_event_name: z.literal("PostToolUse"),
  tool_name: z.string(),
  tool_input: z.unknown(),
  tool_response: z.unknown().optional(),
  tool_use_id: z.string(),
});

export const TodoWriteHookInputSchema = HookInputSchema.extend({
  tool_name: z.literal("TodoWrite"),
  tool_input: TodoWriteInputSchema,
});

export type HookInput = z.infer<typeof HookInputSchema>;
export type TodoWriteHookInput = z.infer<typeof TodoWriteHookInputSchema>;

const HookCommandSchema = z.object({
  type: z.literal("command"),
  command: z.string(),
  timeout: z.number().optional(),
});

const HookEntrySchema = z.object({
  matcher: z.string(),
  hooks: z.array(HookCommandSchema),
  description: z.string().optional(),
});

const HooksConfigSchema = z.object({
  PostToolUse: z.array(HookEntrySchema).optional(),
  PreToolUse: z.array(HookEntrySchema).optional(),
  Notification: z.array(HookEntrySchema).optional(),
  Stop: z.array(HookEntrySchema).optional(),
});

export const ClaudeSettingsSchema = z
  .object({
    hooks: HooksConfigSchema.optional(),
  })
  .passthrough();

export type HookCommand = z.infer<typeof HookCommandSchema>;
export type HookEntry = z.infer<typeof HookEntrySchema>;
export type HooksConfig = z.infer<typeof HooksConfigSchema>;
export type ClaudeSettings = z.infer<typeof ClaudeSettingsSchema>;

export const TODOWRITE_HOOK_ENTRY: HookEntry = {
  matcher: "TodoWrite",
  hooks: [
    {
      type: "command",
      command: "~/.claude/hooks/kaban-hook",
      timeout: 10,
    },
  ],
  description: "Auto-sync TodoWrite changes to Kaban board",
};

export const SyncConfigSchema = z.object({
  conflictStrategy: z
    .enum(["todowrite_wins", "status_priority", "kaban_wins"])
    .default("status_priority"),
  deletionPolicy: z.enum(["preserve", "archive", "delete"]).default("preserve"),
  cancelledPolicy: z.enum(["skip", "backlog"]).default("skip"),
  syncCooldownMs: z.number().min(0).max(5000).default(200),
  maxTitleLength: z.number().min(50).max(1000).default(200),
  logEnabled: z.boolean().default(true),
  logPath: z.string().default("~/.claude/hooks/sync.log"),
});

export type SyncConfig = z.infer<typeof SyncConfigSchema>;

export const DEFAULT_CONFIG: SyncConfig = {
  conflictStrategy: "status_priority",
  deletionPolicy: "preserve",
  cancelledPolicy: "skip",
  syncCooldownMs: 200,
  maxTitleLength: 200,
  logEnabled: true,
  logPath: "~/.claude/hooks/sync.log",
};
