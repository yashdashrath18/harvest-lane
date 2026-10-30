/**
 * The single source of truth for Harvest Lane's UI look, applied
 * across the HUD and every panel. Casual tycoon style matched to
 * the reference direction: cream panels with warm wood borders,
 * blue ribbon headers, brown ink text, chunky green go buttons.
 */
export const UIStyle = {
  FONT: 'Arial, sans-serif',
  PANEL_BG: 0xfdf3da,
  PANEL_ALPHA: 1,
  PANEL_STROKE: 0x8a5a2b,
  PANEL_INNER: 0xf7e7c3,
  TEXT: '#5b3a1e',
  TEXT_DIM: '#8a6a44',
  TEXT_MUTED: '#a08b6d',
  GOLD_TEXT: '#b8860b',
  GEM_TEXT: '#1d7fc4',
  RIBBON: 0x2f7fe0,
  RIBBON_DARK: 0x1f5fb4,
  BTN_GO: 0x57b93c,
  BTN_GO_DARK: 0x3d8a28,
  BTN_OFF: 0xb9a888,
  BTN_DONE: 0x9c8b6d,
  BTN_SHOP: 0x2f7fa8,
  BTN_TASKS: 0x7d5ba6,
  BTN_DANGER: 0xe2483d,
  PILL_BG: 0x3a2a18,
} as const;
