/**
 * Level curve, XP values and the level-gated unlock table (master
 * prompt sections 1 and 5). Every balance number for progression lives
 * here; logic reads it, never hard-codes it.
 */

export const MAX_LEVEL = 50;

/** XP needed to advance from `level` to `level + 1`: round(50 * 1.35^(level-1)). */
export function xpForNextLevel(level: number): number {
  return Math.round(50 * Math.pow(1.35, Math.max(0, level - 1)));
}

/** Total XP required to REACH `level` from level 1 (level 10 = 1,986). */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level && l < MAX_LEVEL; l++) total += xpForNextLevel(l);
  return total;
}

/** XP paid per action (master prompt 1.1). */
export const XP_VALUES = {
  plant: 1,
  harvest: 2,
  servePerItem: 3,
  collect: 2,
  churn: 5,
  dailyClaim: 20,
  /** Contract claim: base + per-tier bonus. */
  contractBase: 30,
  contractPerTier: 5,
  /** Base mission claim: clamped into [missionMin, missionMax] by reward size. */
  missionMin: 25,
  missionMax: 60,
} as const;

/** XP for claiming a base mission, scaled by its reward size into 25..60. */
export function missionClaimXp(rewardCoins: number, rewardGems: number): number {
  const raw = XP_VALUES.missionMin + Math.floor((rewardCoins + rewardGems * 30) / 10);
  return Math.min(XP_VALUES.missionMax, Math.max(XP_VALUES.missionMin, raw));
}

/** XP for claiming a contract at the given tier (tier starts at 1). */
export function contractClaimXp(tier: number): number {
  return XP_VALUES.contractBase + XP_VALUES.contractPerTier * Math.max(0, tier - 1);
}

/**
 * Permanent backpack capacity bonus from levels: +1 per level up to
 * level 20, then +1 every 2 levels (master prompt 1.2).
 */
export function capacityBonusFor(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return Math.min(20, l) - 1 + Math.floor(Math.max(0, l - 20) / 2);
}

export interface UnlockDef {
  id: string;
  label: string;
  icon: string;
}

/** Level-gated unlocks (master prompt 1.2). Features read this table. */
export const UNLOCKS: Record<number, UnlockDef[]> = {
  2: [{ id: 'hen-tier-1', label: 'Hen Extension tier 1', icon: '🐔' }],
  3: [{ id: 'south-field', label: 'South Field (carrots)', icon: '🥕' }],
  4: [{ id: 'land-1', label: 'Land Extension tier 1', icon: '🗺️' }],
  5: [
    { id: 'cow-tier-1', label: 'Cow Extension tier 1', icon: '🐄' },
    { id: 'outfits-basic', label: 'Outfits: Shirts and Shoes', icon: '👕' },
  ],
  6: [{ id: 'churn', label: 'Cheese Churn', icon: '🧀' }],
  7: [
    { id: 'east-field', label: 'East Field', icon: '🌾' },
    { id: 'land-2', label: 'Land Extension tier 2', icon: '🗺️' },
  ],
  8: [{ id: 'helper-2', label: 'Helper tier 2 (plants seeds)', icon: '🧑‍🌾' }],
  9: [
    { id: 'outfits-advanced', label: 'Outfits: Chains and Hats', icon: '⛓️' },
    { id: 'land-3', label: 'Land Extension tier 3', icon: '🗺️' },
  ],
  10: [{ id: 'hotel', label: 'The Hotel', icon: '🏨' }],
};

export function unlocksAt(level: number): UnlockDef[] {
  return UNLOCKS[level] ?? [];
}

/** True once `level` reaches the gate for `unlockId`. */
export function isUnlocked(unlockId: string, level: number): boolean {
  for (const [lvl, defs] of Object.entries(UNLOCKS)) {
    if (defs.some((d) => d.id === unlockId)) return level >= Number(lvl);
  }
  return true; // not gated
}

/** The level an unlock opens at, or null when it is not gated. */
export function unlockLevel(unlockId: string): number | null {
  for (const [lvl, defs] of Object.entries(UNLOCKS)) {
    if (defs.some((d) => d.id === unlockId)) return Number(lvl);
  }
  return null;
}
