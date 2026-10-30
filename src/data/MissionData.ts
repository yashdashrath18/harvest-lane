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
