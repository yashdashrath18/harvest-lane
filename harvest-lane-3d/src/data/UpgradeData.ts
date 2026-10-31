/**
 * Upgrade tracks and the unlockable area. Data-driven: the shop UI,
 * the purchase logic and the applied effects all read from here.
 */
export interface UpgradeTrack {
  id: string;
  name: string;
  /** One-sentence description of what each level does. */
  blurb: string;
  /** Cost per level, in order. Length is the max level. */
  costs: number[];
}

export const UPGRADE_TRACKS: UpgradeTrack[] = [
  {
    id: 'backpack',
    name: 'Backpack',
    blurb: 'Carry more produce per trip',
    costs: [40, 90, 180],
  },
  {
    id: 'boots',
    name: 'Swift Boots',
    blurb: 'Move faster around the farm',
    costs: [35, 80, 160],
  },
  {
    id: 'fertilizer',
    name: 'Fertilizer',
    blurb: 'Crops grow and regrow faster',
    costs: [45, 100, 200],
  },
  {
    id: 'charm',
    name: 'Market Charm',
    blurb: 'Customers pay better prices',
    costs: [50, 110, 220],
  },
];

/** Backpack capacity by backpack level (index = level). */
export const BACKPACK_CAPACITIES = [10, 16, 24, 34];
export const SPEED_PER_LEVEL = 0.12;
export const GROWTH_PER_LEVEL = 0.15;
export const PRICE_PER_LEVEL = 0.1;

/** The one unlockable area in this phase: the fenced South Field. */
export const SOUTH_FIELD = {
  id: 'south-field',
  name: 'South Field',
  blurb: 'A fenced-off field: 48 carrot plots',
  cost: 150,
  rect: { x: 84, y: 1024, w: 368, h: 308 },
};
