/**
 * Crop definitions. Data-driven so Phase 5 and 6 can add crops and
 * tune the economy without touching system code.
 */
export interface CropDefinition {
  id: string;
  name: string;
  /** Milliseconds from planting to ready, across all growth stages. */
  growthTimeMs: number;
  /** Milliseconds to regrow after a harvest. */
  regrowTimeMs: number;
  /** Coins per unit when sold (used from Phase 4 onward). */
  sellPrice: number;
  /** Units added to the backpack per harvest. */
  yieldAmount: number;
  /** Number of growth stage textures: crop-<id>-0 .. crop-<id>-(n-1). */
  stages: number;
}

export const CORN: CropDefinition = {
  id: 'corn',
  name: 'Corn',
  growthTimeMs: 24_000,
  regrowTimeMs: 14_000,
  sellPrice: 6,
  yieldAmount: 1,
  stages: 4,
};

export const CARROT: CropDefinition = {
  id: 'carrot',
  name: 'Carrot',
  growthTimeMs: 30_000,
  regrowTimeMs: 18_000,
  sellPrice: 8,
  yieldAmount: 1,
  stages: 4,
};

export const CROPS: Record<string, CropDefinition> = {
  [CORN.id]: CORN,
  [CARROT.id]: CARROT,
};
