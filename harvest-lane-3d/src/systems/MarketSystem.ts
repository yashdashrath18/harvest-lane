import { ITEM_PRICES } from '../data/ItemData';
import { EventBus, GameEvents } from '../game/EventBus';

export interface Order {
  itemId: string;
  quantity: number;
}

/**
 * Market stall state: stock on the stall and the player's coins.
 * Serving an order is atomic: it only succeeds when the full quantity
 * is in stock, and it pays quantity times the item's sell price.
 * Pure logic over the EventBus, unit tested without a running game.
 */
export class MarketSystem {
  coins = 0;
  gems = 0;
  /**
   * Cash earned at the stall but not yet collected: it piles up
   * physically by the stall until the farmer walks over it.
   */
  pendingCash = 0;
  /** Sell price multiplier from upgrades; 1 is base prices. */
  priceMultiplier = 1;
  private stock = new Map<string, number>();

  stockOf(itemId: string): number {
    return this.stock.get(itemId) ?? 0;
  }

  addCoins(amount: number): void {
    if (amount <= 0) return;
    this.coins += amount;
    EventBus.emit(GameEvents.CoinsChanged, this.coins);
  }

  /** Spends coins if the balance covers it. Returns success. */
  spendCoins(amount: number): boolean {
    if (amount < 0 || this.coins < amount) return false;
    this.coins -= amount;
    EventBus.emit(GameEvents.CoinsChanged, this.coins);
    return true;
  }

  addGems(amount: number): void {
    if (amount <= 0) return;
    this.gems += amount;
    EventBus.emit(GameEvents.GemsChanged, this.gems);
  }

  /** Spends gems if the balance covers it. Returns success. */
  spendGems(amount: number): boolean {
    if (amount < 0 || this.gems < amount) return false;
    this.gems -= amount;
    EventBus.emit(GameEvents.GemsChanged, this.gems);
    return true;
  }

  addStock(itemId: string, amount: number): void {
    if (amount <= 0) return;
    this.stock.set(itemId, this.stockOf(itemId) + amount);
    EventBus.emit(GameEvents.StockChanged, itemId, this.stockOf(itemId));
  }

  /**
   * Attempts to fulfil an order from stock. On success, removes the
   * stock and returns the amount earned. With `toPile` the money
   * lands on the stall's cash pile instead of in the wallet, until
   * collectPendingCash() is called. On failure nothing changes and
   * 0 is returned.
   */
  tryServe(order: Order, toPile = false): number {
    if (this.stockOf(order.itemId) < order.quantity) return 0;
    const price = ITEM_PRICES[order.itemId] ?? 0;
    const earned = Math.round(order.quantity * price * this.priceMultiplier);
    this.stock.set(order.itemId, this.stockOf(order.itemId) - order.quantity);
    EventBus.emit(GameEvents.StockChanged, order.itemId, this.stockOf(order.itemId));
    if (toPile) {
      this.pendingCash += earned;
      EventBus.emit(GameEvents.CashPileChanged, this.pendingCash);
    } else {
      this.addCoins(earned);
    }
    return earned;
  }

  /** Adds cash straight onto the pile (for example a wave bonus). */
  addPendingCash(amount: number): void {
    if (amount <= 0) return;
    this.pendingCash += amount;
    EventBus.emit(GameEvents.CashPileChanged, this.pendingCash);
  }

  /** Moves the whole pile into the wallet. Returns what was collected. */
  collectPendingCash(): number {
    const amount = this.pendingCash;
    if (amount <= 0) return 0;
    this.pendingCash = 0;
    EventBus.emit(GameEvents.CashPileChanged, 0);
    this.addCoins(amount);
    return amount;
  }

  /** Save snapshot: wallet, stall stock and the uncollected cash pile. */
  snapshot(): { coins: number; gems: number; stock: Record<string, number>; pendingCash: number } {
    const stock: Record<string, number> = {};
    this.stock.forEach((count, itemId) => {
      if (count > 0) stock[itemId] = count;
    });
    return { coins: this.coins, gems: this.gems, stock, pendingCash: this.pendingCash };
  }

  /** Restores a snapshot, notifying every listener of the new state. */
  restore(data: { coins: number; gems: number; stock: Record<string, number>; pendingCash?: number }): void {
    this.coins = data.coins;
    this.gems = data.gems;
    this.pendingCash = typeof data.pendingCash === 'number' && data.pendingCash > 0 ? Math.floor(data.pendingCash) : 0;
    this.stock.clear();
    Object.entries(data.stock).forEach(([itemId, count]) => {
      if (count > 0) this.stock.set(itemId, count);
    });
    EventBus.emit(GameEvents.CoinsChanged, this.coins);
    EventBus.emit(GameEvents.GemsChanged, this.gems);
    EventBus.emit(GameEvents.CashPileChanged, this.pendingCash);
    Object.keys(ITEM_PRICES).forEach((itemId) => {
      EventBus.emit(GameEvents.StockChanged, itemId, this.stockOf(itemId));
    });
  }
}
