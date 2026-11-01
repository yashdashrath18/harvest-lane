import { describe, expect, it } from 'vitest';
import {
  EAST_FIELD,
  LAND_PACK_COUNT,
  LAND_PACK_LEVELS,
  PLOTS_PER_PACK,
  landPackLevel,
  landPackPrice,
} from '../src/data/LandData';

describe('LandData', () => {
  it('pack prices scale by 1.5x from 120', () => {
    expect(landPackPrice(0)).toBe(120);
    expect(landPackPrice(1)).toBe(180);
    expect(landPackPrice(2)).toBe(270);
    expect(landPackPrice(3)).toBe(405);
    expect(landPackPrice(5)).toBe(911);
  });

  it('six packs of eight plots, gated 4, 5, 7, 8, 9, 10', () => {
    expect(LAND_PACK_COUNT).toBe(6);
    expect(PLOTS_PER_PACK).toBe(8);
    expect(LAND_PACK_LEVELS).toEqual([4, 5, 7, 8, 9, 10]);
    expect(landPackLevel(0)).toBe(4);
    expect(landPackLevel(5)).toBe(10);
  });

  it('the East Field is a level 7 one-time purchase of 60 plots', () => {
    expect(EAST_FIELD.level).toBe(7);
    expect(EAST_FIELD.price).toBe(800);
    expect(EAST_FIELD.plots).toBe(60);
  });
});
