/**
 * Land extensions (master prompt 3). Two kinds of land:
 *  - EXTENSION PACKS: six packs, each building one fenced East Strip
 *    of 8 corn plots. Price 120 * 1.5^n, level-gated.
 *  - THE EAST FIELD: one big field past the strips, Level 7, bought once.
 * All numbers live here; the economy pass (S5) retunes in this file.
 */
export const LAND_PACK_COUNT = 6;
export const PLOTS_PER_PACK = 8;

/** Price of pack `owned` (0-based: the first pack costs 120). */
export function landPackPrice(owned: number): number {
  return Math.round(120 * Math.pow(1.5, owned));
}

/** Level gates for packs 1..6 (tiers 1-3 come from the unlock table). */
export const LAND_PACK_LEVELS = [4, 5, 7, 8, 9, 10];

export function landPackLevel(owned: number): number {
  return LAND_PACK_LEVELS[Math.min(owned, LAND_PACK_COUNT - 1)];
}

export const EAST_FIELD = {
  price: 800,
  level: 7,
  plots: 60,
} as const;
