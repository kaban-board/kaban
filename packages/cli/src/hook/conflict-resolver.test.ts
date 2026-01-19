import { describe, expect, test } from "bun:test";
import { ConflictResolver } from "./conflict-resolver";
import type { TodoItem } from "./schemas";
import type { KabanTask } from "./types";

function createTodo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: "todo-1",
    content: "Test task",
    status: "pending",
    priority: "high",
    ...overrides,
  };
}

function createKabanTask(overrides: Partial<KabanTask> = {}): KabanTask {
  return {
    id: "kaban-1",
    title: "Test task",
    columnId: "todo",
    ...overrides,
  };
}

describe("ConflictResolver with status_priority strategy", () => {
  const resolver = new ConflictResolver("status_priority");

  test("todo wins when todo status has higher priority", () => {
    const todo = createTodo({ status: "in_progress" });
    const kaban = createKabanTask({ columnId: "todo" });

    const result = resolver.resolve(todo, kaban);

    expect(result.winner).toBe("todo");
    expect(result.targetColumn).toBe("in_progress");
  });

  test("kaban wins when kaban status has higher priority", () => {
    const todo = createTodo({ status: "pending" });
    const kaban = createKabanTask({ columnId: "in_progress" });

    const result = resolver.resolve(todo, kaban);

    expect(result.winner).toBe("kaban");
    expect(result.targetColumn).toBe("in_progress");
  });

  test("completed status always wins (terminal state)", () => {
    const todo = createTodo({ status: "completed" });
    const kaban = createKabanTask({ columnId: "in_progress" });

    const result = resolver.resolve(todo, kaban);

    expect(result.winner).toBe("todo");
    expect(result.targetColumn).toBe("done");
  });

  test("kaban done column is preserved (terminal state)", () => {
    const todo = createTodo({ status: "in_progress" });
    const kaban = createKabanTask({ columnId: "done" });

    const result = resolver.resolve(todo, kaban);

    expect(result.winner).toBe("kaban");
    expect(result.targetColumn).toBe("done");
  });

  test("todo wins on equal priority (most recent)", () => {
    const todo = createTodo({ status: "pending" });
    const kaban = createKabanTask({ columnId: "todo" });

    const result = resolver.resolve(todo, kaban);

    expect(result.winner).toBe("todo");
    expect(result.targetColumn).toBe("todo");
  });
});

describe("ConflictResolver with todowrite_wins strategy", () => {
  const resolver = new ConflictResolver("todowrite_wins");

  test("todo always wins regardless of kaban state", () => {
    const todo = createTodo({ status: "pending" });
    const kaban = createKabanTask({ columnId: "in_progress" });

    const result = resolver.resolve(todo, kaban);

    expect(result.winner).toBe("todo");
    expect(result.targetColumn).toBe("todo");
  });
});

describe("ConflictResolver with kaban_wins strategy", () => {
  const resolver = new ConflictResolver("kaban_wins");

  test("kaban always wins regardless of todo state", () => {
    const todo = createTodo({ status: "completed" });
    const kaban = createKabanTask({ columnId: "todo" });

    const result = resolver.resolve(todo, kaban);

    expect(result.winner).toBe("kaban");
    expect(result.targetColumn).toBe("todo");
  });
});

describe("ConflictResolver shouldSync", () => {
  const resolver = new ConflictResolver("status_priority");

  test("returns true for pending status", () => {
    const todo = createTodo({ status: "pending" });
    expect(resolver.shouldSync(todo, "skip")).toBe(true);
  });

  test("returns true for in_progress status", () => {
    const todo = createTodo({ status: "in_progress" });
    expect(resolver.shouldSync(todo, "skip")).toBe(true);
  });

  test("returns true for completed status", () => {
    const todo = createTodo({ status: "completed" });
    expect(resolver.shouldSync(todo, "skip")).toBe(true);
  });

  test("returns false for cancelled with skip policy", () => {
    const todo = createTodo({ status: "cancelled" });
    expect(resolver.shouldSync(todo, "skip")).toBe(false);
  });

  test("returns true for cancelled with backlog policy", () => {
    const todo = createTodo({ status: "cancelled" });
    expect(resolver.shouldSync(todo, "backlog")).toBe(true);
  });
});

describe("ConflictResolver column to status mapping", () => {
  const resolver = new ConflictResolver("status_priority");

  test("maps backlog column to pending", () => {
    const todo = createTodo({ status: "in_progress" });
    const kaban = createKabanTask({ columnId: "backlog" });
    const result = resolver.resolve(todo, kaban);
    expect(result.winner).toBe("todo");
  });

  test("maps review column to in_progress", () => {
    const todo = createTodo({ status: "pending" });
    const kaban = createKabanTask({ columnId: "review" });
    const result = resolver.resolve(todo, kaban);
    expect(result.winner).toBe("kaban");
  });

  test("handles unknown column as pending", () => {
    const todo = createTodo({ status: "in_progress" });
    const kaban = createKabanTask({ columnId: "unknown_column" });
    const result = resolver.resolve(todo, kaban);
    expect(result.winner).toBe("todo");
  });
});
