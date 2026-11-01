import { describe, expect, it } from 'vitest';
import { SeedSystem, TRICKLE_CAP } from '../src/systems/SeedSystem';
import { cheapestPackPrice, seedBagCapacity } from '../src/data/SeedData';

describe('SeedSystem', () => {
  it('adds, counts and consumes seeds per crop', () => {
    const s = new SeedSystem();
    expect(s.add('corn', 10, 30)).toBe(10);
    expect(s.countOf('corn')).toBe(10);
    expect(s.total).toBe(10);
    expect(s.consume('corn')).toBe(true);
    expect(s.countOf('corn')).toBe(9);
    expect(s.consume('carrot')).toBe(false);
  });

  it('the bag capacity clamps adds across crop types', () => {
    const s = new SeedSystem();
    expect(s.add('corn', 28, 30)).toBe(28);
    expect(s.add('carrot', 10, 30)).toBe(2);
    expect(s.total).toBe(30);
    expect(s.add('corn', 5, 30)).toBe(0);
  });

  it('bag capacity grows with level from 30', () => {
    expect(seedBagCapacity(1)).toBe(30);
    expect(seedBagCapacity(6)).toBe(40);
    expect(seedBagCapacity(31)).toBe(90);
    expect(seedBagCapacity(99)).toBe(90);
  });

  it('snapshot and restore round trip, junk is dropped', () => {
    const s = new SeedSystem();
    s.add('corn', 7, 30);
    s.add('carrot', 3, 30);
    const q = new SeedSystem();
    q.restore(s.snapshot());
    expect(q.snapshot()).toEqual({ corn: 7, carrot: 3 });
    q.restore({ corn: -2, carrot: 2.9 });
    expect(q.snapshot()).toEqual({ carrot: 2 });
    q.restore(undefined);
    expect(q.total).toBe(0);
  });

  it('anti-softlock trickle fires only in a true dead end', () => {
    const dead = { seedsTotal: 0, coins: 5, hasRipeCrop: false, hasSellable: false };
    expect(SeedSystem.shouldTrickle(dead)).toBe(true);
    // Can afford the cheapest pack: no trickle.
    expect(SeedSystem.shouldTrickle({ ...dead, coins: cheapestPackPrice() })).toBe(false);
    // Something ripe to harvest: no trickle.
    expect(SeedSystem.shouldTrickle({ ...dead, hasRipeCrop: true })).toBe(false);
    // Something to sell: no trickle.
    expect(SeedSystem.shouldTrickle({ ...dead, hasSellable: true })).toBe(false);
    // Already holding the trickle cap: no more.
    expect(SeedSystem.shouldTrickle({ ...dead, seedsTotal: TRICKLE_CAP })).toBe(false);
  });
});
