import {
  BACKPACK_CAPACITIES,
  GROWTH_PER_LEVEL,
  PRICE_PER_LEVEL,
  SPEED_PER_LEVEL,
  UPGRADE_TRACKS,
  type UpgradeTrack,
} from '../data/UpgradeData';
import type { MarketSystem } from './MarketSystem';

export interface UpgradeRowState {
  id: string;
  name: string;
  blurb: string;
  level: number;
  maxLevel: number;
  nextCost: number | null;
  effectNow: string;
  effectNext: string | null;
}

/**
 * Owned upgrade levels and purchase logic. Pure logic: buying checks
 * the track, the max level and the wallet, and only then spends.
 * Effects are exposed as computed values; the game scene applies them
 * to the live systems after every purchase.
 */
export class UpgradeSystem {
  private levels = new Map<string, number>();

  level(id: string): number {
    return this.levels.get(id) ?? 0;
  }

  /** Save snapshot: track id to owned level (nonzero only). */
  snapshot(): Record<string, number> {
    const out: Record<string, number> = {};
    this.levels.forEach((level, id) => {
      if (level > 0) out[id] = level;
    });
    return out;
  }

  /** Restores levels, ignoring unknown tracks and clamping to max. */
  restore(data: Record<string, number>): void {
    this.levels.clear();
    UPGRADE_TRACKS.forEach((track) => {
      const wanted = data[track.id];
      if (typeof wanted === 'number' && wanted > 0) {
        this.levels.set(track.id, Math.min(Math.floor(wanted), track.costs.length));
      }
    });
  }

  track(id: string): UpgradeTrack | undefined {
    return UPGRADE_TRACKS.find((t) => t.id === id);
  }

  nextCost(id: string): number | null {
    const track = this.track(id);
    if (!track) return null;
    const lvl = this.level(id);
    return lvl >= track.costs.length ? null : track.costs[lvl];
  }

  /** Attempts a purchase. Returns true only when it went through. */
  buy(id: string, market: MarketSystem): boolean {
    const cost = this.nextCost(id);
    if (cost === null) return false;
    if (!market.spendCoins(cost)) return false;
    this.levels.set(id, this.level(id) + 1);
    return true;
  }

  backpackCapacity(): number {
    return BACKPACK_CAPACITIES[this.level('backpack')];
  }

  speedMultiplier(): number {
    return 1 + SPEED_PER_LEVEL * this.level('boots');
  }

  growthFactor(): number {
    return 1 + GROWTH_PER_LEVEL * this.level('fertilizer');
  }

  priceMultiplier(): number {
    return 1 + PRICE_PER_LEVEL * this.level('charm');
  }

  /** Shop-ready snapshot of every track, with honest effect strings. */
  describe(): UpgradeRowState[] {
    return UPGRADE_TRACKS.map((track) => {
      const level = this.level(track.id);
      const maxLevel = track.costs.length;
      return {
        id: track.id,
        name: track.name,
        blurb: track.blurb,
        level,
        maxLevel,
        nextCost: this.nextCost(track.id),
        effectNow: this.effectText(track.id, level),
        effectNext: level < maxLevel ? this.effectText(track.id, level + 1) : null,
      };
    });
  }

  private effectText(id: string, level: number): string {
    switch (id) {
      case 'backpack':
        return `Capacity ${BACKPACK_CAPACITIES[level]}`;
      case 'boots':
        return `Speed +${Math.round(SPEED_PER_LEVEL * level * 100)}%`;
      case 'fertilizer':
        return `Growth +${Math.round(GROWTH_PER_LEVEL * level * 100)}%`;
      case 'charm':
        return `Prices +${Math.round(PRICE_PER_LEVEL * level * 100)}%`;
      default:
        return '';
    }
  }
}
