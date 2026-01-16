import { BoxRenderable, type CliRenderer, TextRenderable } from "@opentui/core";
import { COLORS } from "./theme.js";

export interface ButtonConfig {
  label: string;
  action: () => void | Promise<void>;
  color?: string;
}

export interface ButtonRowState {
  container: BoxRenderable;
  selectedIndex: number;
  focused: boolean;
  busy: boolean;
  buttons: ButtonConfig[];
  setFocused: (focused: boolean) => void;
  selectNext: () => void;
  selectPrev: () => void;
  triggerSelected: () => void | Promise<void>;
  render: () => void;
}

export function createButtonRow(
  renderer: CliRenderer,
  id: string,
  buttons: ButtonConfig[],
): ButtonRowState {
  const container = new BoxRenderable(renderer, {
    id: `${id}-button-row`,
    width: "100%",
    height: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 2,
  });

  const buttonTexts: TextRenderable[] = [];

  const state: ButtonRowState = {
    container,
    selectedIndex: 0,
    focused: false,
    busy: false,
    buttons,
    setFocused: (focused) => {
      state.focused = focused;
      state.render();
    },
    selectNext: () => {
      if (!state.focused) return;
      state.selectedIndex = (state.selectedIndex + 1) % buttons.length;
      state.render();
    },
    selectPrev: () => {
      if (!state.focused) return;
      state.selectedIndex = (state.selectedIndex - 1 + buttons.length) % buttons.length;
      state.render();
    },
    triggerSelected: async () => {
      if (!state.focused) return;
      if (state.busy) return;

      state.busy = true;
      try {
        await buttons[state.selectedIndex].action();
      } finally {
        state.busy = false;
      }
    },
    render: () => {
      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const isSelected = state.focused && i === state.selectedIndex;
        buttonTexts[i].content = isSelected ? `[${btn.label}]` : ` ${btn.label} `;
        buttonTexts[i].fg = isSelected ? (btn.color ?? COLORS.accentBright) : COLORS.textMuted;
        buttonTexts[i].bg = isSelected ? COLORS.inputBg : undefined;
      }
    },
  };

  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const isSelected = state.focused && i === state.selectedIndex;
    const text = new TextRenderable(renderer, {
      id: `${id}-btn-${i}`,
      content: isSelected ? `[${btn.label}]` : ` ${btn.label} `,
      fg: isSelected ? (btn.color ?? COLORS.accentBright) : COLORS.textMuted,
      bg: isSelected ? COLORS.inputBg : undefined,
    });
    buttonTexts.push(text);
    container.add(text);
  }

  return state;
}
