/**
 * Modal dimension constants
 * Centralized width/height values for consistent UI
 */

export const MODAL_WIDTHS = {
  small: 32,
  confirmation: 45,
  medium: 52,
  large: 60,
  history: 65,
} as const;

export const MODAL_HEIGHTS = {
  small: 8,
  confirmation: 10,
  medium: 11,
  large: 24,
} as const;

export const TRUNCATION = {
  taskTitle: 40,
  taskTitleShort: 30,
  taskId: 8,
} as const;
