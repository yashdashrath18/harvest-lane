import { describe, expect, it } from 'vitest';
import {
  UNLOCKS,
  XP_VALUES,
  capacityBonusFor,
  contractClaimXp,
  isUnlocked,
  missionClaimXp,
  totalXpForLevel,
  unlockLevel,
  unlocksAt,
  xpForNextLevel,
} from '../src/data/LevelData';

describe('LevelData', () => {
  it('curve grows by 1.35x per level and totals about 2000 XP at level 10', () => {
    expect(xpForNextLevel(1)).toBe(50);
    expect(xpForNextLevel(3)).toBe(91);
    expect(totalXpForLevel(10)).toBeGreaterThan(1900);
    expect(totalXpForLevel(10)).toBeLessThan(2100);
    expect(totalXpForLevel(1)).toBe(0);
  });

  it('capacity bonus: +1 per level to 20, then every 2 levels', () => {
    expect(capacityBonusFor(1)).toBe(0);
    expect(capacityBonusFor(2)).toBe(1);
    expect(capacityBonusFor(20)).toBe(19);
    expect(capacityBonusFor(21)).toBe(19);
    expect(capacityBonusFor(22)).toBe(20);
    expect(capacityBonusFor(50)).toBe(34);
  });

  it('the unlock table gates the hotel at level 10 and churn at 6', () => {
    expect(unlocksAt(10).map((u) => u.id)).toContain('hotel');
    expect(unlockLevel('hotel')).toBe(10);
    expect(unlockLevel('churn')).toBe(6);
    expect(unlockLevel('south-field')).toBe(3);
    expect(isUnlocked('hotel', 9)).toBe(false);
    expect(isUnlocked('hotel', 10)).toBe(true);
    expect(isUnlocked('nonexistent', 1)).toBe(true);
    // Every gated level in the table is within the level cap.
    for (const lvl of Object.keys(UNLOCKS)) {
      expect(Number(lvl)).toBeGreaterThanOrEqual(2);
      expect(Number(lvl)).toBeLessThanOrEqual(10);
    }
  });

  it('claim XP stays in range and scales', () => {
    expect(missionClaimXp(0, 0)).toBe(XP_VALUES.missionMin);
    expect(missionClaimXp(100000, 100000)).toBe(XP_VALUES.missionMax);
    expect(missionClaimXp(120, 0)).toBe(37);
    expect(contractClaimXp(1)).toBe(30);
    expect(contractClaimXp(4)).toBe(45);
    expect(XP_VALUES.dailyClaim).toBe(20);
  });
});
