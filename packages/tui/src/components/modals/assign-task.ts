import {
  BoxRenderable,
  InputRenderable,
  InputRenderableEvents,
  TextRenderable,
} from "@opentui/core";
import { createButtonRow } from "../../lib/button-row.js";
import { MODAL_WIDTHS, TRUNCATION } from "../../lib/constants.js";
import { withErrorHandling } from "../../lib/error.js";
import { COLORS } from "../../lib/theme.js";
import type { AppState } from "../../lib/types.js";
import { getSelectedTaskId } from "../../lib/types.js";
import { createModalOverlay } from "../overlay.js";
import { closeModal } from "./shared.js";

export async function showAssignTaskModal(
  state: AppState,
  onAssigned: () => Promise<void>,
): Promise<void> {
  const { renderer } = state;

  const taskId = getSelectedTaskId(state);
  if (!taskId) {
    return;
  }

  const task = await state.taskService.getTask(taskId);
  if (!task) {
    return;
  }

  const { overlay, dialog } = createModalOverlay(renderer, {
    id: "assign-task-dialog",
    width: MODAL_WIDTHS.confirmation,
    height: 12,
  });

  const titleRow = new BoxRenderable(renderer, {
    id: "assign-title-row",
    width: "100%",
    height: 1,
  });
  const title = new TextRenderable(renderer, {
    id: "assign-title",
    content: "Assign Task",
    fg: COLORS.accent,
  });
  titleRow.add(title);

  const taskRow = new BoxRenderable(renderer, {
    id: "assign-task-row",
    width: "100%",
    height: 1,
  });
  const taskText = new TextRenderable(renderer, {
    id: "assign-task-text",
    content: task.title.slice(0, TRUNCATION.taskTitle),
    fg: COLORS.textMuted,
  });
  taskRow.add(taskText);

  const spacer1 = new BoxRenderable(renderer, { id: "assign-spacer1", width: "100%", height: 1 });

  const labelRow = new BoxRenderable(renderer, {
    id: "assign-label-row",
    width: "100%",
    height: 1,
  });
  const currentAssignee = task.assignedTo ?? "(unassigned)";
  const label = new TextRenderable(renderer, {
    id: "assign-label",
    content: `Current: ${currentAssignee}`,
    fg: COLORS.text,
  });
  labelRow.add(label);

  const input = new InputRenderable(renderer, {
    id: "assignee-input",
    width: 39,
    height: 1,
    placeholder: "Enter username (empty to unassign)",
    textColor: COLORS.text,
    placeholderColor: COLORS.textDim,
    backgroundColor: COLORS.inputBg,
    focusedBackgroundColor: COLORS.inputBg,
    cursorColor: COLORS.cursor,
  });

  const spacer2 = new BoxRenderable(renderer, { id: "assign-spacer2", width: "100%", height: 1 });

  const doAssign = async () => {
    const assignee = input.value.trim();
    const result = await withErrorHandling(
      state,
      () => state.taskService.updateTask(taskId, { assignedTo: assignee || null }),
      "Failed to assign task",
    );
    closeModal(state);
    if (result) {
      await onAssigned();
    }
  };

  const doCancel = () => {
    closeModal(state);
  };

  const buttonRow = createButtonRow(renderer, "assign-task", [
    { label: "Assign", action: doAssign, color: COLORS.success },
    { label: "Cancel", action: doCancel },
  ]);

  dialog.add(titleRow);
  dialog.add(taskRow);
  dialog.add(spacer1);
  dialog.add(labelRow);
  dialog.add(input);
  dialog.add(spacer2);
  dialog.add(buttonRow.container);
  renderer.root.add(overlay);

  setImmediate(() => {
    buttonRow.setFocused(false);
    input.focus();
  });

  state.modalOverlay = overlay;
  state.taskInput = input;
  state.buttonRow = buttonRow;
  state.activeModal = "assignTask";

  input.on(InputRenderableEvents.ENTER, doAssign);
}
