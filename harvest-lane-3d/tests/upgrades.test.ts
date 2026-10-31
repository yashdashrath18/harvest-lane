import { describe, expect, it } from 'vitest';
import { MarketSystem } from '../src/systems/MarketSystem';
import { UpgradeSystem } from '../src/systems/UpgradeSystem';

describe('UpgradeSystem purchases', () => {
  it('buys a level, spends the coins, and applies the effect value', () => {
    const market = new MarketSystem();
    const upgrades = new UpgradeSystem();
    market.addCoins(100);
    expect(upgrades.buy('backpack', market)).toBe(true);
    expect(upgrades.level('backpack')).toBe(1);
    expect(market.coins).toBe(60); // first backpack level costs 40
    expect(upgrades.backpackCapacity()).toBe(16);
  });

  it('refuses a purchase the player cannot afford, changing nothing', () => {
    const market = new MarketSystem();
    const upgrades = new UpgradeSystem();
    market.addCoins(10);
    expect(upgrades.buy('boots', market)).toBe(false);
    expect(upgrades.level('boots')).toBe(0);
    expect(market.coins).toBe(10);
  });

  it('stops at max level and stops charging', () => {
    const market = new MarketSystem();
    const upgrades = new UpgradeSystem();
    market.addCoins(1000);
    expect(upgrades.buy('boots', market)).toBe(true);
    expect(upgrades.buy('boots', market)).toBe(true);
    expect(upgrades.buy('boots', market)).toBe(true);
    expect(upgrades.buy('boots', market)).toBe(false);
    expect(upgrades.level('boots')).toBe(3);
    expect(upgrades.speedMultiplier()).toBeCloseTo(1.36);
    expect(market.coins).toBe(1000 - 35 - 80 - 160);
  });

  it('price multiplier raises serve earnings', () => {
    const market = new MarketSystem();
    market.priceMultiplier = 1.1;
    market.addStock('corn', 2);
    // 2 corn at 6 coins, +10 percent, rounded
    expect(market.tryServe({ itemId: 'corn', quantity: 2 })).toBe(13);
  });
});
