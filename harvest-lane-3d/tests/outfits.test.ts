import { describe, expect, it } from 'vitest';
import {
  OUTFIT_CATEGORIES,
  OUTFIT_ITEMS,
  allOutfitIds,
  outfitItem,
  outfitItemsIn,
} from '../src/data/OutfitData';
import { FARMER_SKINS } from '../src/data/SkinData';

describe('OutfitData', () => {
  it('has five categories and 20+ wearable pieces in total', () => {
    expect(OUTFIT_CATEGORIES.map((c) => c.id)).toEqual(['hat', 'shoes', 'chain', 'glasses']);
    // Shirts (SkinData) plus the attachment items: well over 20.
    expect(FARMER_SKINS.length + OUTFIT_ITEMS.length).toBeGreaterThanOrEqual(20);
    for (const c of OUTFIT_CATEGORIES) {
      expect(outfitItemsIn(c.id).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('prices scale within a category and ids are unique', () => {
    const ids = allOutfitIds();
    expect(new Set(ids).size).toBe(ids.length);
    const chains = outfitItemsIn('chain').filter((i) => i.coins).map((i) => i.coins!);
    expect(chains).toEqual([...chains].sort((a, b) => a - b));
  });

  it('prestige pieces carry gems and level gates', () => {
    const crown = outfitItem('hat-crown')!;
    expect(crown.gems).toBe(5);
    expect(crown.level).toBe(6);
    expect(outfitItem('chain-gem')!.level).toBe(8);
    expect(outfitItem('does-not-exist')).toBeUndefined();
  });
});
