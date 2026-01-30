import { withErrorHandling } from "../../lib/error.js";
import { COLORS } from "../../lib/theme.js";
import type { AppState } from "../../lib/types.js";
import { getSelectedTaskId } from "../../lib/types.js";
import { showConfirmationModal } from "./factories/confirmation.js";
import { closeModal } from "./shared.js";

export async function showRestoreTaskModal(
  state: AppState,
  onRestored: () => Promise<void>,
): Promise<void> {
  const taskId = getSelectedTaskId(state);
  if (!taskId) {
    return;
  }

  const task = await state.taskService.getTask(taskId);
  if (!task || !task.archived) {
    return;
  }

  state.selectedTask = task;

  showConfirmationModal(
    state,
    {
      id: "restore-task-dialog",
      modalType: "restoreTask",
      title: "Restore Task?",
      titleColor: COLORS.success,
      message: task.title.slice(0, 40),
      warning: "Task will be restored to its original column.",
      warningColor: COLORS.textMuted,
      borderColor: COLORS.success,
      confirmHint: "[y] Restore  [n/Esc] Cancel",
    },
    async () => {
      const result = await withErrorHandling(
        state,
        () => state.taskService.restoreTask(taskId),
        "Failed to restore task",
      );
      if (result) {
        await onRestored();
      }
    },
  );
}
