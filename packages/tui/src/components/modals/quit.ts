import { MODAL_HEIGHTS, MODAL_WIDTHS } from "../../lib/constants.js";
import { COLORS } from "../../lib/theme.js";
import type { AppState } from "../../lib/types.js";
import { showConfirmationModal } from "./factories/confirmation.js";

export function showQuitModal(state: AppState): void {
  showConfirmationModal(
    state,
    {
      id: "quit-dialog",
      modalType: "quit",
      title: "Quit Kaban?",
      titleColor: COLORS.danger,
      message: "",
      borderColor: COLORS.danger,
      width: MODAL_WIDTHS.small,
      height: MODAL_HEIGHTS.small,
      confirmHint: "[y] Yes  [n/Esc] No",
    },
    async () => {},
  );
}
