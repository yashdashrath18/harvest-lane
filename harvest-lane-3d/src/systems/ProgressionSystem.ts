/**
 * Farm levels and XP. Every core action earns XP (harvest, collect,
 * serve); levelling up pays gems and permanently raises backpack
 * capacity by 1 per level (capped at +10), so a level-up is felt in
 * the hands, not just seen as a number. Pure logic, unit tested.
 */
export class ProgressionSystem {
  xp = 0;

  /** XP needed to advance from `level` to `level + 1`. */
  static xpForNext(level: number): number {
    return Math.round(40 * Math.pow(level, 1.32));
  }

  /** The level a total-XP value corresponds to (levels start at 1). */
  static levelFor(xp: number): number {
    let level = 1;
    let rest = xp;
    while (rest >= ProgressionSystem.xpForNext(level)) {
      rest -= ProgressionSystem.xpForNext(level);
      level++;
    }
    return level;
  }

  get level(): number {
    return ProgressionSystem.levelFor(this.xp);
  }

  /** Progress through the current level, 0..1, for the HUD bar. */
  get levelFraction(): number {
    let rest = this.xp;
    let level = 1;
    while (rest >= ProgressionSystem.xpForNext(level)) {
      rest -= ProgressionSystem.xpForNext(level);
      level++;
    }
    return rest / ProgressionSystem.xpForNext(level);
  }

  /** Permanent backpack capacity bonus from levels: +1 per level past 1, capped at +10. */
  get capacityBonus(): number {
    return Math.min(10, this.level - 1);
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
