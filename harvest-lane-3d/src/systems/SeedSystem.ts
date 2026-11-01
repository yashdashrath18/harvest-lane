import { cheapestPackPrice } from '../data/SeedData';

/**
 * The seed bag (master prompt 2.1): a small inventory separate from
 * the harvest backpack. Planting consumes 1 seed of the plot's crop.
 * Includes the anti-softlock trickle: a player with no seeds, not
 * enough coins for the cheapest pack, and nothing ripe or sellable
 * receives 1 free corn seed every 45 seconds, up to 3 held, so
 * progress is never impossible. Pure logic, unit tested.
 */
export const TRICKLE_INTERVAL_MS = 45_000;
export const TRICKLE_CAP = 3;

export class SeedSystem {
  private counts = new Map<string, number>();

  countOf(cropId: string): number {
    return this.counts.get(cropId) ?? 0;
  }

  get total(): number {
    let t = 0;
    for (const n of this.counts.values()) t += n;
    return t;
  }

  /** Adds up to the bag's free space; returns how many were added. */
  add(cropId: string, n: number, capacity: number): number {
    const space = Math.max(0, capacity - this.total);
    const added = Math.max(0, Math.min(n, space));
    if (added > 0) this.counts.set(cropId, this.countOf(cropId) + added);
    return added;
  }

  /** Consumes one seed; false when the bag holds none of that crop. */
  consume(cropId: string): boolean {
    const n = this.countOf(cropId);
    if (n <= 0) return false;
    this.counts.set(cropId, n - 1);
    return true;
  }

  /**
   * The softlock test: true only when the player cannot plant, cannot
   * buy seeds, and has nothing ripe to harvest or anything to sell.
   */
  static shouldTrickle(s: {
    seedsTotal: number;
    coins: number;
    hasRipeCrop: boolean;
    hasSellable: boolean;
  }): boolean {
    return (
      s.seedsTotal < TRICKLE_CAP &&
      s.coins < cheapestPackPrice() &&
      !s.hasRipeCrop &&
      !s.hasSellable
    );
  }

  snapshot(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [id, n] of this.counts) if (n > 0) out[id] = n;
    return out;
  }

  restore(data: Record<string, number> | undefined): void {
    this.counts.clear();
    if (!data) return;
    for (const [id, n] of Object.entries(data)) {
      if (typeof n === 'number' && n > 0) this.counts.set(id, Math.floor(n));
    }
  }
}
