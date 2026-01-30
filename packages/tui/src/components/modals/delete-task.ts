import { withErrorHandling } from "../../lib/error.js";
import { COLORS } from "../../lib/theme.js";
import type { AppState } from "../../lib/types.js";
import { getSelectedTaskId } from "../../lib/types.js";
import { showConfirmationModal } from "./factories/confirmation.js";

export async function showDeleteTaskModal(
  state: AppState,
  onDeleted: () => Promise<void>,
): Promise<void> {
  const taskId = getSelectedTaskId(state);
  if (!taskId) {
    return;
  }

  const task = await state.taskService.getTask(taskId);
  if (!task) {
    return;
  }

  state.selectedTask = task;

  showConfirmationModal(
    state,
    {
      id: "delete-task-dialog",
      modalType: "deleteTask",
      title: "Delete Task?",
      titleColor: COLORS.danger,
      message: task.title.slice(0, 40),
      warning: "This action cannot be undone.",
      borderColor: COLORS.danger,
      confirmHint: "[y] Delete  [n/Esc] Cancel",
    },
    async () => {
      const result = await withErrorHandling(
        state,
        () => state.taskService.deleteTask(taskId),
        "Failed to delete task",
      );
      if (result !== null) {
        await onDeleted();
      }
    },
  );
}
