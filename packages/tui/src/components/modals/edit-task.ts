import {
  BoxRenderable,
  InputRenderable,
  InputRenderableEvents,
  TextRenderable,
} from "@opentui/core";
import { createButtonRow } from "../../lib/button-row.js";
import { MODAL_WIDTHS } from "../../lib/constants.js";
import { withErrorHandling } from "../../lib/error.js";
import { COLORS } from "../../lib/theme.js";
import type { AppState } from "../../lib/types.js";
import { truncate } from "../../lib/utils.js";
import { createModalOverlay } from "../overlay.js";
import { closeModal } from "./shared.js";

const DIALOG_WIDTH = MODAL_WIDTHS.large;
const DESC_INPUT_HEIGHT = 6;

export interface EditTaskCallbacks {
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export async function showEditTaskModal(
  state: AppState,
  callbacks: EditTaskCallbacks,
): Promise<void> {
  const { renderer } = state;
  const task = state.selectedTask;

  if (!task) {
    return;
  }

  state.editTaskState = {
    title: task.title,
    description: task.description ?? "",
    focusedField: "title",
  };

  const dialogHeight = 18;

  const { overlay, dialog } = createModalOverlay(renderer, {
    id: "edit-task-dialog",
    width: DIALOG_WIDTH,
    height: dialogHeight,
  });

  const headerRow = new BoxRenderable(renderer, {
    id: "edit-header-row",
    width: "100%",
    height: 1,
  });
  const headerText = new TextRenderable(renderer, {
    id: "edit-header-text",
    content: `Edit Task: ${truncate(task.title, DIALOG_WIDTH - 20)}`,
    fg: COLORS.accent,
  });
  headerRow.add(headerText);

  const spacer1 = new BoxRenderable(renderer, {
    id: "edit-spacer1",
    width: "100%",
    height: 1,
  });

  const titleLabelRow = new BoxRenderable(renderer, {
    id: "edit-title-label-row",
    width: "100%",
    height: 1,
  });
  const titleLabel = new TextRenderable(renderer, {
    id: "edit-title-label",
    content: "Title",
    fg: COLORS.textMuted,
  });
  titleLabelRow.add(titleLabel);

  const titleInput = new InputRenderable(renderer, {
    id: "edit-title-input",
    width: DIALOG_WIDTH - 6,
    height: 1,
    placeholder: "Task title...",
    textColor: COLORS.text,
    placeholderColor: COLORS.textDim,
    backgroundColor: COLORS.inputBg,
    focusedBackgroundColor: COLORS.inputBg,
    cursorColor: COLORS.cursor,
  });
  titleInput.value = task.title;

  const spacer2 = new BoxRenderable(renderer, {
    id: "edit-spacer2",
    width: "100%",
    height: 1,
  });

  const descLabelRow = new BoxRenderable(renderer, {
    id: "edit-desc-label-row",
    width: "100%",
    height: 1,
  });
  const descLabel = new TextRenderable(renderer, {
    id: "edit-desc-label",
    content: "Description",
    fg: COLORS.textMuted,
  });
  descLabelRow.add(descLabel);

  const descInput = new InputRenderable(renderer, {
    id: "edit-desc-input",
    width: DIALOG_WIDTH - 6,
    height: DESC_INPUT_HEIGHT,
    placeholder: "Task description (optional)...",
    textColor: COLORS.text,
    placeholderColor: COLORS.textDim,
    backgroundColor: COLORS.inputBg,
    focusedBackgroundColor: COLORS.inputBg,
    cursorColor: COLORS.cursor,
  });
  descInput.value = task.description ?? "";

  const spacer3 = new BoxRenderable(renderer, {
    id: "edit-spacer3",
    width: "100%",
    height: 1,
  });

  const doSave = async () => {
    const newTitle = titleInput.value.trim();
    const newDescription = descInput.value.trim();

    if (!newTitle) {
      return;
    }

    const hasChanges = newTitle !== task.title || newDescription !== (task.description ?? "");

    if (hasChanges) {
      const result = await withErrorHandling(
        state,
        () =>
          state.taskService.updateTask(task.id, {
            title: newTitle,
            description: newDescription || undefined,
          }),
        "Failed to save task",
      );
      if (!result) {
        return;
      }
    }

    closeModal(state);
    state.editTaskState = null;
    await callbacks.onSave();
  };

  const doCancel = () => {
    closeModal(state);
    state.editTaskState = null;
    callbacks.onCancel();
  };

  const buttonRow = createButtonRow(renderer, "edit-task", [
    { label: "Save", action: doSave, color: COLORS.success },
    { label: "Cancel", action: doCancel },
  ]);

  const hintRow = new BoxRenderable(renderer, {
    id: "edit-hint-row",
    width: "100%",
    height: 1,
    justifyContent: "center",
  });
  const hint = new TextRenderable(renderer, {
    id: "edit-hint",
    content: "[Tab] Next    [Enter] Save    [Esc] Cancel",
    fg: COLORS.textDim,
  });
  hintRow.add(hint);

  dialog.add(headerRow);
  dialog.add(spacer1);
  dialog.add(titleLabelRow);
  dialog.add(titleInput);
  dialog.add(spacer2);
  dialog.add(descLabelRow);
  dialog.add(descInput);
  dialog.add(spacer3);
  dialog.add(buttonRow.container);
  dialog.add(hintRow);

  renderer.root.add(overlay);

  setImmediate(() => {
    buttonRow.setFocused(false);
    titleInput.focus();
  });

  state.modalOverlay = overlay;
  state.taskInput = titleInput;
  state.buttonRow = buttonRow;
  state.activeModal = "editTask";

  titleInput.on(InputRenderableEvents.ENTER, doSave);

  state.editTaskRuntime = {
    titleInput,
    descInput,
    doSave,
    doCancel,
  };
}

export function focusNextEditField(state: AppState): void {
  if (!state.editTaskRuntime || !state.editTaskState) return;

  const { titleInput, descInput } = state.editTaskRuntime;
  const { buttonRow } = state;

  switch (state.editTaskState.focusedField) {
    case "title":
      titleInput.blur();
      descInput.focus();
      buttonRow?.setFocused(false);
      state.editTaskState.focusedField = "description";
      break;
    case "description":
      descInput.blur();
      titleInput.blur();
      buttonRow?.setFocused(true);
      state.editTaskState.focusedField = "buttons";
      break;
    case "buttons":
      buttonRow?.setFocused(false);
      titleInput.focus();
      state.editTaskState.focusedField = "title";
      break;
  }
}

export function focusPrevEditField(state: AppState): void {
  if (!state.editTaskRuntime || !state.editTaskState) return;

  const { titleInput, descInput } = state.editTaskRuntime;
  const { buttonRow } = state;

  switch (state.editTaskState.focusedField) {
    case "title":
      titleInput.blur();
      buttonRow?.setFocused(true);
      state.editTaskState.focusedField = "buttons";
      break;
    case "description":
      descInput.blur();
      titleInput.focus();
      buttonRow?.setFocused(false);
      state.editTaskState.focusedField = "title";
      break;
    case "buttons":
      buttonRow?.setFocused(false);
      descInput.focus();
      state.editTaskState.focusedField = "description";
      break;
  }
}

export function saveEditTask(state: AppState): Promise<void> {
  if (!state.editTaskRuntime) return Promise.resolve();
  return state.editTaskRuntime.doSave();
}

export function cancelEditTask(state: AppState): void {
  if (!state.editTaskRuntime) return;
  state.editTaskRuntime.doCancel();
}
