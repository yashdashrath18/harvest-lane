/**
 * Mission definitions. Progress is tracked from real gameplay events
 * (harvests, sales, serves, collections, area unlocks); rewards are
 * claimed manually from the missions panel.
 */
export type MissionKind = 'harvest' | 'sell' | 'serve' | 'collect' | 'area';

export interface MissionDefinition {
  id: string;
  title: string;
  kind: MissionKind;
  /** For harvest, sell and collect missions: which item counts. */
  itemId?: string;
  target: number;
  rewardCoins?: number;
  rewardGems?: number;
}

export const MISSIONS: MissionDefinition[] = [
  { id: 'harvest-30', title: 'Harvest 30 corn', kind: 'harvest', itemId: 'corn', target: 30, rewardCoins: 40 },
  { id: 'sell-25', title: 'Sell 25 corn', kind: 'sell', itemId: 'corn', target: 25, rewardCoins: 50 },
  { id: 'serve-10', title: 'Serve 10 customers', kind: 'serve', target: 10, rewardGems: 3 },
  { id: 'eggs-20', title: 'Collect 20 eggs', kind: 'collect', itemId: 'egg', target: 20, rewardCoins: 60 },
  { id: 'harvest-120', title: 'Harvest 120 corn', kind: 'harvest', itemId: 'corn', target: 120, rewardCoins: 120 },
  { id: 'area-1', title: 'Unlock a new area', kind: 'area', target: 1, rewardGems: 5 },
];

// ---------------------------------------------------------------------------
// Endless contracts: once every mission above is claimed, the board
// refills forever from these templates. Each template has its own
// tier; every completion raises that template's next target by its
// growth factor, and rewards scale with the target. Three contracts
// are active at a time, always of distinct templates, rotating
// through the list so the mix keeps changing.
// ---------------------------------------------------------------------------

export interface ContractTemplate {
  key: string;
  kind: MissionKind;
  itemId?: string;
  title: (target: number) => string;
  baseTarget: number;
  /** Target multiplier applied per tier. */
  growth: number;
  /** Coin reward per unit of target. */
  coinRate: number;
  /** When set, tiers where (tier + 1) is a multiple of this also pay gems. */
  gemEvery?: number;
  gemReward?: number;
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  { key: 'harvest-corn', kind: 'harvest', itemId: 'corn', title: (t) => `Harvest ${t} corn`, baseTarget: 60, growth: 1.5, coinRate: 1 },
  { key: 'sell-corn', kind: 'sell', itemId: 'corn', title: (t) => `Sell ${t} corn`, baseTarget: 40, growth: 1.5, coinRate: 1.5 },
  { key: 'serve', kind: 'serve', title: (t) => `Serve ${t} customers`, baseTarget: 15, growth: 1.5, coinRate: 6, gemEvery: 3, gemReward: 3 },
  { key: 'collect-egg', kind: 'collect', itemId: 'egg', title: (t) => `Collect ${t} eggs`, baseTarget: 30, growth: 1.5, coinRate: 2 },
  { key: 'collect-milk', kind: 'collect', itemId: 'milk', title: (t) => `Collect ${t} milk`, baseTarget: 20, growth: 1.5, coinRate: 3 },
  { key: 'harvest-carrot', kind: 'harvest', itemId: 'carrot', title: (t) => `Harvest ${t} carrots`, baseTarget: 40, growth: 1.5, coinRate: 1.5 },
];

export const CONTRACT_SLOTS = 3;

// ---------------------------------------------------------------------------
// Daily missions: three per calendar day, picked deterministically
// from this pool by the date, paying mostly gems. They reset at
// local midnight; an unfinished day is simply replaced.
// ---------------------------------------------------------------------------

export interface DailyMissionDefinition {
  id: string;
  title: string;
  kind: MissionKind;
  itemId?: string;
  target: number;
  rewardCoins?: number;
  rewardGems?: number;
}

export const DAILY_POOL: DailyMissionDefinition[] = [
  { id: 'daily-harvest-corn', title: 'Daily: Harvest 40 corn', kind: 'harvest', itemId: 'corn', target: 40, rewardGems: 2 },
  { id: 'daily-serve', title: 'Daily: Serve 8 customers', kind: 'serve', target: 8, rewardGems: 2 },
  { id: 'daily-eggs', title: 'Daily: Collect 12 eggs', kind: 'collect', itemId: 'egg', target: 12, rewardCoins: 40 },
  { id: 'daily-sell-corn', title: 'Daily: Sell 30 corn', kind: 'sell', itemId: 'corn', target: 30, rewardGems: 1 },
  { id: 'daily-milk', title: 'Daily: Collect 8 milk', kind: 'collect', itemId: 'milk', target: 8, rewardCoins: 50 },
  { id: 'daily-carrots', title: 'Daily: Harvest 25 carrots', kind: 'harvest', itemId: 'carrot', target: 25, rewardGems: 2 },
];

export const DAILY_COUNT = 3;

/** Local calendar date key, e.g. "2026-10-31". */
export function localDateKey(now = new Date()): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/** Deterministic pick of DAILY_COUNT pool ids for a date key. */
export function dailyIdsFor(dateKey: string): string[] {
  let seed = 0;
  for (let i = 0; i < dateKey.length; i++) seed = (seed * 31 + dateKey.charCodeAt(i)) >>> 0;
  const pool = [...DAILY_POOL];
  const picked: string[] = [];
  while (picked.length < DAILY_COUNT && pool.length > 0) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const idx = seed % pool.length;
    picked.push(pool.splice(idx, 1)[0].id);
  }
  return picked;
}

/** Target for a template at a tier, rounded to whole (or tens when large). */
export function contractTarget(template: ContractTemplate, tier: number): number {
  const raw = template.baseTarget * Math.pow(template.growth, tier);
  return raw >= 100 ? Math.round(raw / 10) * 10 : Math.round(raw);
}
