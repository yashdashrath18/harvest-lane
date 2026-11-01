/**
 * Cross-cutting economy constants (master prompt 5): the prices
 * that used to be hardcoded in the shop code, the corn-for-gems
 * exchange rate, and the offline earnings shape. Per-system numbers
 * (crops, seeds, land, animals, upgrades) stay in their own data
 * files; everything here is read by both the game and the economy
 * simulator (scripts/simulate.mjs).
 */
export const HELPER_COST = 450;
export const CHURN_COST = 600;

/** Corn handed over per gem in the backpack trade. */
export const CORN_PER_GEM = 12;

/** Offline earnings: base coins per hour plus per farm level, capped hours. */
export const OFFLINE_BASE_PER_HOUR = 12;
export const OFFLINE_PER_LEVEL = 3;
export const OFFLINE_CAP_HOURS = 4;
export const OFFLINE_MIN_MINUTES = 15;

export function offlineCoinsPerHour(level: number): number {
  return OFFLINE_BASE_PER_HOUR + OFFLINE_PER_LEVEL * level;
}
