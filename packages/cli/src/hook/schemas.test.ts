import { describe, expect, test } from "bun:test";
import {
  HookInputSchema,
  TodoItemSchema,
  TodoWriteHookInputSchema,
  TodoWriteInputSchema,
} from "./schemas";

describe("TodoItemSchema", () => {
  test("validates valid todo item", () => {
    const item = {
      id: "todo-1",
      content: "Test task",
      status: "pending",
      priority: "high",
    };
    expect(TodoItemSchema.safeParse(item).success).toBe(true);
  });

  test("validates all status values", () => {
    const statuses = ["pending", "in_progress", "completed", "cancelled"];
    for (const status of statuses) {
      const item = { id: "1", content: "Test", status, priority: "high" };
      expect(TodoItemSchema.safeParse(item).success).toBe(true);
    }
  });

  test("validates all priority values", () => {
    const priorities = ["high", "medium", "low"];
    for (const priority of priorities) {
      const item = { id: "1", content: "Test", status: "pending", priority };
      expect(TodoItemSchema.safeParse(item).success).toBe(true);
    }
  });

  test("rejects empty id", () => {
    const item = { id: "", content: "Test", status: "pending", priority: "high" };
    expect(TodoItemSchema.safeParse(item).success).toBe(false);
  });

  test("rejects empty content", () => {
    const item = { id: "1", content: "", status: "pending", priority: "high" };
    expect(TodoItemSchema.safeParse(item).success).toBe(false);
  });

  test("rejects invalid status", () => {
    const item = { id: "1", content: "Test", status: "invalid", priority: "high" };
    expect(TodoItemSchema.safeParse(item).success).toBe(false);
  });

  test("rejects invalid priority", () => {
    const item = { id: "1", content: "Test", status: "pending", priority: "invalid" };
    expect(TodoItemSchema.safeParse(item).success).toBe(false);
  });

  test("rejects content over 500 chars", () => {
    const item = { id: "1", content: "x".repeat(501), status: "pending", priority: "high" };
    expect(TodoItemSchema.safeParse(item).success).toBe(false);
  });
});

describe("TodoWriteInputSchema", () => {
  test("validates valid input with todos array", () => {
    const input = {
      todos: [
        { id: "1", content: "Task 1", status: "pending", priority: "high" },
        { id: "2", content: "Task 2", status: "completed", priority: "low" },
      ],
    };
    expect(TodoWriteInputSchema.safeParse(input).success).toBe(true);
  });

  test("validates empty todos array", () => {
    const input = { todos: [] };
    expect(TodoWriteInputSchema.safeParse(input).success).toBe(true);
  });

  test("rejects missing todos field", () => {
    const input = {};
    expect(TodoWriteInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("HookInputSchema", () => {
  test("validates valid hook input", () => {
    const input = {
      session_id: "sess-123",
      transcript_path: "/path/to/transcript",
      cwd: "/working/dir",
      permission_mode: "default",
      hook_event_name: "PostToolUse",
      tool_name: "TodoWrite",
      tool_input: { todos: [] },
      tool_use_id: "use-456",
    };
    expect(HookInputSchema.safeParse(input).success).toBe(true);
  });

  test("rejects non-PostToolUse event", () => {
    const input = {
      session_id: "sess-123",
      transcript_path: "/path",
      cwd: "/dir",
      permission_mode: "default",
      hook_event_name: "PreToolUse",
      tool_name: "TodoWrite",
      tool_input: {},
      tool_use_id: "use-456",
    };
    expect(HookInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("TodoWriteHookInputSchema", () => {
  test("validates complete TodoWrite hook input", () => {
    const input = {
      session_id: "sess-123",
      transcript_path: "/path/to/transcript",
      cwd: "/working/dir",
      permission_mode: "default",
      hook_event_name: "PostToolUse",
      tool_name: "TodoWrite",
      tool_input: {
        todos: [{ id: "1", content: "Test", status: "pending", priority: "high" }],
      },
      tool_use_id: "use-456",
    };
    const result = TodoWriteHookInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  test("rejects non-TodoWrite tool", () => {
    const input = {
      session_id: "sess-123",
      transcript_path: "/path",
      cwd: "/dir",
      permission_mode: "default",
      hook_event_name: "PostToolUse",
      tool_name: "OtherTool",
      tool_input: { todos: [] },
      tool_use_id: "use-456",
    };
    expect(TodoWriteHookInputSchema.safeParse(input).success).toBe(false);
  });

  test("rejects invalid todo in tool_input", () => {
    const input = {
      session_id: "sess-123",
      transcript_path: "/path",
      cwd: "/dir",
      permission_mode: "default",
      hook_event_name: "PostToolUse",
      tool_name: "TodoWrite",
      tool_input: {
        todos: [{ id: "", content: "", status: "invalid", priority: "wrong" }],
      },
      tool_use_id: "use-456",
    };
    expect(TodoWriteHookInputSchema.safeParse(input).success).toBe(false);
  });
});
