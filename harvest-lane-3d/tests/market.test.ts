import { describe, expect, it } from 'vitest';
import { MarketSystem } from '../src/systems/MarketSystem';

describe('MarketSystem', () => {
  it('tracks stock per item', () => {
    const market = new MarketSystem();
    market.addStock('corn', 5);
    market.addStock('corn', 2);
    expect(market.stockOf('corn')).toBe(7);
    expect(market.stockOf('egg')).toBe(0);
  });

  it('serves a full order and pays quantity times sell price', () => {
    const market = new MarketSystem();
    market.addStock('corn', 6);
    // Corn sell price is 6 coins (src/data/CropData.ts).
    const earned = market.tryServe({ itemId: 'corn', quantity: 4 });
    expect(earned).toBe(24);
    expect(market.coins).toBe(24);
    expect(market.stockOf('corn')).toBe(2);
  });

  it('refuses a partial order and changes nothing', () => {
    const market = new MarketSystem();
    market.addStock('corn', 2);
    const earned = market.tryServe({ itemId: 'corn', quantity: 5 });
    expect(earned).toBe(0);
    expect(market.coins).toBe(0);
    expect(market.stockOf('corn')).toBe(2);
  });

  it('serves to the cash pile and collects it into the wallet once', () => {
    const market = new MarketSystem();
    market.addStock('corn', 6);
    const earned = market.tryServe({ itemId: 'corn', quantity: 4 }, true);
    expect(earned).toBe(24);
    expect(market.coins).toBe(0);
    expect(market.pendingCash).toBe(24);
    market.addPendingCash(6);
    expect(market.collectPendingCash()).toBe(30);
    expect(market.coins).toBe(30);
    expect(market.pendingCash).toBe(0);
    expect(market.collectPendingCash()).toBe(0);
  });

  it('pending cash survives a snapshot round trip', () => {
    const market = new MarketSystem();
    market.addStock('egg', 3);
    market.tryServe({ itemId: 'egg', quantity: 2 }, true);
    const restored = new MarketSystem();
    restored.restore(market.snapshot());
    expect(restored.pendingCash).toBe(market.pendingCash);
    expect(restored.pendingCash).toBeGreaterThan(0);
  });
});
