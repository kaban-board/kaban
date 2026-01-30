import { withErrorHandling } from "../../lib/error.js";
import { COLORS } from "../../lib/theme.js";
import type { AppState } from "../../lib/types.js";
import { showConfirmationModal } from "./factories/confirmation.js";

export async function showPurgeArchiveModal(
  state: AppState,
  onPurged: () => Promise<void>,
): Promise<void> {
  const stats = await state.taskService.getArchiveStats();
  if (stats.totalArchived === 0) {
    return;
  }

  const taskCount = stats.totalArchived;
  const taskWord = taskCount === 1 ? "task" : "tasks";

  showConfirmationModal(
    state,
    {
      id: "purge-archive-dialog",
      modalType: "purgeArchive",
      title: "Purge Archive?",
      titleColor: COLORS.danger,
      message: `${taskCount} archived ${taskWord} will be deleted`,
      warning: "This will permanently delete ALL archived tasks. Cannot be undone.",
      borderColor: COLORS.danger,
      width: 50,
      height: 12,
      confirmHint: "[y] Purge All  [n/Esc] Cancel",
    },
    async () => {
      const result = await withErrorHandling(
        state,
        () => state.taskService.purgeArchive(),
        "Failed to purge archive",
      );
      if (result) {
        await onPurged();
      }
    },
  );
}
