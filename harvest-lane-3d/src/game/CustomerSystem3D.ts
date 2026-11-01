import * as THREE from 'three';
import { GATE, QUEUE_SLOTS, X, Z } from './Layout';
import { makeCustomer, type CharacterRig } from '../three/models';

export interface Order {
  itemId: string;
  quantity: number;
}

interface Customer {
  rig: CharacterRig;
  order: Order;
  state: 'enter' | 'queue' | 'leave';
  targetX: number;
  targetZ: number;
  patienceMs: number;
  variant: number;
  walkPhase: number;
  bubble: HTMLDivElement;
  bar: HTMLDivElement;
  served: boolean;
}

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
  { itemId: 'cheese', quantity: 1 },
  { itemId: 'cheese', quantity: 2 },
];
const ITEM_ICON: Record<string, string> = { corn: '🌽', carrot: '🥕', egg: '🥚', milk: '🥛', cheese: '🧀' };
const PATIENCE_MS = 45_000;
const SPEED = 3.4;

type Projector = (x: number, y: number, z: number) => { sx: number; sy: number; visible: boolean };

/**
 * The customer queue in 3D: shoppers walk in from the south gate to
 * the stall, wait with an order bubble and a patience bar, and walk
 * away happy or disappointed. Same economy rules as the 2D game.
 */
export class CustomerSystem3D {
  private customers: Customer[] = [];
  private spawnTimerMs = 2_600;
  private orderCursor = 0;
  private patternCursor = 0;
  private serveTimerMs = 0;
  allowCarrot = false;
  /**
   * Cheese orders are offered only when this predicate says the
   * player can actually supply that quantity (owns the churn, and
   * has cheese or milk on hand). Playtest fix, 2026-11-01: gating on
   * churn ownership alone left players facing cheese orders they
   * had no way to fill.
   */
  canOrderCheese: (quantity: number) => boolean = () => false;
  /** Return true when the front customer's order was served. */
  onTryServe: ((order: Order) => boolean) | null = null;
  onServed: ((customerPos: { x: number; z: number }) => void) | null = null;
  onTimeout: ((customerPos: { x: number; z: number }) => void) | null = null;
  /**
   * Customers arrive in waves of three, then the farm gets a calm
   * break before the next wave: a completable rhythm instead of an
   * endless stressful queue. Fired when a wave fully resolves;
   * servedAll is true when nobody timed out.
   */
  onWaveCleared: ((servedAll: boolean) => void) | null = null;
  private elapsedMs = 0;
  private waveSpawned = 0;
  private waveResolved = 0;
  private waveServed = 0;
  private calmUntilMs = 0;

  constructor(
    private scene: THREE.Scene,
    private bubbleLayer: HTMLElement,
    private project: Projector,
  ) {}

  get queueLength(): number {
    return this.customers.filter((c) => c.state !== 'leave').length;
  }

  get activeCount(): number {
    return this.customers.length;
  }

  private nextOrder(): Order {
    for (let tries = 0; tries < ORDER_PATTERN.length; tries++) {
      const order = ORDER_PATTERN[this.patternCursor % ORDER_PATTERN.length];
      this.patternCursor++;
      if (order.itemId === 'carrot' && !this.allowCarrot) continue;
      if (order.itemId === 'cheese' && !this.canOrderCheese(order.quantity)) continue;
      return { ...order };
    }
    return { itemId: 'corn', quantity: 2 };
  }

  private spawn(): void {
    const variant = this.orderCursor % 3;
    this.orderCursor++;
    const rig = makeCustomer(variant);
    const gx = X(GATE.x);
    const gz = Z(GATE.y);
    rig.group.position.set(gx, 0, gz);
    this.scene.add(rig.group);
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const order = this.nextOrder();
    bubble.innerHTML = `<div class="b-row"><span>${ITEM_ICON[order.itemId] ?? ''}</span><span>x${order.quantity}</span></div><div class="b-track"><div class="b-bar"></div></div>`;
    this.bubbleLayer.appendChild(bubble);
    const bar = bubble.querySelector('.b-bar') as HTMLDivElement;
    this.customers.push({
      rig,
      order,
      state: 'enter',
      targetX: gx,
      targetZ: gz,
      patienceMs: PATIENCE_MS,
      variant,
      walkPhase: Math.random() * 6,
      bubble,
      bar,
      served: false,
    });
  }

  private slotPos(index: number): { x: number; z: number } {
    const s = QUEUE_SLOTS[Math.min(index, QUEUE_SLOTS.length - 1)];
    return { x: X(s.x), z: Z(s.y) };
  }

  private resolveWaveCustomer(served: boolean): void {
    this.waveResolved++;
    if (served) this.waveServed++;
    if (this.waveSpawned >= 3 && this.waveResolved >= 3) {
      const servedAll = this.waveServed >= 3;
      this.waveSpawned = 0;
      this.waveResolved = 0;
      this.waveServed = 0;
      this.calmUntilMs = this.elapsedMs + 7_000;
      this.onWaveCleared?.(servedAll);
    }
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.elapsedMs += dtMs;
    this.spawnTimerMs -= dtMs;
    if (this.spawnTimerMs <= 0 && this.queueLength < 3 && this.waveSpawned < 3 && this.elapsedMs >= this.calmUntilMs) {
      this.spawnTimerMs = 9_500;
      this.waveSpawned++;
      this.spawn();
    }

    // Serve attempts against the front customer only.
    this.serveTimerMs -= dtMs;
    const queued = this.customers.filter((c) => c.state !== 'leave');
    const front = queued[0];
    if (front && front.state === 'queue' && this.isAtSlot(front, 0) && this.serveTimerMs <= 0) {
      this.serveTimerMs = 300;
      if (this.onTryServe?.(front.order)) {
        front.served = true;
        front.state = 'leave';
        front.bubble.remove();
        this.resolveWaveCustomer(true);
        this.onServed?.({ x: front.rig.group.position.x, z: front.rig.group.position.z });
      }
    }

    this.customers = this.customers.filter((c) => {
      const pos = c.rig.group.position;
      // Assign movement targets.
      if (c.state === 'enter') {
        const front0 = this.slotPos(queued.indexOf(c));
        // Walk up the path first, then across to the slot.
        if (Math.abs(pos.z - (front0.z + 1.6)) > 0.3 && Math.abs(pos.x - front0.x) > 0.4) {
          c.targetX = pos.x;
          c.targetZ = front0.z + 1.6;
        } else {
          c.targetX = front0.x;
          c.targetZ = front0.z + 1.6;
          if (Math.abs(pos.x - front0.x) < 0.35 && Math.abs(pos.z - (front0.z + 1.6)) < 0.35) {
            c.state = 'queue';
          }
        }
      } else if (c.state === 'queue') {
        const slot = this.slotPos(queued.indexOf(c));
        c.targetX = slot.x;
        c.targetZ = slot.z;
        if (this.isAtSlot(c, queued.indexOf(c))) {
          c.patienceMs -= dtMs;
          c.bar.style.width = `${Math.max(0, (c.patienceMs / PATIENCE_MS) * 100)}%`;
          c.bar.style.background = c.patienceMs < 12_000 ? '#e2574c' : c.patienceMs < 25_000 ? '#f0a13c' : '#57b93c';
          if (c.patienceMs <= 0) {
            c.state = 'leave';
            c.bubble.remove();
            this.resolveWaveCustomer(false);
            this.onTimeout?.({ x: pos.x, z: pos.z });
          }
        }
      } else {
        c.targetX = X(GATE.x);
        c.targetZ = Z(GATE.y) + 2.5;
        if (pos.z > Z(GATE.y) + 2.2) {
          this.scene.remove(c.rig.group);
          return false;
        }
      }

      // Move toward the target with the shared walk cycle.
      const dx = c.targetX - pos.x;
      const dz = c.targetZ - pos.z;
      const dist = Math.hypot(dx, dz);
      const moving = dist > 0.08;
      if (moving) {
        const step = Math.min(dist, SPEED * dt);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        const targetFacing = Math.atan2(dx / dist, dz / dist);
        let diff = targetFacing - c.rig.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.rig.group.rotation.y += diff * Math.min(1, dt * 12);
        c.walkPhase += dt * 10;
      } else if (c.state !== 'leave') {
        // Face the stall (north) while waiting.
        let diff = Math.PI - c.rig.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.rig.group.rotation.y += diff * Math.min(1, dt * 8);
      }
      const swing = moving ? Math.sin(c.walkPhase) * 0.6 : 0;
      c.rig.legL.rotation.x = swing;
      c.rig.legR.rotation.x = -swing;
      c.rig.armL.rotation.x = -swing * 0.8;
      c.rig.armR.rotation.x = swing * 0.8;
      c.rig.body.position.y = 0.78 + (moving ? Math.abs(Math.sin(c.walkPhase)) * 0.06 : 0);

      // Position the order bubble above the head.
      if (c.state !== 'leave') {
        const p = this.project(pos.x, 2.9, pos.z);
        c.bubble.style.left = `${p.sx}px`;
        c.bubble.style.top = `${p.sy}px`;
        c.bubble.style.display = p.visible ? 'block' : 'none';
      }
      return true;
    });
  }

  private isAtSlot(c: Customer, index: number): boolean {
    const slot = this.slotPos(index);
    const pos = c.rig.group.position;
    return Math.abs(pos.x - slot.x) < 0.3 && Math.abs(pos.z - slot.z) < 0.3;
  }
}
