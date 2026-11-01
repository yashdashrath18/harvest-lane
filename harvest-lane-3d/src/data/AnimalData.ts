/**
 * Animal extensions (master prompt 4). Hens grow 3 -> 12 and cows
 * 2 -> 8 through per-species tiers. Prices are geometric, level
 * gates come from the unlock table, and each tier also grows the
 * pen's trough by 5 (Section 4.4). Pure data and math.
 */
export const HEN_BASE = 3;
export const HEN_MAX_TIER = 9; // 3 + 9 = 12 hens
export const COW_BASE = 2;
export const COW_MAX_TIER = 6; // 2 + 6 = 8 cows

export const TROUGH_BASE = 20;
export const TROUGH_PER_TIER = 5;

/** Price of the NEXT hen tier, given how many tiers are owned (0-based). */
export function henPrice(ownedTiers: number): number {
  return Math.round(80 * Math.pow(1.6, ownedTiers));
}

/** Level needed to buy the next hen tier: 2, 3, 4, ... */
export function henLevel(ownedTiers: number): number {
  return ownedTiers + 2;
}

/** Price of the NEXT cow tier, given how many tiers are owned (0-based). */
export function cowPrice(ownedTiers: number): number {
  return Math.round(200 * Math.pow(1.7, ownedTiers));
}

/** Level needed to buy the next cow tier: 5, 6, 7, ... */
export function cowLevel(ownedTiers: number): number {
  return ownedTiers + 5;
}

/** Trough capacity for a species at the given tier. */
export function troughCapacity(tier: number): number {
  return TROUGH_BASE + TROUGH_PER_TIER * tier;
}
