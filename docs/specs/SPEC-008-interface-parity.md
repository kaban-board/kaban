# SPEC-008: Interface Parity (CLI / MCP / TUI)

**Status**: Draft  
**Priority**: P1 (High)  
**Complexity**: Medium  
**Estimated effort**: 3 hours  
**Reviewed**: 2026-01-29 (Expert Panel)

---

## 1. Overview

### Problem

CLI, MCP и TUI предоставляют разные наборы действий. Это нарушает принцип SSOT — пользователь должен иметь доступ к одинаковым возможностям независимо от интерфейса.

### Current State

```
╔═══════════════════════╦═════╦═════╦═════╗
║ Action                ║ MCP ║ CLI ║ TUI ║
╠═══════════════════════╬═════╬═════╬═════╣
║ View task             ║  ✅  ║  ❌  ║  ✅  ║
║ Edit task             ║  ✅  ║  ❌  ║  ✅  ║
║ Delete task           ║  ✅  ║  ❌  ║  ✅  ║
║ Complete task         ║  ✅  ║  ✅  ║  ❌  ║
║ Assign task           ║  ⚠️  ║  ✅  ║  ✅  ║
║ Get next task         ║  ✅  ║  ❌  ║  ❌  ║
║ Archive stats         ║  ✅  ║  ❌  ║  ❌  ║
║ Search archive        ║  ✅  ║  ✅  ║  ❌  ║
║ Purge archive         ║  ✅  ║  ✅  ║  ❌  ║
╚═══════════════════════╩═════╩═════╩═════╝

⚠️ = Available via kaban_update_task, but no dedicated tool
```

### Goal

Все интерфейсы предоставляют одинаковый набор действий.

### Non-Goals

- Изменение core services
- Добавление новой бизнес-логики
- Dependency/Link management в TUI (слишком сложно для TUI)

---

## 2. Prerequisites

### 2.1 Use `resolveTask()` Consistently

**CRITICAL**: All CLI commands MUST use `taskService.resolveTask()` instead of manual ID lookup.

```typescript
// ✅ CORRECT - Use resolveTask()
const task = await taskService.resolveTask(id);

// ❌ WRONG - Manual lookup (inefficient, doesn't support board-scoped IDs)
const tasks = await taskService.listTasks();
const task = tasks.find((t) => t.id.startsWith(id));
```

**Why**: `resolveTask()` (task.ts:727) supports:
- Full ULID: `01JJXABC123DEF`
- Partial ULID: `01JJX` (min 4 chars)
- Board-scoped ID: `#12` or `12`

**Pre-implementation task**: Fix existing commands (`done.ts`, `assign.ts`, `move.ts`) to use `resolveTask()`.

### 2.2 Verify Context Exports

The `next` command requires `db` from context. Verify `getContext()` exports it:

```typescript
// packages/cli/src/lib/context.ts
export async function getContext() {
  // ... must return { taskService, boardService, db, ... }
}
```

If `db` is not exported, either:
1. Export `db` from context
2. Export pre-configured `ScoringService` instance
3. Add `getNextTask()` method to `TaskService`

### 2.3 Error Codes Convention

| Code | Meaning | Usage |
|------|---------|-------|
| 1 | Configuration/system error | Missing terminal column, DB error |
| 2 | Not found | Task not found |
| 4 | Invalid argument | Missing required param, invalid combination |

---

## 3. CLI: Missing Commands

### 3.1 `kaban get <id>`

**Purpose**: Просмотр одной задачи по ID.

```bash
kaban get 01JJX        # Partial ID
kaban get 12           # Board-scoped ID (#12)
kaban get --json 01JJX # JSON output
```

**Implementation**:

```typescript
// packages/cli/src/commands/get.ts
import { KabanError } from "@kaban-board/core";
import { Command } from "commander";
import { getContext } from "../lib/context.js";
import { outputError, outputSuccess } from "../lib/json-output.js";

export const getCommand = new Command("get")
  .description("View a task by ID")
  .argument("<id>", "Task ID (ULID, partial, or #number)")
  .option("-j, --json", "Output as JSON")
  .action(async (id, options) => {
    const json = options.json;
    try {
      const { taskService } = await getContext();
      const task = await taskService.resolveTask(id);

      if (!task) {
        if (json) outputError(2, `Task '${id}' not found`);
        console.error(`Error: Task '${id}' not found`);
        process.exit(2);
      }

      if (json) {
        outputSuccess(task);
        return;
      }

      console.log(`\n  [${task.id.slice(0, 8)}] ${task.title}`);
      console.log(`  Column: ${task.columnId}`);
      if (task.description) console.log(`  Description: ${task.description}`);
      if (task.assignedTo) console.log(`  Assigned: ${task.assignedTo}`);
      if (task.labels.length) console.log(`  Labels: ${task.labels.join(", ")}`);
      if (task.dueDate) console.log(`  Due: ${task.dueDate.toISOString().split("T")[0]}`);
      if (task.dependsOn.length) console.log(`  Depends on: ${task.dependsOn.length} task(s)`);
      console.log(`  Created: ${task.createdAt.toISOString()}`);
      console.log();
    } catch (error) {
      if (error instanceof KabanError) {
        if (json) outputError(error.code, error.message);
        console.error(`Error: ${error.message}`);
        process.exit(error.code);
      }
      throw error;
    }
  });
```

---

### 3.2 `kaban edit <id>`

**Purpose**: Редактирование задачи из командной строки.

```bash
kaban edit 01JJX --title "New title"
kaban edit 01JJX --description "Updated desc"
kaban edit 01JJX --labels bug,urgent
kaban edit 01JJX --due "next friday"
kaban edit 01JJX --clear-description   # Set to null
```

**Implementation**:

```typescript
// packages/cli/src/commands/edit.ts
import { KabanError } from "@kaban-board/core";
import { Command } from "commander";
import { getContext } from "../lib/context.js";
import { outputError, outputSuccess } from "../lib/json-output.js";

export const editCommand = new Command("edit")
  .description("Edit a task")
  .argument("<id>", "Task ID")
  .option("-t, --title <title>", "New title")
  .option("-d, --description <desc>", "New description")
  .option("--clear-description", "Clear description")
  .option("-l, --labels <labels>", "Labels (comma-separated)")
  .option("--due <date>", "Due date (natural language)")
  .option("--clear-due", "Clear due date")
  .option("-j, --json", "Output as JSON")
  .action(async (id, options) => {
    const json = options.json;
    try {
      const { taskService } = await getContext();
      const task = await taskService.resolveTask(id);

      if (!task) {
        if (json) outputError(2, `Task '${id}' not found`);
        console.error(`Error: Task '${id}' not found`);
        process.exit(2);
      }

      const updates: Record<string, unknown> = {};
      if (options.title) updates.title = options.title;
      if (options.description) updates.description = options.description;
      if (options.clearDescription) updates.description = null;
      if (options.labels) updates.labels = options.labels.split(",").map((l: string) => l.trim());
      if (options.due) updates.dueDate = options.due;
      if (options.clearDue) updates.dueDate = null;

      if (Object.keys(updates).length === 0) {
        if (json) outputError(4, "No updates specified");
        console.error("Error: No updates specified. Use --title, --description, etc.");
        process.exit(4);
      }

      const updated = await taskService.updateTask(task.id, updates);

      if (json) {
        outputSuccess(updated);
        return;
      }

      console.log(`Updated [${updated.id.slice(0, 8)}] "${updated.title}"`);
    } catch (error) {
      if (error instanceof KabanError) {
        if (json) outputError(error.code, error.message);
        console.error(`Error: ${error.message}`);
        process.exit(error.code);
      }
      throw error;
    }
  });
```

---

### 3.3 `kaban delete <id>`

**Purpose**: Удаление задачи.

```bash
kaban delete 01JJX
kaban delete 01JJX --force   # Skip confirmation
```

**Implementation**:

```typescript
// packages/cli/src/commands/delete.ts
import { KabanError } from "@kaban-board/core";
import { Command } from "commander";
import { createInterface } from "readline";
import { getContext } from "../lib/context.js";
import { outputError, outputSuccess } from "../lib/json-output.js";

export const deleteCommand = new Command("delete")
  .description("Delete a task")
  .argument("<id>", "Task ID")
  .option("-f, --force", "Skip confirmation")
  .option("-j, --json", "Output as JSON")
  .action(async (id, options) => {
    const json = options.json;
    try {
      const { taskService } = await getContext();
      const task = await taskService.resolveTask(id);

      if (!task) {
        if (json) outputError(2, `Task '${id}' not found`);
        console.error(`Error: Task '${id}' not found`);
        process.exit(2);
      }

      if (!options.force && !json) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>((resolve) => {
          rl.question(`Delete "${task.title}"? [y/N] `, resolve);
        });
        rl.close();
        if (answer.toLowerCase() !== "y") {
          console.log("Cancelled");
          return;
        }
      }

      await taskService.deleteTask(task.id);

      if (json) {
        outputSuccess({ deleted: true, id: task.id });
        return;
      }

      console.log(`Deleted [${task.id.slice(0, 8)}] "${task.title}"`);
    } catch (error) {
      if (error instanceof KabanError) {
        if (json) outputError(error.code, error.message);
        console.error(`Error: ${error.message}`);
        process.exit(error.code);
      }
      throw error;
    }
  });
```

---

### 3.4 `kaban next`

**Purpose**: Получить следующую приоритетную задачу для работы.

```bash
kaban next              # From todo column
kaban next --column backlog
kaban next --json
```

**Implementation**:

```typescript
// packages/cli/src/commands/next.ts
import {
  KabanError,
  ScoringService,
  fifoScorer,
  priorityScorer,
  dueDateScorer,
  createBlockingScorer,
  LinkService,
} from "@kaban-board/core";
import { Command } from "commander";
import { getContext } from "../lib/context.js";
import { outputError, outputSuccess } from "../lib/json-output.js";

export const nextCommand = new Command("next")
  .description("Get the next highest-priority task")
  .option("-c, --column <column>", "Column to pick from", "todo")
  .option("-j, --json", "Output as JSON")
  .action(async (options) => {
    const json = options.json;
    try {
      const { taskService, db } = await getContext();
      const linkService = new LinkService(db);

      const scoringService = new ScoringService();
      scoringService.addScorer(priorityScorer);
      scoringService.addScorer(dueDateScorer);
      scoringService.addScorer(createBlockingScorer(async (taskId) => {
        const blocking = await linkService.getBlocking(taskId);
        return blocking.length;
      }));
      scoringService.addScorer(fifoScorer);

      const tasks = await taskService.listTasks({ columnId: options.column });
      const unblocked = tasks.filter((t) => !t.blockedReason && t.dependsOn.length === 0);

      if (unblocked.length === 0) {
        if (json) {
          outputSuccess({ task: null, message: "No actionable tasks" });
          return;
        }
        console.log("No actionable tasks in", options.column);
        return;
      }

      const ranked = await scoringService.rankTasks(unblocked);
      const next = ranked[0];

      if (json) {
        outputSuccess(next);
        return;
      }

      console.log(`\n  Next: [${next.task.id.slice(0, 8)}] "${next.task.title}"`);
      console.log(`  Score: ${next.score} (${Object.entries(next.breakdown).map(([k, v]) => `${k}:${v}`).join(", ")})`);
      if (next.task.dueDate) console.log(`  Due: ${next.task.dueDate.toISOString().split("T")[0]}`);
      console.log();
    } catch (error) {
      if (error instanceof KabanError) {
        if (json) outputError(error.code, error.message);
        console.error(`Error: ${error.message}`);
        process.exit(error.code);
      }
      throw error;
    }
  });
```

---

### 3.5 `kaban stats`

**Purpose**: Статистика архива и доски.

```bash
kaban stats
kaban stats --json
```

**Implementation**:

```typescript
// packages/cli/src/commands/stats.ts
import { KabanError } from "@kaban-board/core";
import { Command } from "commander";
import { getContext } from "../lib/context.js";
import { outputError, outputSuccess } from "../lib/json-output.js";

export const statsCommand = new Command("stats")
  .description("Show board and archive statistics")
  .option("-j, --json", "Output as JSON")
  .action(async (options) => {
    const json = options.json;
    try {
      const { taskService, boardService } = await getContext();

      const tasks = await taskService.listTasks();
      const columns = await boardService.getColumns();
      const terminalColumns = columns.filter((c) => c.isTerminal);
      const archivedResult = await taskService.searchArchive("", { limit: 1 });

      const completedNotArchived = tasks.filter((t) =>
        terminalColumns.some((c) => c.id === t.columnId)
      ).length;

      const blocked = tasks.filter((t) => t.blockedReason).length;
      const withDeps = tasks.filter((t) => t.dependsOn.length > 0).length;

      const stats = {
        activeTasks: tasks.length,
        archivedTasks: archivedResult.total,
        completedNotArchived,
        blockedTasks: blocked,
        tasksWithDependencies: withDeps,
        byColumn: columns.map((c) => ({
          id: c.id,
          name: c.name,
          count: tasks.filter((t) => t.columnId === c.id).length,
        })),
      };

      if (json) {
        outputSuccess(stats);
        return;
      }

      console.log("\n  Board Statistics\n");
      console.log(`  Active tasks:      ${stats.activeTasks}`);
      console.log(`  Archived tasks:    ${stats.archivedTasks}`);
      console.log(`  Completed (live):  ${stats.completedNotArchived}`);
      console.log(`  Blocked:           ${stats.blockedTasks}`);
      console.log(`  With dependencies: ${stats.tasksWithDependencies}`);
      console.log("\n  By Column:");
      for (const col of stats.byColumn) {
        console.log(`    ${col.name}: ${col.count}`);
      }
      console.log();
    } catch (error) {
      if (error instanceof KabanError) {
        if (json) outputError(error.code, error.message);
        console.error(`Error: ${error.message}`);
        process.exit(error.code);
      }
      throw error;
    }
  });
```

---

## 4. MCP: Missing Tool

### 4.1 `kaban_assign_task` (Optional Convenience Wrapper)

**Note**: `kaban_update_task` already supports `assignedTo` field. This tool is a **convenience wrapper** for semantic clarity when used by AI agents.

**Purpose**: Назначение/снятие исполнителя задачи.

**Tool Definition**:

```typescript
{
  name: "kaban_assign_task",
  description: "Assign or unassign a task to/from an agent (convenience wrapper for kaban_update_task)",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Task ID (ULID)" },
      taskId: { type: "string", description: "Task ID - alias for 'id'" },
      assignee: { type: ["string", "null"], description: "Agent name (null to unassign)" },
    },
  },
}
```

**Handler**:

```typescript
case "kaban_assign_task": {
  // Convenience wrapper - delegates to updateTask
  const id = getParam(taskArgs, "id", "taskId");
  if (!id) return errorResponse("Task ID required (use 'id' or 'taskId')");
  const { assignee } = (args ?? {}) as { assignee?: string | null };
  const task = await taskService.updateTask(id, { assignedTo: assignee ?? null });
  return jsonResponse(task);
}
```

---

## 5. TUI: Missing Actions

### 5.1 Complete Task (Done) — Key: `C` (Shift+C)

**Note**: Key `c` is used for "copy ID" in viewTask modal. Using `C` (Shift+C) to avoid conflict.

**Behavior**: Перемещает выбранную задачу в terminal column (instant, no modal).

**Keybinding** (`lib/keybindings.ts`):

```typescript
// In modalBindings.none:
C: async (state) => {
  if (state.archiveViewMode) return;
  const taskId = getSelectedTaskId(state);
  if (!taskId) return;
  const terminal = await state.boardService.getTerminalColumn();
  if (!terminal) return;
  await state.taskService.moveTask(taskId, terminal.id);
  await refreshBoard(state);
},
```

---

### 5.2 Search Archive — Key: `/` in archive view

**Behavior**: Открывает input modal для поиска в архиве.

**New Modal** (`components/modals/search-archive.ts`):

```typescript
import { InputRenderable, InputRenderableEvents, TextRenderable } from "@opentui/core";
import { COLORS } from "../../lib/theme.js";
import type { AppState } from "../../lib/types.js";
import type { Task } from "@kaban-board/core";
import { createModalOverlay } from "../overlay.js";
import { closeModal } from "./shared.js";

export async function showSearchArchiveModal(
  state: AppState,
  onResults: (tasks: Task[]) => Promise<void>
): Promise<void> {
  const { renderer } = state;
  const { overlay, dialog } = createModalOverlay(renderer, {
    id: "search-archive-dialog",
    width: 50,
    height: 8,
  });

  const title = new TextRenderable(renderer, {
    id: "search-title",
    content: " Search Archive ",
    fg: COLORS.accent,
  });
  title.setPosition(2, 0);
  dialog.add(title);

  const input = new InputRenderable(renderer, {
    id: "search-input",
    width: 46,
    placeholder: "Enter search query...",
  });
  input.setPosition(2, 2);
  dialog.add(input);

  const hint = new TextRenderable(renderer, {
    id: "search-hint",
    content: "[Enter] Search  [Esc] Cancel",
    fg: COLORS.textMuted,
  });
  hint.setPosition(2, 5);
  dialog.add(hint);

  renderer.root.add(overlay);
  state.modalOverlay = overlay;
  state.activeModal = "searchArchive";
  state.taskInput = input;

  setImmediate(() => input.focus());

  input.on(InputRenderableEvents.ENTER, async () => {
    const query = input.getValue().trim();
    if (!query) return;
    const result = await state.taskService.searchArchive(query, { limit: 50 });
    closeModal(state);
    await onResults(result.tasks);
  });
}
```

**Keybinding**:

```typescript
// In modalBindings.none:
"/": (state) => {
  if (state.archiveViewMode) {
    return showSearchArchiveModal(state, async (tasks) => {
      // TODO: Display results - options:
      // 1. Show in temporary list modal
      // 2. Filter current archive view
      // 3. Open viewTask for first result
      console.log(`Found ${tasks.length} tasks`);
    });
  }
},
```

**Additional keybindings for searchArchive modal**:

```typescript
// In modalBindings:
searchArchive: {
  escape: closeModal,
  // Enter is handled by input event listener
},
```

---

### 5.3 Purge Archive — Key: `P` (Shift+P) in archive view

**Behavior**: Confirmation modal для очистки всего архива.

**Implementation** (`components/modals/purge-archive.ts`):

```typescript
import { BoxRenderable, TextRenderable } from "@opentui/core";
import { COLORS } from "../../lib/theme.js";
import type { AppState } from "../../lib/types.js";
import { createModalOverlay } from "../overlay.js";
import { closeModal } from "./shared.js";

export async function showPurgeArchiveModal(
  state: AppState,
  onPurged: () => Promise<void>
): Promise<void> {
  const { renderer, taskService } = state;

  // Get count first
  const result = await taskService.searchArchive("", { limit: 1 });
  const count = result.total;

  if (count === 0) {
    // No archived tasks - nothing to purge
    return;
  }

  const { overlay, dialog } = createModalOverlay(renderer, {
    id: "purge-archive-dialog",
    width: 50,
    height: 7,
    borderColor: COLORS.danger,
  });

  const title = new TextRenderable(renderer, {
    id: "purge-title",
    content: " Purge Archive ",
    fg: COLORS.danger,
  });
  title.setPosition(2, 0);
  dialog.add(title);

  const message = new TextRenderable(renderer, {
    id: "purge-message",
    content: `Permanently delete ${count} archived task(s)?`,
  });
  message.setPosition(2, 2);
  dialog.add(message);

  const hint = new TextRenderable(renderer, {
    id: "purge-hint",
    content: "[y] Yes, purge  [n/Esc] Cancel",
    fg: COLORS.textMuted,
  });
  hint.setPosition(2, 4);
  dialog.add(hint);

  renderer.root.add(overlay);
  state.modalOverlay = overlay;
  state.activeModal = "purgeArchive";

  state.onModalConfirm = async () => {
    await taskService.purgeArchive();
    closeModal(state);
    await onPurged();
  };
}
```

**Keybindings**:

```typescript
// In modalBindings.none:
P: (state) => {
  if (state.archiveViewMode) {
    return showPurgeArchiveModal(state, () => refreshBoard(state));
  }
},

// In modalBindings:
purgeArchive: {
  y: confirmModal,
  n: closeModal,
  escape: closeModal,
},
```

---

## 6. Type Updates

### 6.1 ModalType (`lib/types.ts`)

```typescript
export type ModalType =
  | "none"
  | "addTask"
  | "moveTask"
  | "assignTask"
  | "deleteTask"
  | "archiveTask"
  | "restoreTask"
  | "viewTask"
  | "editTask"
  | "help"
  | "quit"
  | "searchArchive"  // NEW
  | "purgeArchive";  // NEW
```

---

## 7. Registration

### 7.1 CLI Registration (`packages/cli/src/index.ts`)

```typescript
import { getCommand } from "./commands/get.js";
import { editCommand } from "./commands/edit.js";
import { deleteCommand } from "./commands/delete.js";
import { nextCommand } from "./commands/next.js";
import { statsCommand } from "./commands/stats.js";

// Add commands
program.addCommand(getCommand);
program.addCommand(editCommand);
program.addCommand(deleteCommand);
program.addCommand(nextCommand);
program.addCommand(statsCommand);
```

### 7.2 MCP Registration (`packages/cli/src/commands/mcp.ts`)

1. Add tool definition to `ListToolsRequestSchema` handler (in tools array)
2. Add case to `CallToolRequestSchema` switch block

### 7.3 TUI Registration

1. Update `ModalType` in `lib/types.ts`
2. Add keybindings to `lib/keybindings.ts`:
   - `C` in `modalBindings.none` for complete
   - `/` in `modalBindings.none` for search (archive view only)
   - `P` in `modalBindings.none` for purge (archive view only)
   - `searchArchive` and `purgeArchive` modal keybindings
3. Create modal files in `components/modals/`
4. Export from `components/modals/index.ts`
5. Update help modal with new keys:
   - `C` = Complete (mark done)
   - `/` = Search archive (in archive view)
   - `P` = Purge archive (in archive view)

---

## 8. Updated Matrix

После реализации:

```
╔═══════════════════════╦═════╦═════╦═════╗
║ Action                ║ MCP ║ CLI ║ TUI ║
╠═══════════════════════╬═════╬═════╬═════╣
║ View task             ║  ✅  ║  ✅  ║  ✅  ║
║ Edit task             ║  ✅  ║  ✅  ║  ✅  ║
║ Delete task           ║  ✅  ║  ✅  ║  ✅  ║
║ Complete task         ║  ✅  ║  ✅  ║  ✅  ║
║ Assign task           ║  ✅  ║  ✅  ║  ✅  ║
║ Get next task         ║  ✅  ║  ✅  ║  ❌* ║
║ Archive stats         ║  ✅  ║  ✅  ║  ❌* ║
║ Search archive        ║  ✅  ║  ✅  ║  ✅  ║
║ Purge archive         ║  ✅  ║  ✅  ║  ✅  ║
╚═══════════════════════╩═════╩═════╩═════╝

* TUI intentionally omits scoring/stats — not suitable for visual interface
```

---

## 9. Testing

### 9.1 CLI Tests (Given/When/Then)

```typescript
describe("get command", () => {
  test("shows task details by partial ID", async () => {
    // Given: A task exists with ID "01JJXABC123DEF"
    const task = await taskService.addTask({ title: "Test task" });
    
    // When: I run "kaban get 01JJX"
    const result = await runCommand(["get", task.id.slice(0, 5)]);
    
    // Then: I see the task title and metadata
    expect(result.stdout).toContain("Test task");
    expect(result.exitCode).toBe(0);
  });

  test("shows task details by board-scoped ID", async () => {
    // Given: Task #1 exists on the board
    const task = await taskService.addTask({ title: "Board task" });
    
    // When: I run "kaban get #1" or "kaban get 1"
    const result = await runCommand(["get", "#1"]);
    
    // Then: I see task #1 details
    expect(result.stdout).toContain("Board task");
  });

  test("returns JSON with --json flag", async () => {
    // Given: A task exists
    const task = await taskService.addTask({ title: "JSON task" });
    
    // When: I run "kaban get --json <id>"
    const result = await runCommand(["get", "--json", task.id]);
    
    // Then: Output is valid JSON with task data
    const json = JSON.parse(result.stdout);
    expect(json.success).toBe(true);
    expect(json.data.title).toBe("JSON task");
  });

  test("errors on not found with exit code 2", async () => {
    // When: I run "kaban get NONEXISTENT"
    const result = await runCommand(["get", "NONEXISTENT"]);
    
    // Then: I see error and exit code is 2
    expect(result.stderr).toContain("not found");
    expect(result.exitCode).toBe(2);
  });
});

describe("edit command", () => {
  test("updates task title", async () => {
    // Given: A task exists
    const task = await taskService.addTask({ title: "Old title" });
    
    // When: I run "kaban edit <id> --title 'New title'"
    await runCommand(["edit", task.id, "--title", "New title"]);
    
    // Then: Task title is updated
    const updated = await taskService.getTask(task.id);
    expect(updated?.title).toBe("New title");
  });

  test("clears description with --clear-description", async () => {
    // Given: A task with description
    const task = await taskService.addTask({ title: "Task", description: "Some desc" });
    
    // When: I run "kaban edit <id> --clear-description"
    await runCommand(["edit", task.id, "--clear-description"]);
    
    // Then: Description is null
    const updated = await taskService.getTask(task.id);
    expect(updated?.description).toBeNull();
  });

  test("errors when no updates specified", async () => {
    // Given: A task exists
    const task = await taskService.addTask({ title: "Task" });
    
    // When: I run "kaban edit <id>" without options
    const result = await runCommand(["edit", task.id]);
    
    // Then: Error with exit code 4
    expect(result.stderr).toContain("No updates specified");
    expect(result.exitCode).toBe(4);
  });
});

describe("delete command", () => {
  test("deletes task with --force", async () => {
    // Given: A task exists
    const task = await taskService.addTask({ title: "To delete" });
    
    // When: I run "kaban delete <id> --force"
    await runCommand(["delete", task.id, "--force"]);
    
    // Then: Task is deleted
    const deleted = await taskService.getTask(task.id);
    expect(deleted).toBeNull();
  });
});
```

### 9.2 MCP Tests

```typescript
describe("kaban_assign_task", () => {
  test("assigns task to agent", async () => {
    // Given: A task exists
    const task = await taskService.addTask({ title: "Task" });
    
    // When: I call kaban_assign_task with assignee
    const result = await mcpCall("kaban_assign_task", { id: task.id, assignee: "claude" });
    
    // Then: Task is assigned
    expect(result.assignedTo).toBe("claude");
  });

  test("unassigns with null", async () => {
    // Given: A task assigned to agent
    const task = await taskService.addTask({ title: "Task", assignedTo: "agent" });
    
    // When: I call kaban_assign_task with null assignee
    const result = await mcpCall("kaban_assign_task", { id: task.id, assignee: null });
    
    // Then: Task is unassigned
    expect(result.assignedTo).toBeNull();
  });

  test("errors without task ID", async () => {
    // When: I call without ID
    const result = await mcpCall("kaban_assign_task", { assignee: "claude" });
    
    // Then: Error response
    expect(result.error).toContain("Task ID required");
  });
});
```

---

## 10. Implementation Order

| # | Item | Effort | Notes |
|---|------|--------|-------|
| 0 | Fix existing commands to use `resolveTask()` | 10 min | Pre-req: done.ts, assign.ts, move.ts |
| 1 | Verify `getContext()` exports `db` | 5 min | Pre-req for next command |
| 2 | CLI: `get`, `edit`, `delete` | 30 min | Core CRUD |
| 3 | CLI: `next`, `stats` | 20 min | Depends on #1 |
| 4 | MCP: `kaban_assign_task` | 10 min | Optional convenience |
| 5 | TUI: Update ModalType | 2 min | Type-level change |
| 6 | TUI: Complete task `[C]` | 10 min | Instant action |
| 7 | TUI: Search archive `[/]` | 45 min | Input modal |
| 8 | TUI: Purge archive `[P]` | 15 min | Confirmation modal |
| 9 | Update help modal | 5 min | Document new keys |
| 10 | Write tests | 30 min | CLI + MCP |

**Total: ~3 hours**

---

## 11. Changelog

- **2026-01-29**: Expert panel review
  - Changed TUI complete key from `c` to `C` (Shift+C) to avoid conflict with copy
  - Added prerequisite section for `resolveTask()` usage
  - Noted `kaban_assign_task` as optional convenience wrapper
  - Added error codes convention
  - Added Given/When/Then test scenarios
  - Reduced estimated effort from 4h to 3h
