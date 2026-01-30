import { describe, expect, test } from "bun:test";
import { withErrorHandling } from "../error.js";
import type { AppState } from "../types.js";

function createMockState(): AppState {
  return {
    renderer: {} as AppState["renderer"],
    db: {} as AppState["db"],
    taskService: {} as AppState["taskService"],
    boardService: {} as AppState["boardService"],
    boardName: "Test Board",
    projectRoot: "/tmp/test",
    columns: [],
    columnPanels: [],
    taskSelects: new Map(),
    currentColumnIndex: 0,
    selectedTask: null,
    mainContainer: null,
    activeModal: "none",
    modalOverlay: null,
    taskInput: null,
    buttonRow: null,
    onModalConfirm: null,
    viewTaskState: null,
    editTaskState: null,
    viewTaskRuntime: null,
    editTaskRuntime: null,
    archiveViewMode: false,
  };
}

describe("withErrorHandling", () => {
  test("returns result on success", async () => {
    const state = createMockState();
    const result = await withErrorHandling(
      state,
      async () => "success",
      "Test operation",
    );
    expect(result).toBe("success");
  });

  test("returns null on error", async () => {
    const state = createMockState();
    const result = await withErrorHandling(
      state,
      async () => {
        throw new Error("Test error");
      },
      "Test operation",
    );
    expect(result).toBeNull();
  });

  test("handles non-Error thrown values", async () => {
    const state = createMockState();
    const result = await withErrorHandling(
      state,
      async () => {
        throw "string error";
      },
      "Test operation",
    );
    expect(result).toBeNull();
  });

  test("returns complex objects on success", async () => {
    const state = createMockState();
    const expected = { id: "123", title: "Test" };
    const result = await withErrorHandling(
      state,
      async () => expected,
      "Test operation",
    );
    expect(result).toEqual(expected);
  });

  test("returns arrays on success", async () => {
    const state = createMockState();
    const expected = [1, 2, 3];
    const result = await withErrorHandling(
      state,
      async () => expected,
      "Test operation",
    );
    expect(result).toEqual(expected);
  });
});
