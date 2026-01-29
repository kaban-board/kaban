import { BoxRenderable, TextRenderable } from "@opentui/core";
import { COLORS } from "../../lib/theme.js";
import type { AppState } from "../../lib/types.js";
import { createModalOverlay } from "../overlay.js";
import { closeModal } from "./shared.js";

export async function showPurgeArchiveModal(
  state: AppState,
  onPurged: () => Promise<void>,
): Promise<void> {
  const { renderer } = state;

  const stats = await state.taskService.getArchiveStats();
  if (stats.count === 0) {
    return;
  }

  const { overlay, dialog } = createModalOverlay(renderer, {
    id: "purge-archive-dialog",
    width: 50,
    height: 12,
    borderColor: COLORS.danger,
  });

  const titleRow = new BoxRenderable(renderer, {
    id: "purge-title-row",
    width: "100%",
    height: 1,
    justifyContent: "center",
  });
  const title = new TextRenderable(renderer, {
    id: "purge-title",
    content: "Purge Archive?",
    fg: COLORS.danger,
  });
  titleRow.add(title);

  const spacer1 = new BoxRenderable(renderer, { id: "purge-spacer1", width: "100%", height: 1 });

  const countRow = new BoxRenderable(renderer, {
    id: "purge-count-row",
    width: "100%",
    height: 1,
  });
  const countText = new TextRenderable(renderer, {
    id: "purge-count-text",
    content: `${stats.count} archived task${stats.count === 1 ? "" : "s"} will be deleted`,
    fg: COLORS.text,
  });
  countRow.add(countText);

  const spacer2 = new BoxRenderable(renderer, { id: "purge-spacer2", width: "100%", height: 1 });

  const warningRow1 = new BoxRenderable(renderer, {
    id: "purge-warning-row1",
    width: "100%",
    height: 1,
  });
  const warning1 = new TextRenderable(renderer, {
    id: "purge-warning1",
    content: "This will permanently delete ALL",
    fg: COLORS.warning,
  });
  warningRow1.add(warning1);

  const warningRow2 = new BoxRenderable(renderer, {
    id: "purge-warning-row2",
    width: "100%",
    height: 1,
  });
  const warning2 = new TextRenderable(renderer, {
    id: "purge-warning2",
    content: "archived tasks. This cannot be undone.",
    fg: COLORS.warning,
  });
  warningRow2.add(warning2);

  const spacer3 = new BoxRenderable(renderer, { id: "purge-spacer3", width: "100%", height: 2 });

  const hintRow = new BoxRenderable(renderer, {
    id: "purge-hint-row",
    width: "100%",
    height: 1,
    justifyContent: "center",
  });
  const hint = new TextRenderable(renderer, {
    id: "purge-hint",
    content: "[y] Purge All  [n/Esc] Cancel",
    fg: COLORS.textMuted,
  });
  hintRow.add(hint);

  dialog.add(titleRow);
  dialog.add(spacer1);
  dialog.add(countRow);
  dialog.add(spacer2);
  dialog.add(warningRow1);
  dialog.add(warningRow2);
  dialog.add(spacer3);
  dialog.add(hintRow);
  renderer.root.add(overlay);

  state.modalOverlay = overlay;
  state.activeModal = "purgeArchive";
  state.onModalConfirm = async () => {
    await state.taskService.purgeArchive({ confirm: true });
    closeModal(state);
    await onPurged();
  };
}
