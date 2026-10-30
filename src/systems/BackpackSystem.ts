import { EventBus, GameEvents } from '../game/EventBus';

/**
 * The player's backpack: a capacity-limited inventory keyed by item id.
 * Emits BackpackChanged whenever the contents change so the HUD stays
 * honest. Pure logic, no Phaser objects, so it can be unit tested.
 */
export class BackpackSystem {
  capacity: number;
  private items = new Map<string, number>();
  private totalCount = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  /** Raises (or corrects) the capacity, e.g. after a backpack upgrade. */
  setCapacity(capacity: number): void {
    if (capacity === this.capacity) return;
    this.capacity = capacity;
    this.emitChanged();
  }

  get total(): number {
    return this.totalCount;
  }

  get isFull(): boolean {
    return this.totalCount >= this.capacity;
  }

  countOf(itemId: string): number {
    return this.items.get(itemId) ?? 0;
  }

  /** Adds up to `amount`; returns how many actually fit. */
  add(itemId: string, amount: number): number {
    const space = this.capacity - this.totalCount;
    const added = Math.max(0, Math.min(space, amount));
    if (added > 0) {
      this.items.set(itemId, this.countOf(itemId) + added);
      this.totalCount += added;
      this.emitChanged();
    }
    return added;
  }

  /** Removes up to `amount` of an item; returns how many were removed. */
  remove(itemId: string, amount: number): number {
    const removed = Math.max(0, Math.min(this.countOf(itemId), amount));
    if (removed > 0) {
      this.items.set(itemId, this.countOf(itemId) - removed);
      this.totalCount -= removed;
      this.emitChanged();
    }
    return removed;
  }

  /** Save snapshot: item id to count, for everything carried. */
  snapshot(): Record<string, number> {
    const out: Record<string, number> = {};
    this.items.forEach((count, itemId) => {
      if (count > 0) out[itemId] = count;
    });
    return out;
  }

  /**
   * Restores a snapshot through add(), so capacity rules still hold:
   * if upgrades were not restored first, overflow is simply not
   * carried rather than breaking the capacity invariant.
   */
  restore(data: Record<string, number>): void {
    this.items.clear();
    this.totalCount = 0;
    Object.entries(data).forEach(([itemId, count]) => this.add(itemId, count));
    this.emitChanged();
  }

  private emitChanged(): void {
    EventBus.emit(GameEvents.BackpackChanged, this.totalCount, this.capacity);
  }
}
