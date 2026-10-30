/**
 * The single source of truth for Harvest Lane's UI look, applied
 * across the HUD and every panel. Casual mobile style: dark plum
 * panels, soft white text, gold for coins, green for go actions.
 */
export const UIStyle = {
  FONT: 'Arial, sans-serif',
  PANEL_BG: 0x2b2135,
  PANEL_ALPHA: 0.98,
  PANEL_STROKE: 0xffffff,
  TEXT: '#ffffff',
  TEXT_DIM: '#c9b8e8',
  TEXT_MUTED: '#8f9a8a',
  GOLD_TEXT: '#ffd94d',
  GEM_TEXT: '#d9a7ff',
  BTN_GO: 0x57a639,
  BTN_OFF: 0x777777,
  BTN_DONE: 0x555555,
  BTN_SHOP: 0x2f7fa8,
  BTN_TASKS: 0x7d5ba6,
  BTN_DANGER: 0xb0492f,
} as const;
