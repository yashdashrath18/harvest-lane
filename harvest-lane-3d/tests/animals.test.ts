import { describe, expect, it } from 'vitest';
import {
  COW_MAX_TIER,
  HEN_MAX_TIER,
  cowLevel,
  cowPrice,
  henLevel,
  henPrice,
  troughCapacity,
} from '../src/data/AnimalData';

describe('AnimalData', () => {
  it('hen prices scale 80 x 1.6^n and gates start at level 2', () => {
    expect(henPrice(0)).toBe(80);
    expect(henPrice(1)).toBe(128);
    expect(henPrice(2)).toBe(205);
    expect(henPrice(8)).toBe(3436);
    expect(henLevel(0)).toBe(2);
    expect(henLevel(8)).toBe(10);
    expect(HEN_MAX_TIER).toBe(9); // 3 + 9 = 12 hens
  });

  it('cow prices scale 200 x 1.7^n and gates start at level 5', () => {
    expect(cowPrice(0)).toBe(200);
    expect(cowPrice(1)).toBe(340);
    expect(cowPrice(5)).toBe(2840);
    expect(cowLevel(0)).toBe(5);
    expect(cowLevel(5)).toBe(10);
    expect(COW_MAX_TIER).toBe(6); // 2 + 6 = 8 cows
  });

  it('trough capacity grows by 5 per tier from 20', () => {
    expect(troughCapacity(0)).toBe(20);
    expect(troughCapacity(3)).toBe(35);
    expect(troughCapacity(9)).toBe(65);
  });
});
