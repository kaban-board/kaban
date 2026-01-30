import type { AppState } from "./types.js";

export async function withErrorHandling<T>(
  state: AppState,
  operation: () => Promise<T>,
  context: string,
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    try {
      const message = error instanceof Error ? error.message : String(error);
      showErrorToast(state, `${context}: ${message}`);
    } catch {
      console.error(`[CRITICAL] Error handler failed: ${context}`);
    }
    return null;
  }
}

export function showErrorToast(_state: AppState, message: string): void {
  // TODO: visual toast notification (SPEC-010 Phase 2)
  console.error(`[TUI Error] ${message}`);
}
