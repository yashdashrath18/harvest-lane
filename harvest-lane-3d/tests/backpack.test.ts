import { describe, expect, it } from 'vitest';
import { BackpackSystem } from '../src/systems/BackpackSystem';

// BackpackSystem talks to the global EventBus, which is a plain Phaser
// EventEmitter; it constructs fine outside a running game.
describe('BackpackSystem', () => {
  it('adds items and tracks totals per item', () => {
    const bag = new BackpackSystem(10);
    expect(bag.add('corn', 3)).toBe(3);
    expect(bag.add('corn', 2)).toBe(2);
    expect(bag.total).toBe(5);
    expect(bag.countOf('corn')).toBe(5);
    expect(bag.isFull).toBe(false);
  });

  it('caps at capacity and reports how many actually fit', () => {
    const bag = new BackpackSystem(4);
    expect(bag.add('corn', 3)).toBe(3);
    expect(bag.add('corn', 5)).toBe(1);
    expect(bag.total).toBe(4);
    expect(bag.isFull).toBe(true);
    expect(bag.add('corn', 1)).toBe(0);
  });

  it('removes items without going below zero', () => {
    const bag = new BackpackSystem(10);
    bag.add('corn', 4);
    expect(bag.remove('corn', 3)).toBe(3);
    expect(bag.remove('corn', 9)).toBe(1);
    expect(bag.total).toBe(0);
    expect(bag.countOf('corn')).toBe(0);
  });
});
