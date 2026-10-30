import Phaser from 'phaser';
import type { BackpackSystem } from './BackpackSystem';

export interface PenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Animal {
  sprite: Phaser.GameObjects.Image;
  kind: 'chicken' | 'cow';
  pen: PenRect;
  targetX: number;
  targetY: number;
  waitUntil: number;
  nextProduceAt: number;
  produceIntervalMs: number;
}

interface Pickup {
  sprite: Phaser.GameObjects.Image;
  itemId: string;
}

const CHICKEN_PRODUCE_MS = 13_000;
const COW_PRODUCE_MS = 21_000;
const MAX_EGGS = 6;
const MAX_MILK = 4;
const PICKUP_RANGE = 30;

/**
 * Chickens and cows: they wander their pens, idle with peck and graze
 * frames, and produce eggs and milk on timers. Produce appears on the
 * ground and is collected by walking over it, respecting backpack
 * capacity like every other item.
 */
export class AnimalSystem {
  readonly pickups: Pickup[] = [];
  private animals: Animal[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, chickenPen: PenRect, cowPen: PenRect, now: number) {
    this.scene = scene;
    const spawn = (kind: 'chicken' | 'cow', pen: PenRect, i: number, count: number) => {
      const x = pen.x + pen.w * ((i + 1) / (count + 1));
      const y = pen.y + pen.h * (0.35 + 0.3 * ((i * 7) % 3) / 2);
      const sprite = scene.add.image(x, y, kind === 'chicken' ? 'chicken-0' : 'cow-0');
      sprite.setDepth(y + 20);
      this.animals.push({
        sprite,
        kind,
        pen,
        targetX: x,
        targetY: y,
        waitUntil: now + 1000 + i * 700,
        nextProduceAt: now + (kind === 'chicken' ? 6000 + i * 4000 : 10000 + i * 6000),
        produceIntervalMs: kind === 'chicken' ? CHICKEN_PRODUCE_MS : COW_PRODUCE_MS,
      });
    };
    for (let i = 0; i < 3; i++) spawn('chicken', chickenPen, i, 3);
    for (let i = 0; i < 2; i++) spawn('cow', cowPen, i, 2);
  }

  get animalCount(): number {
    return this.animals.length;
  }

  /** The kind of the closest animal within range, for ambient sound. */
  nearestKind(x: number, y: number, range: number): 'chicken' | 'cow' | null {
    let best: 'chicken' | 'cow' | null = null;
    let bestDist = range;
    this.animals.forEach((animal) => {
      const d = Phaser.Math.Distance.Between(x, y, animal.sprite.x, animal.sprite.y);
      if (d < bestDist) {
        bestDist = d;
        best = animal.kind;
      }
    });
    return best;
  }

  countOnGround(itemId: string): number {
    return this.pickups.filter((p) => p.itemId === itemId).length;
  }

  update(
    now: number,
    delta: number,
    playerX: number,
    playerY: number,
    backpack: BackpackSystem,
    onCollect: (itemId: string, x: number, y: number) => void,
    onFullBag: (x: number, y: number) => void,
  ): void {
    this.animals.forEach((animal) => {
      const sprite = animal.sprite;
      // Production
      if (now >= animal.nextProduceAt) {
        animal.nextProduceAt = now + animal.produceIntervalMs;
        const itemId = animal.kind === 'chicken' ? 'egg' : 'milk';
        const cap = animal.kind === 'chicken' ? MAX_EGGS : MAX_MILK;
        if (this.countOnGround(itemId) < cap) {
          const pickupSprite = this.scene.add
            .image(sprite.x + 14, sprite.y + 16, itemId === 'egg' ? 'egg' : 'milk-can')
            .setDepth(sprite.y + 16);
          this.pickups.push({ sprite: pickupSprite, itemId });
        }
      }
      // Wander and idle
      if (now < animal.waitUntil) {
        const cycle = animal.kind === 'chicken' ? 450 : 900;
        const frame = Math.floor(now / cycle) % 2;
        sprite.setTexture(`${animal.kind}-${frame}`);
        return;
      }
      const dx = animal.targetX - sprite.x;
      const dy = animal.targetY - sprite.y;
      const dist = Math.hypot(dx, dy);
      const speed = animal.kind === 'chicken' ? 30 : 18;
      const step = (speed * delta) / 1000;
      if (dist <= Math.max(4, step)) {
        sprite.setPosition(animal.targetX, animal.targetY);
        animal.waitUntil = now + 1600 + Math.random() * 2400;
        const margin = 34;
        animal.targetX =
          animal.pen.x + margin + Math.random() * (animal.pen.w - margin * 2);
        animal.targetY =
          animal.pen.y + margin + Math.random() * (animal.pen.h - margin * 2);
      } else {
        sprite.x += (dx / dist) * step;
        sprite.y += (dy / dist) * step;
        sprite.setDepth(sprite.y + 20);
        sprite.setTexture(`${animal.kind}-0`);
        if (animal.kind === 'chicken') sprite.setFlipX(dx < 0);
      }
    });

    // Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      const dist = Phaser.Math.Distance.Between(playerX, playerY, pickup.sprite.x, pickup.sprite.y);
      if (dist > PICKUP_RANGE) continue;
      const added = backpack.add(pickup.itemId, 1);
      if (added > 0) {
        onCollect(pickup.itemId, pickup.sprite.x, pickup.sprite.y);
        pickup.sprite.destroy();
        this.pickups.splice(i, 1);
      } else {
        onFullBag(pickup.sprite.x, pickup.sprite.y);
      }
    }
  }
}
