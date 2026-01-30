import { withErrorHandling } from "../../lib/error.js";
import { COLORS } from "../../lib/theme.js";
import type { AppState } from "../../lib/types.js";
import { getSelectedTaskId } from "../../lib/types.js";
import { showConfirmationModal } from "./factories/confirmation.js";

export async function showArchiveTaskModal(
  state: AppState,
  onArchived: () => Promise<void>,
): Promise<void> {
  const taskId = getSelectedTaskId(state);
  if (!taskId) {
    return;
  }

  const task = await state.taskService.getTask(taskId);
  if (!task) {
    return;
  }

  if (task.archived) {
    return;
  }

  state.selectedTask = task;

  showConfirmationModal(
    state,
    {
      id: "archive-task-dialog",
      modalType: "archiveTask",
      title: "Archive Task?",
      titleColor: COLORS.warning,
      message: task.title.slice(0, 40),
      warning: "Task will be moved to archive.",
      warningColor: COLORS.textMuted,
      borderColor: COLORS.warning,
      confirmHint: "[y] Archive  [n/Esc] Cancel",
    },
    async () => {
      const result = await withErrorHandling(
        state,
        () => state.taskService.archiveTasks({ taskIds: [taskId] }),
        "Failed to archive task",
      );
      if (result) {
        await onArchived();
      }
    },
  );
}
