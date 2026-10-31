import { describe, expect, it } from 'vitest';
import { ProgressionSystem } from '../src/systems/ProgressionSystem';
import { totalXpForLevel } from '../src/data/LevelData';

describe('ProgressionSystem', () => {
  it('starts at level 1 with no capacity bonus', () => {
    const p = new ProgressionSystem();
    expect(p.level).toBe(1);
    expect(p.capacityBonus).toBe(0);
    expect(p.levelFraction).toBe(0);
  });

  it('levels up at the threshold and reports the gain', () => {
    const p = new ProgressionSystem();
    const need = ProgressionSystem.xpForNext(1);
    expect(p.gain(need - 1).levelsGained).toBe(0);
    expect(p.level).toBe(1);
    const res = p.gain(1);
    expect(res.levelsGained).toBe(1);
    expect(res.level).toBe(2);
    expect(p.capacityBonus).toBe(1);
  });

  it('thresholds grow with level and big gains skip levels', () => {
    expect(ProgressionSystem.xpForNext(5)).toBeGreaterThan(ProgressionSystem.xpForNext(2));
    const p = new ProgressionSystem();
    const res = p.gain(100_000);
    expect(res.levelsGained).toBeGreaterThan(5);
    expect(p.levelFraction).toBeGreaterThanOrEqual(0);
    expect(p.levelFraction).toBeLessThan(1);
  });

  it('capacity bonus follows the LevelData rule and the level caps at 50', () => {
    const p = new ProgressionSystem();
    p.gain(totalXpForLevel(50));
    expect(p.level).toBe(50);
    // +1 per level to 20 (19), then +1 every 2 levels (15 more by 50).
    expect(p.capacityBonus).toBe(34);
    // Far past the cap the level still holds at 50.
    p.gain(10_000_000);
    expect(p.level).toBe(50);
  });

  it('uses the master curve: 50 XP to level 2, 1986 total to level 10', () => {
    expect(ProgressionSystem.xpForNext(1)).toBe(50);
    expect(ProgressionSystem.xpForNext(2)).toBe(68);
    const p = new ProgressionSystem();
    p.gain(1985);
    expect(p.level).toBe(9);
    p.gain(1);
    expect(p.level).toBe(10);
  });

  it('snapshot and restore round trip, bad data becomes zero', () => {
    const p = new ProgressionSystem();
    p.gain(123);
    const q = new ProgressionSystem();
    q.restore(p.snapshot());
    expect(q.xp).toBe(123);
    q.restore({ xp: -5 });
    expect(q.xp).toBe(0);
  });
});
