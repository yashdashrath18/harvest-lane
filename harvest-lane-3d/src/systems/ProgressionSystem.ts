import { MAX_LEVEL, capacityBonusFor, xpForNextLevel } from '../data/LevelData';

/**
 * Farm levels and XP. Every core action earns XP (values in
 * data/LevelData.ts); levelling up pays gems and permanently raises
 * backpack capacity (+1 per level to 20, then every 2 levels), so a
 * level-up is felt in the hands, not just seen as a number. The curve
 * is round(50 * 1.35^(level-1)) with a level cap of 50. Pure logic.
 */
export class ProgressionSystem {
  xp = 0;

  /** XP needed to advance from `level` to `level + 1`. */
  static xpForNext(level: number): number {
    return xpForNextLevel(level);
  }

  /** The level a total-XP value corresponds to (levels start at 1, cap 50). */
  static levelFor(xp: number): number {
    let level = 1;
    let rest = xp;
    while (level < MAX_LEVEL && rest >= ProgressionSystem.xpForNext(level)) {
      rest -= ProgressionSystem.xpForNext(level);
      level++;
    }
    return level;
  }

  get level(): number {
    return ProgressionSystem.levelFor(this.xp);
  }

  /** XP accumulated inside the current level. */
  get xpIntoLevel(): number {
    let rest = this.xp;
    let level = 1;
    while (level < MAX_LEVEL && rest >= ProgressionSystem.xpForNext(level)) {
      rest -= ProgressionSystem.xpForNext(level);
      level++;
    }
    return rest;
  }

  /** Progress through the current level, 0..1, for the HUD bar. */
  get levelFraction(): number {
    return this.xpIntoLevel / ProgressionSystem.xpForNext(this.level);
  }

  /** Permanent backpack capacity bonus from levels (data/LevelData rule). */
  get capacityBonus(): number {
    return capacityBonusFor(this.level);
  }

  /** Gems paid per level gained. */
  static gemsPerLevel = 2;

  /** Adds XP; returns how many levels were gained. */
  gain(amount: number): { levelsGained: number; level: number } {
    if (amount <= 0) return { levelsGained: 0, level: this.level };
    const before = this.level;
    this.xp += Math.floor(amount);
    const after = this.level;
    return { levelsGained: after - before, level: after };
  }

  snapshot(): { xp: number } {
    return { xp: this.xp };
  }

  restore(data: { xp: number }): void {
    this.xp = typeof data?.xp === 'number' && data.xp > 0 ? Math.floor(data.xp) : 0;
  }
}
