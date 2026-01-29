import {
  BoxRenderable,
  InputRenderable,
  InputRenderableEvents,
  TextRenderable,
} from "@opentui/core";
import { COLORS } from "../../lib/theme.js";
import type { AppState } from "../../lib/types.js";
import type { Task } from "@kaban-board/core";
import { createModalOverlay } from "../overlay.js";
import { closeModal } from "./shared.js";

export function showSearchArchiveModal(
  state: AppState,
  onResults: (tasks: Task[]) => Promise<void>
): void {
  const { renderer } = state;
  const { overlay, dialog } = createModalOverlay(renderer, {
    id: "search-archive-dialog",
    width: 52,
    height: 9,
  });

  const titleRow = new BoxRenderable(renderer, {
    id: "search-title-row",
    width: "100%",
    height: 1,
  });
  const title = new TextRenderable(renderer, {
    id: "search-title",
    content: " Search Archive ",
    fg: COLORS.accent,
  });
  titleRow.add(title);

  const spacer1 = new BoxRenderable(renderer, { id: "search-spacer1", width: "100%", height: 1 });

  const labelRow = new BoxRenderable(renderer, {
    id: "search-label-row",
    width: "100%",
    height: 1,
  });
  const label = new TextRenderable(renderer, {
    id: "search-label",
    content: "Search query:",
    fg: COLORS.text,
  });
  labelRow.add(label);

  const input = new InputRenderable(renderer, {
    id: "search-input",
    width: 46,
    height: 1,
    placeholder: "Enter search query...",
    textColor: COLORS.text,
    placeholderColor: COLORS.textDim,
    backgroundColor: COLORS.inputBg,
    focusedBackgroundColor: COLORS.inputBg,
    cursorColor: COLORS.cursor,
  });

  const spacer2 = new BoxRenderable(renderer, { id: "search-spacer2", width: "100%", height: 2 });

  const hintRow = new BoxRenderable(renderer, {
    id: "search-hint-row",
    width: "100%",
    height: 1,
  });
  const hint = new TextRenderable(renderer, {
    id: "search-hint",
    content: "[Enter] Search  [Esc] Cancel",
    fg: COLORS.textMuted,
  });
  hintRow.add(hint);

  dialog.add(titleRow);
  dialog.add(spacer1);
  dialog.add(labelRow);
  dialog.add(input);
  dialog.add(spacer2);
  dialog.add(hintRow);

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
