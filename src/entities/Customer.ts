import Phaser from 'phaser';
import type { Order } from '../systems/MarketSystem';

export type CustomerState = 'toQueue' | 'waiting' | 'leaving';

/**
 * One NPC customer: a container holding the body sprite, a ground
 * shadow, and an order bubble (item icon, quantity, patience bar).
 * Movement and lifecycle are driven by CustomerSystem; this class is
 * the visual and its order/patience state.
 */
export class Customer extends Phaser.GameObjects.Container {
  readonly order: Order;
  readonly patienceTotalMs: number;
  patienceLeftMs: number;
  state: CustomerState;
  served: boolean;
  waypoints: Array<{ x: number; y: number }>;

  private patienceFill: Phaser.GameObjects.Rectangle;
  private bubble: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, variant: number, order: Order, patienceMs: number) {
    const shadow = scene.add.ellipse(0, 30, 34, 12, 0x000000, 0.2);
    const body = scene.add.image(0, 0, `customer-${variant}`);

    const bubbleBg = scene.add.image(0, 0, 'bubble');
    const icon = scene.add.image(-24, -6, `icon-${order.itemId}`);
    const qty = scene.add
      .text(2, -6, `x${order.quantity}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#333333',
      })
      .setOrigin(0, 0.5);
    const barBg = scene.add.rectangle(0, 14, 64, 6, 0x000000, 0.15);
    const patienceFill = scene.add
      .rectangle(-32, 14, 64, 6, 0x7ec850, 1)
      .setOrigin(0, 0.5);
    const bubble = scene.add.container(0, -96, [bubbleBg, icon, qty, barBg, patienceFill]);

    super(scene, x, y, [shadow, body, bubble]);
    this.order = order;
    this.patienceTotalMs = patienceMs;
    this.patienceLeftMs = patienceMs;
    this.state = 'toQueue';
    this.served = false;
    this.waypoints = [];
    this.patienceFill = patienceFill;
    this.bubble = bubble;
    scene.add.existing(this);
  }

  /** Shrinks the patience bar and warms its colour as time runs out. */
  refreshPatience(): void {
    const frac = Math.max(0, this.patienceLeftMs / this.patienceTotalMs);
    this.patienceFill.setScale(frac, 1);
    this.patienceFill.setFillStyle(frac > 0.5 ? 0x7ec850 : frac > 0.25 ? 0xf2c14e : 0xe2574c, 1);
  }

  /** Marks the order fulfilled: the bubble is hidden as they leave. */
  markServed(): void {
    this.served = true;
    this.bubble.setVisible(false);
  }

  /** Pops a happy or disappointed reaction face above the customer. */
  showEmote(happy: boolean): void {
    const emote = this.scene.add
      .image(0, -104, happy ? 'emote-happy' : 'emote-sad')
      .setScale(0.4)
      .setDepth(50);
    this.add(emote);
    this.scene.tweens.add({
      targets: emote,
      scale: 1,
      y: -116,
      duration: 180,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: emote,
      alpha: 0,
      delay: 750,
      duration: 250,
      onComplete: () => emote.destroy(),
    });
  }
}
