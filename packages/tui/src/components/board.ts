import { BoxRenderable, fg, SelectRenderable, TextRenderable, t } from "@opentui/core";
import { COLORS, LOGO } from "../lib/theme.js";
import type { AppState } from "../lib/types.js";
import { truncate } from "../lib/utils.js";

export async function refreshBoard(state: AppState): Promise<void> {
  const { renderer, taskService, boardService } = state;

  if (state.mainContainer) {
    state.mainContainer.destroy();
  }

  state.columns = await boardService.getColumns();
  state.taskSelects = new Map();
  const tasks = state.archiveViewMode
    ? (await taskService.listTasks({ includeArchived: true })).filter((t) => t.archived)
    : await taskService.listTasks();

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

  const modeIndicator = state.archiveViewMode ? " [ARCHIVE]" : "";
  const projectPath = ` (${state.projectRoot})`;
  const headerText = new TextRenderable(renderer, {
    id: "header-text",
    content: t`${fg(COLORS.warning)(LOGO)} ${fg(COLORS.accent)(state.boardName)}${fg(COLORS.textMuted)(modeIndicator)}${fg(COLORS.textDim)(projectPath)}`,
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
      padding: 1,
    });

    const columnHeader = new BoxRenderable(renderer, {
      id: `column-header-${column.id}`,
      width: "100%",
      height: 1,
      justifyContent: "center",
    });
    const columnTitle = new TextRenderable(renderer, {
      id: `column-title-${column.id}`,
      content: `${column.name} (${columnTasks.length})`,
      fg: isSelected ? COLORS.accentBright : COLORS.textMuted,
    });
    columnHeader.add(columnTitle);
    columnPanel.add(columnHeader);

    const taskContainer = new BoxRenderable(renderer, {
      id: `task-container-${column.id}`,
      width: "100%",
      flexGrow: 1,
      flexDirection: "column",
    });

    if (columnTasks.length > 0) {
      const taskSelect = new SelectRenderable(renderer, {
        id: `tasks-${column.id}`,
        width: "100%",
        height: "100%",
        backgroundColor: COLORS.panel,
        textColor: COLORS.text,
        options: columnTasks.map((task) => ({
          name: truncate(task.title, 30),
          description: task.assignedTo ?? task.createdBy,
          value: task.id,
        })),
        selectedBackgroundColor: COLORS.bg,
        selectedTextColor: COLORS.accent,
        descriptionColor: COLORS.textMuted,
      });

      state.taskSelects.set(column.id, taskSelect);

      if (isSelected) {
        taskSelect.focus();
      }

      taskContainer.add(taskSelect);
    } else {
      const emptyText = new TextRenderable(renderer, {
        id: `empty-${column.id}`,
        content: "(empty)",
        fg: COLORS.textDim,
      });
      taskContainer.add(emptyText);
    }

    columnPanel.add(taskContainer);

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

  const hasTasksInView = tasks.length > 0;
  const footerContent = state.archiveViewMode
    ? hasTasksInView
      ? "[r]estore [Tab]Back  [?] [q]"
      : "[Tab]Back  [?] [q]"
    : "[a]dd [m]ove [u] [d]el [x]arch [Tab]Arch  [?] [q]";
  const footerText = new TextRenderable(renderer, {
    id: "footer-text",
    content: footerContent,
    fg: COLORS.textMuted,
  });
  footer.add(footerText);
  mainContainer.add(footer);

  renderer.root.add(mainContainer);
}
