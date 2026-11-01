/**
 * Seed packs (master prompt 2.1). Seeds are bought in packs, held in
 * the seed bag, and consumed one per planted plot. Prices are
 * STARTING values; the economy pass (section 5) may retune them here.
 */
export interface SeedPack {
  cropId: string;
  label: string;
  icon: string;
  packSize: number;
  price: number;
}

export const SEED_PACKS: SeedPack[] = [
  { cropId: 'corn', label: 'Corn Seeds', icon: '🌽', packSize: 10, price: 20 },
  { cropId: 'carrot', label: 'Carrot Seeds', icon: '🥕', packSize: 10, price: 30 },
];

export function cheapestPackPrice(): number {
  return Math.min(...SEED_PACKS.map((p) => p.price));
}

/** Seed bag capacity: 30 at level 1, +2 per level, capped at +60. */
export function seedBagCapacity(level: number): number {
  return 30 + 2 * Math.min(30, Math.max(0, Math.floor(level) - 1));
}
