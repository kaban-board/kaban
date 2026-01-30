import { BoxRenderable, TextRenderable } from "@opentui/core";
import { MODAL_HEIGHTS, MODAL_WIDTHS } from "../../../lib/constants.js";
import { COLORS } from "../../../lib/theme.js";
import type { AppState, ModalType } from "../../../lib/types.js";
import { createModalOverlay } from "../../overlay.js";
import { closeModal } from "../shared.js";

export interface ConfirmationModalOptions {
  id: string;
  modalType: ModalType;
  title: string;
  titleColor: string;
  message: string;
  messageColor?: string;
  warning?: string;
  warningColor?: string;
  confirmHint?: string;
  borderColor?: string;
  width?: number;
  height?: number;
}

export function showConfirmationModal(
  state: AppState,
  options: ConfirmationModalOptions,
  onConfirm: () => Promise<void>,
): void {
  const { renderer } = state;

  const width = options.width ?? MODAL_WIDTHS.confirmation;
  const height = options.height ?? MODAL_HEIGHTS.confirmation;
  const messageColor = options.messageColor ?? COLORS.text;
  const warningColor = options.warningColor ?? COLORS.warning;
  const confirmHint = options.confirmHint ?? "[y] Yes  [n/Esc] No";
  const borderColor = options.borderColor ?? COLORS.accent;

  const { overlay, dialog } = createModalOverlay(renderer, {
    id: options.id,
    width,
    height,
    borderColor,
  });

  const titleRow = new BoxRenderable(renderer, {
    id: `${options.id}-title-row`,
    width: "100%",
    height: 1,
    justifyContent: "center",
  });
  const title = new TextRenderable(renderer, {
    id: `${options.id}-title`,
    content: options.title,
    fg: options.titleColor,
  });
  titleRow.add(title);

  const spacer1 = new BoxRenderable(renderer, {
    id: `${options.id}-spacer1`,
    width: "100%",
    height: 1,
  });

  const messageRow = new BoxRenderable(renderer, {
    id: `${options.id}-message-row`,
    width: "100%",
    height: 1,
  });
  const message = new TextRenderable(renderer, {
    id: `${options.id}-message`,
    content: options.message,
    fg: messageColor,
  });
  messageRow.add(message);

  dialog.add(titleRow);
  dialog.add(spacer1);
  dialog.add(messageRow);

  if (options.warning) {
    const warningRow = new BoxRenderable(renderer, {
      id: `${options.id}-warning-row`,
      width: "100%",
      height: 1,
    });
    const warning = new TextRenderable(renderer, {
      id: `${options.id}-warning`,
      content: options.warning,
      fg: warningColor,
    });
    warningRow.add(warning);
    dialog.add(warningRow);
  }

  const spacer2 = new BoxRenderable(renderer, {
    id: `${options.id}-spacer2`,
    width: "100%",
    height: options.warning ? 1 : 2,
  });
  dialog.add(spacer2);

  const hintRow = new BoxRenderable(renderer, {
    id: `${options.id}-hint-row`,
    width: "100%",
    height: 1,
    justifyContent: "center",
  });
  const hint = new TextRenderable(renderer, {
    id: `${options.id}-hint`,
    content: confirmHint,
    fg: COLORS.textMuted,
  });
  hintRow.add(hint);

  dialog.add(hintRow);
  renderer.root.add(overlay);

  state.modalOverlay = overlay;
  state.activeModal = options.modalType;
  state.onModalConfirm = async () => {
    await onConfirm();
    closeModal(state);
  };
}
