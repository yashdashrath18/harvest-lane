/**
 * World layout for Harvest Lane 3D. The farm keeps the exact plan of
 * the 2D game: the same fields, pens, stall and spawn, expressed in
 * the original design pixels and converted to 3D units (46 px = 1
 * unit, world centred on the 2D world's centre).
 */
export const PX_PER_UNIT = 46;
export const WORLD_W_PX = 1080;
export const WORLD_H_PX = 1600;

export const u = (px: number): number => px / PX_PER_UNIT;
export const X = (px: number): number => (px - WORLD_W_PX / 2) / PX_PER_UNIT;
export const Z = (px: number): number => (px - WORLD_H_PX / 2) / PX_PER_UNIT;

export interface RectPx {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FIELDS: Record<'A' | 'B' | 'CORN' | 'SOUTH', RectPx> = {
  A: { x: 84, y: 168, w: 368, h: 308 },
  B: { x: 84, y: 540, w: 368, h: 268 },
  CORN: { x: 628, y: 168, w: 368, h: 392 },
  SOUTH: { x: 84, y: 1024, w: 368, h: 308 },
};

export const CHICKEN_PEN: RectPx = { x: 620, y: 616, w: 240, h: 220 };
export const COW_PEN: RectPx = { x: 628, y: 996, w: 368, h: 152 };

/**
 * The east expansion zone (master prompt S3), past the old perimeter
 * fence: six purchasable strips of 8 corn plots each, and the East
 * Field beyond them. Design px, same grid as everything else.
 */
export const EAST_ZONE: RectPx = { x: 1068, y: 140, w: 532, h: 1320 };
export const STRIP_RECTS: RectPx[] = [0, 1, 2, 3, 4, 5].map((i) => ({
  x: 1096,
  y: 170 + i * 215,
  w: 160,
  h: 200,
}));
/** The plantable plot area inside a strip's fence (2 cols x 4 rows). */
export function stripPlotRect(i: number): RectPx {
  const s = STRIP_RECTS[i];
  return { x: s.x + 34, y: s.y + 8, w: 92, h: 184 };
}
export const EAST_FIELD_RECT: RectPx = { x: 1300, y: 170, w: 276, h: 460 };

export const STALL_POS = { x: 840, y: 1290 };
export const STALL_FRONT = { x: 840, y: 1412 };
export const SPAWN = { x: 540, y: 910 };
export const GATE = { x: 540, y: 1580 };
export const QUEUE_SLOTS = [756, 840, 924].map((x) => ({ x, y: 1448 }));

/** Convert a px rect to a 3D rect (centre + size). */
export function rect3(r: RectPx): { cx: number; cz: number; w: number; d: number } {
  return {
    cx: X(r.x + r.w / 2),
    cz: Z(r.y + r.h / 2),
    w: u(r.w),
    d: u(r.h),
  };
}
