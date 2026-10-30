import Phaser from 'phaser';
import { Customer } from '../entities/Customer';
import { MarketSystem, type Order } from './MarketSystem';

const GATE = { x: 540, y: 1580 };
const QUEUE_Y = 1448;
const SLOTS_X = [756, 840, 924];
const WALK_SPEED = 135;
const FIRST_SPAWN_DELAY_MS = 2600;
const SPAWN_INTERVAL_MS = 9500;
const PATIENCE_MS = 45_000;

/**
 * Customer lifecycle: spawn at the farm gate, walk up the entrance
 * road, queue at the stall with an order bubble, wait while patience
 * lasts, get served from stall stock when at the front, or leave when
 * patience runs out. Departing customers walk back to the gate.
 *
 * Movement is simple waypoint steering; the route (gate, road, apron,
 * queue) crosses no obstacles, so no pathfinding is needed.
 */
// Order pattern cycles deterministically so early pacing is readable.
// Carrot orders are skipped until the South Field unlock makes
// carrots obtainable (see allowCarrot).
const ORDER_PATTERN: Order[] = [
  { itemId: 'corn', quantity: 2 },
  { itemId: 'egg', quantity: 2 },
  { itemId: 'corn', quantity: 4 },
  { itemId: 'milk', quantity: 1 },
  { itemId: 'corn', quantity: 3 },
  { itemId: 'egg', quantity: 3 },
  { itemId: 'milk', quantity: 2 },
  { itemId: 'carrot', quantity: 2 },
  { itemId: 'corn', quantity: 5 },
  { itemId: 'carrot', quantity: 3 },
];

export class CustomerSystem {
  readonly customers: Customer[] = [];
  /** Set true when the South Field unlock makes carrots obtainable. */
  allowCarrot = false;
  private scene: Phaser.Scene;
  private market: MarketSystem;
  private nextSpawnAt: number;
  private variantCounter = 0;
  private orderCounter = 0;
  /** Called when a customer is served: (customer, coinsEarned). */
  onServed: ((customer: Customer, earned: number) => void) | null = null;

  constructor(scene: Phaser.Scene, market: MarketSystem, now: number) {
    this.scene = scene;
    this.market = market;
    this.nextSpawnAt = now + FIRST_SPAWN_DELAY_MS;
  }

  /** Customers currently heading to or waiting in the queue. */
  private queued(): Customer[] {
    return this.customers.filter((c) => c.state === 'toQueue' || c.state === 'waiting');
  }

  spawnNow(): Customer | null {
    if (this.queued().length >= SLOTS_X.length) return null;
    let order = ORDER_PATTERN[this.orderCounter % ORDER_PATTERN.length];
    for (let i = 0; i < ORDER_PATTERN.length && order.itemId === 'carrot' && !this.allowCarrot; i++) {
      this.orderCounter++;
      order = ORDER_PATTERN[this.orderCounter % ORDER_PATTERN.length];
    }
    this.orderCounter++;
    order = { ...order };
    const customer = new Customer(
      this.scene,
      GATE.x,
      GATE.y,
      this.variantCounter++ % 3,
      order,
      PATIENCE_MS,
    );
    customer.waypoints = [{ x: GATE.x, y: QUEUE_Y }, { x: 0, y: QUEUE_Y }];
    this.customers.push(customer);
    this.assignSlots();
    return customer;
  }

  /** Points every queued customer at its current slot position. */
  private assignSlots(): void {
    this.queued().forEach((customer, index) => {
      const slot = { x: SLOTS_X[index], y: QUEUE_Y };
      if (customer.state === 'toQueue') {
        customer.waypoints = [{ x: GATE.x, y: QUEUE_Y }, slot];
      } else {
        customer.waypoints = [slot];
      }
    });
  }

  private sendHome(customer: Customer): void {
    customer.state = 'leaving';
    customer.waypoints = [{ x: GATE.x, y: QUEUE_Y + 8 }, { x: GATE.x, y: GATE.y + 40 }];
  }

  /**
   * Serves the front waiting customer if the stall can fulfil the
   * order. Returns true when a serve happened.
   */
  tryServeFront(): boolean {
    const front = this.queued().find((c) => c.state === 'waiting');
    if (!front) return false;
    const earned = this.market.tryServe(front.order);
    if (earned === 0) return false;
    front.markServed();
    front.showEmote(true);
    this.sendHome(front);
    this.assignSlots();
    if (this.onServed) this.onServed(front, earned);
    return true;
  }

  update(now: number, delta: number): void {
    if (now >= this.nextSpawnAt) {
      if (this.spawnNow()) {
        this.nextSpawnAt = now + SPAWN_INTERVAL_MS;
      } else {
        this.nextSpawnAt = now + 2000; // queue full, retry shortly
      }
    }

    for (let i = this.customers.length - 1; i >= 0; i--) {
      const customer = this.customers[i];
      const target = customer.waypoints[0];
      if (target) {
        const dx = target.x - customer.x;
        const dy = target.y - customer.y;
        const dist = Math.hypot(dx, dy);
        const step = (WALK_SPEED * delta) / 1000;
        if (dist <= Math.max(6, step)) {
          customer.setPosition(target.x, target.y);
          customer.waypoints.shift();
          if (customer.waypoints.length === 0) {
            if (customer.state === 'toQueue') customer.state = 'waiting';
            else if (customer.state === 'leaving') {
              customer.destroy();
              this.customers.splice(i, 1);
              continue;
            }
          }
        } else {
          customer.x += (dx / dist) * step;
          customer.y += (dy / dist) * step;
        }
      }
      customer.setDepth(customer.y + 32);

      if (customer.state === 'waiting') {
        customer.patienceLeftMs -= delta;
        customer.refreshPatience();
        if (customer.patienceLeftMs <= 0) {
          customer.showEmote(false);
          this.sendHome(customer);
          this.assignSlots();
        }
      }
    }
  }
}
