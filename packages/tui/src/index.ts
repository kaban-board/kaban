#!/usr/bin/env bun
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BoardService,
  type Config,
  createDb,
  DEFAULT_CONFIG,
  initializeSchema,
  type Task,
  TaskService,
} from "@kaban/core";
import {
  BoxRenderable,
  type CliRenderer,
  createCliRenderer,
  InputRenderable,
  InputRenderableEvents,
  SelectRenderable,
  SelectRenderableEvents,
  TextRenderable,
} from "@opentui/core";

const COLORS = {
  bg: "#0d1117",
  panel: "#161b22",
  border: "#30363d",
  borderActive: "#58a6ff",
  text: "#e6edf3",
  textMuted: "#8b949e",
  textDim: "#484f58",
  accent: "#58a6ff",
  danger: "#f85149",
};

function findKabanRoot(startDir: string): string | null {
  let dir = startDir;
  while (dir !== "/") {
    if (existsSync(resolve(dir, ".kaban"))) {
      return dir;
    }
    dir = resolve(dir, "..");
  }
  return null;
}

function getKabanPaths(root: string) {
  const kabanDir = resolve(root, ".kaban");
  return {
    kabanDir,
    dbPath: resolve(kabanDir, "kaban.db"),
    configPath: resolve(kabanDir, "config.json"),
  };
}

async function initializeProject(root: string, boardName: string) {
  const { kabanDir, dbPath, configPath } = getKabanPaths(root);
  mkdirSync(kabanDir, { recursive: true });

  const config: Config = {
    ...DEFAULT_CONFIG,
    board: { name: boardName },
  };
  writeFileSync(configPath, JSON.stringify(config, null, 2));

  const db = createDb(`file:${dbPath}`);
  await initializeSchema(db);
  const boardService = new BoardService(db);
  await boardService.initializeBoard(config);

  return { db, boardService };
}

async function showOnboarding(renderer: CliRenderer): Promise<string> {
  return new Promise((resolvePromise) => {
    const container = new BoxRenderable(renderer, {
      id: "onboarding",
      width: "100%",
      height: "100%",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.bg,
    });

    const card = new BoxRenderable(renderer, {
      id: "card",
      width: 50,
      height: 12,
      flexDirection: "column",
      border: true,
      borderStyle: "double",
      borderColor: COLORS.accent,
      backgroundColor: COLORS.panel,
      padding: 2,
    });

    const title = new TextRenderable(renderer, {
      id: "title",
      content: "📋 Welcome to Kaban",
      fg: COLORS.accent,
    });

    const subtitle = new TextRenderable(renderer, {
      id: "subtitle",
      content: "No board found. Let's create one!",
      fg: COLORS.textMuted,
    });

    const spacer1 = new BoxRenderable(renderer, { id: "spacer1", width: "100%", height: 1 });

    const label = new TextRenderable(renderer, {
      id: "label",
      content: "Board name:",
      fg: COLORS.text,
    });

    const input = new InputRenderable(renderer, {
      id: "board-name-input",
      width: 44,
      height: 1,
      placeholder: "My Project Board",
      textColor: COLORS.text,
      placeholderColor: COLORS.textDim,
      backgroundColor: COLORS.bg,
      focusedBackgroundColor: COLORS.bg,
      cursorColor: COLORS.accent,
    });

    const spacer2 = new BoxRenderable(renderer, { id: "spacer2", width: "100%", height: 1 });

    const hint = new TextRenderable(renderer, {
      id: "hint",
      content: "[Enter] Create  [Esc] Quit",
      fg: COLORS.textDim,
    });

    card.add(title);
    card.add(subtitle);
    card.add(spacer1);
    card.add(label);
    card.add(input);
    card.add(spacer2);
    card.add(hint);
    container.add(card);
    renderer.root.add(container);

    input.focus();

    input.on(InputRenderableEvents.ENTER, () => {
      const boardName = input.value.trim() || "Kaban Board";
      container.destroy();
      resolvePromise(boardName);
    });

    const keyHandler = (key: { name: string }) => {
      if (key.name === "escape") {
        renderer.keyInput.off("keypress", keyHandler);
        renderer.destroy();
        process.exit(0);
      }
    };
    renderer.keyInput.on("keypress", keyHandler);
  });
}

type ModalType = "none" | "addTask" | "help" | "quit";

interface AppState {
  renderer: CliRenderer;
  taskService: TaskService;
  boardService: BoardService;
  boardName: string;
  columns: { id: string; name: string }[];
  columnPanels: BoxRenderable[];
  currentColumnIndex: number;
  mainContainer: BoxRenderable | null;
  activeModal: ModalType;
  modalOverlay: BoxRenderable | null;
  taskInput: InputRenderable | null;
}

async function refreshBoard(state: AppState) {
  const { renderer, taskService, boardService } = state;

  if (state.mainContainer) {
    state.mainContainer.destroy();
  }

  state.columns = await boardService.getColumns();
  const tasks = await taskService.listTasks();

  const mainContainer = new BoxRenderable(renderer, {
    id: "main",
    width: "100%",
    height: "100%",
    flexDirection: "column",
    backgroundColor: COLORS.bg,
  });
  state.mainContainer = mainContainer;

  const header = new BoxRenderable(renderer, {
    id: "header",
    width: "100%",
    height: 3,
    backgroundColor: COLORS.panel,
    border: true,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  });

  const headerText = new TextRenderable(renderer, {
    id: "header-text",
    content: `📋 ${state.boardName}`,
    fg: COLORS.accent,
  });
  header.add(headerText);
  mainContainer.add(header);

  const columnsContainer = new BoxRenderable(renderer, {
    id: "columns-container",
    flexDirection: "row",
    width: "100%",
    flexGrow: 1,
    gap: 1,
    padding: 1,
  });

  state.columnPanels = [];

  for (let i = 0; i < state.columns.length; i++) {
    const column = state.columns[i];
    const columnTasks = tasks.filter((t) => t.columnId === column.id);
    const isSelected = i === state.currentColumnIndex;

    const columnPanel = new BoxRenderable(renderer, {
      id: `column-${column.id}`,
      flexGrow: 1,
      flexDirection: "column",
      border: true,
      borderStyle: isSelected ? "double" : "single",
      borderColor: isSelected ? COLORS.borderActive : COLORS.border,
      backgroundColor: COLORS.panel,
      title: `${column.name} (${columnTasks.length})`,
      titleAlignment: "center",
      padding: 1,
    });

    if (columnTasks.length > 0) {
      const taskSelect = new SelectRenderable(renderer, {
        id: `tasks-${column.id}`,
        width: "100%",
        height: Math.min(columnTasks.length + 2, 20),
        backgroundColor: COLORS.panel,
        textColor: COLORS.text,
        options: columnTasks.map((task) => ({
          name: truncate(task.title, 30),
          description: task.createdBy,
          value: task.id,
        })),
        selectedBackgroundColor: COLORS.bg,
        selectedTextColor: COLORS.accent,
        descriptionColor: COLORS.textMuted,
      });

      taskSelect.on(SelectRenderableEvents.ITEM_SELECTED, () => {});

      if (isSelected) {
        taskSelect.focus();
      }

      columnPanel.add(taskSelect);
    } else {
      const emptyText = new TextRenderable(renderer, {
        id: `empty-${column.id}`,
        content: "(empty)",
        fg: COLORS.textDim,
      });
      columnPanel.add(emptyText);
    }

    state.columnPanels.push(columnPanel);
    columnsContainer.add(columnPanel);
  }

  mainContainer.add(columnsContainer);

  const footer = new BoxRenderable(renderer, {
    id: "footer",
    width: "100%",
    height: 3,
    backgroundColor: COLORS.panel,
    border: true,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  });

  const footerText = new TextRenderable(renderer, {
    id: "footer-text",
    content: "←→ Column  ↑↓ Task  [a]dd  [?] Help  [q]uit",
    fg: COLORS.textMuted,
  });
  footer.add(footerText);
  mainContainer.add(footer);

  renderer.root.add(mainContainer);
}

function showAddTaskModal(state: AppState) {
  const { renderer, columns, currentColumnIndex } = state;
  const column = columns[currentColumnIndex];

  const overlay = new BoxRenderable(renderer, {
    id: "modal-overlay",
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
  });

  const dialog = new BoxRenderable(renderer, {
    id: "add-task-dialog",
    width: 50,
    height: 9,
    flexDirection: "column",
    border: true,
    borderStyle: "double",
    borderColor: COLORS.accent,
    backgroundColor: COLORS.panel,
    padding: 1,
  });

  const title = new TextRenderable(renderer, {
    id: "dialog-title",
    content: `Add task to "${column.name}"`,
    fg: COLORS.accent,
  });

  const spacer1 = new BoxRenderable(renderer, { id: "dialog-spacer1", width: "100%", height: 1 });

  const input = new InputRenderable(renderer, {
    id: "task-title-input",
    width: 46,
    height: 1,
    placeholder: "Task title...",
    textColor: COLORS.text,
    placeholderColor: COLORS.textDim,
    backgroundColor: COLORS.bg,
    focusedBackgroundColor: COLORS.bg,
    cursorColor: COLORS.accent,
  });

  const spacer2 = new BoxRenderable(renderer, { id: "dialog-spacer2", width: "100%", height: 1 });

  const hint = new TextRenderable(renderer, {
    id: "dialog-hint",
    content: "[Enter] Create  [Esc] Cancel",
    fg: COLORS.textDim,
  });

  dialog.add(title);
  dialog.add(spacer1);
  dialog.add(input);
  dialog.add(spacer2);
  dialog.add(hint);
  overlay.add(dialog);
  renderer.root.add(overlay);

  input.focus();

  state.modalOverlay = overlay;
  state.taskInput = input;
  state.activeModal = "addTask";

  input.on(InputRenderableEvents.ENTER, async () => {
    const taskTitle = input.value.trim();
    if (taskTitle) {
      await state.taskService.addTask({ title: taskTitle, columnId: column.id });
    }
    closeModal(state);
    await refreshBoard(state);
  });
}

function showHelpModal(state: AppState) {
  const { renderer } = state;

  const overlay = new BoxRenderable(renderer, {
    id: "modal-overlay",
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
  });

  const dialog = new BoxRenderable(renderer, {
    id: "help-dialog",
    width: 45,
    height: 14,
    flexDirection: "column",
    border: true,
    borderStyle: "double",
    borderColor: COLORS.accent,
    backgroundColor: COLORS.panel,
    padding: 2,
  });

  const title = new TextRenderable(renderer, {
    id: "help-title",
    content: "⌨️  Keyboard Shortcuts",
    fg: COLORS.accent,
  });

  const spacer = new BoxRenderable(renderer, { id: "help-spacer", width: "100%", height: 1 });

  const keys = [
    ["←/→ h/l", "Switch column"],
    ["↑/↓ j/k", "Navigate tasks"],
    ["a", "Add new task"],
    ["Enter", "Select task"],
    ["?", "Show/hide help"],
    ["q", "Quit"],
  ];

  dialog.add(title);
  dialog.add(spacer);

  for (const [key, desc] of keys) {
    const row = new BoxRenderable(renderer, {
      id: `help-row-${key}`,
      width: "100%",
      height: 1,
      flexDirection: "row",
    });
    const keyText = new TextRenderable(renderer, {
      id: `help-key-${key}`,
      content: key.padEnd(12),
      fg: COLORS.accent,
    });
    const descText = new TextRenderable(renderer, {
      id: `help-desc-${key}`,
      content: desc,
      fg: COLORS.text,
    });
    row.add(keyText);
    row.add(descText);
    dialog.add(row);
  }

  const hint = new TextRenderable(renderer, {
    id: "help-hint",
    content: "\n[Esc] or any key to close",
    fg: COLORS.textDim,
  });
  dialog.add(hint);

  overlay.add(dialog);
  renderer.root.add(overlay);

  state.modalOverlay = overlay;
  state.activeModal = "help";
}

function showQuitModal(state: AppState) {
  const { renderer } = state;

  const overlay = new BoxRenderable(renderer, {
    id: "modal-overlay",
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
  });

  const dialog = new BoxRenderable(renderer, {
    id: "quit-dialog",
    width: 30,
    height: 7,
    flexDirection: "column",
    border: true,
    borderStyle: "double",
    borderColor: COLORS.danger,
    backgroundColor: COLORS.panel,
    padding: 1,
    justifyContent: "center",
    alignItems: "center",
  });

  const title = new TextRenderable(renderer, {
    id: "quit-title",
    content: "Quit Kaban?",
    fg: COLORS.danger,
  });

  const spacer = new BoxRenderable(renderer, { id: "quit-spacer", width: "100%", height: 1 });

  const hint = new TextRenderable(renderer, {
    id: "quit-hint",
    content: "[y] Yes  [n/Esc] No",
    fg: COLORS.textMuted,
  });

  dialog.add(title);
  dialog.add(spacer);
  dialog.add(hint);
  overlay.add(dialog);
  renderer.root.add(overlay);

  state.modalOverlay = overlay;
  state.activeModal = "quit";
}

function closeModal(state: AppState) {
  if (state.modalOverlay) {
    state.modalOverlay.destroy();
    state.modalOverlay = null;
  }
  state.taskInput = null;
  state.activeModal = "none";
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

async function main() {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
  });

  let projectRoot = findKabanRoot(process.cwd());
  let db: ReturnType<typeof createDb>;
  let boardService: BoardService;
  let taskService: TaskService;

  if (!projectRoot) {
    const boardName = await showOnboarding(renderer);
    projectRoot = process.cwd();

    const result = await initializeProject(projectRoot, boardName);
    db = result.db;
    boardService = result.boardService;
    taskService = new TaskService(db, boardService);
  } else {
    const { dbPath } = getKabanPaths(projectRoot);
    db = createDb(`file:${dbPath}`);
    boardService = new BoardService(db);
    taskService = new TaskService(db, boardService);
  }

  const board = await boardService.getBoard();
  if (!board) {
    console.error("Error: No board found.");
    renderer.destroy();
    process.exit(1);
  }

  const state: AppState = {
    renderer,
    taskService,
    boardService,
    boardName: board.name,
    columns: [],
    columnPanels: [],
    currentColumnIndex: 0,
    mainContainer: null,
    activeModal: "none",
    modalOverlay: null,
    taskInput: null,
  };

  await refreshBoard(state);

  renderer.keyInput.on("keypress", async (key: { name: string; shift: boolean }) => {
    if (state.activeModal === "addTask") {
      if (key.name === "escape") {
        closeModal(state);
      }
      return;
    }

    if (state.activeModal === "help") {
      closeModal(state);
      return;
    }

    if (state.activeModal === "quit") {
      if (key.name === "y") {
        renderer.destroy();
        process.exit(0);
      } else if (key.name === "n" || key.name === "escape") {
        closeModal(state);
      }
      return;
    }

    if (key.name === "q") {
      showQuitModal(state);
      return;
    }

    if (key.name === "escape") {
      showQuitModal(state);
      return;
    }

    if (key.name === "left" || key.name === "h") {
      state.currentColumnIndex = Math.max(0, state.currentColumnIndex - 1);
      await refreshBoard(state);
      return;
    }

    if (key.name === "right" || key.name === "l") {
      state.currentColumnIndex = Math.min(state.columns.length - 1, state.currentColumnIndex + 1);
      await refreshBoard(state);
      return;
    }

    if (key.name === "a") {
      showAddTaskModal(state);
      return;
    }

    if (key.name === "?" || (key.shift && key.name === "/")) {
      showHelpModal(state);
      return;
    }
  });
}

main().catch((err) => {
  console.error("TUI Error:", err);
  process.exit(1);
});
