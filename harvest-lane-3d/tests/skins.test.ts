import { describe, it, expect } from 'vitest';
import { FARMER_SKINS, WEATHER_SKINS, ROAD_SKINS, DEFAULT_COSMETICS, allSkinIds, skinPrice } from '../src/data/SkinData';
import { MarketSystem } from '../src/systems/MarketSystem';

describe('SkinData catalogue', () => {
  it('has unique ids across all categories', () => {
    const ids = allSkinIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the three defaults are free and owned by default', () => {
    for (const id of DEFAULT_COSMETICS.owned) {
      expect(skinPrice(id === 'classic' ? 'farmer' : id === 'day' ? 'weather' : 'road', id)).toEqual({});
    }
    expect(DEFAULT_COSMETICS.farmer).toBe('classic');
    expect(FARMER_SKINS[0].id).toBe('classic');
    expect(WEATHER_SKINS[0].id).toBe('day');
    expect(ROAD_SKINS[0].id).toBe('sand');
  });

  it('premium skins cost gems and standard skins cost coins', () => {
    expect(FARMER_SKINS.find((s) => s.id === 'golden')!.price.gems).toBeGreaterThan(0);
    expect(FARMER_SKINS.find((s) => s.id === 'ocean')!.price.coins).toBeGreaterThan(0);
    expect(ROAD_SKINS.find((s) => s.id === 'brick')!.price.gems).toBeGreaterThan(0);
  });
});

describe('MarketSystem gem spending', () => {
  it('spendGems respects the balance', () => {
    const m = new MarketSystem();
    m.addGems(5);
    expect(m.spendGems(6)).toBe(false);
    expect(m.gems).toBe(5);
    expect(m.spendGems(4)).toBe(true);
    expect(m.gems).toBe(1);
  });
});
