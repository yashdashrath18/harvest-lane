import Phaser from 'phaser';
import { joystickVector, type JoystickVector } from '../utils/MathUtils';

const RADIUS = 55;
const ENGAGE_DISTANCE = 10;
const HUD_BAR_HEIGHT = 72;
// The on-screen action buttons live in the bottom corners of the
// HUD (design coordinates): HARVEST bottom-right, SHOP and TASKS
// bottom-left. Presses there belong to the buttons, not the joystick,
// in the same way as presses on the top bar.
const BUTTON_ZONE = { minX: 396, minY: 726 };
const LEFT_BUTTON_ZONE = { maxX: 144, minY: 640 };
const GEAR_ZONE = { minX: 472, minY: 56, maxY: 128 };

/**
 * Floating virtual joystick. It appears where the player's finger or
 * mouse presses (below the HUD bar) and follows the drag: the base sits
 * at the press point and the knob tracks within a fixed radius, giving
 * analogue speed control. Releasing returns the vector to rest.
 *
 * A quick press-and-release without dragging is NOT a joystick gesture;
 * `isTapRelease` lets the Player treat it as tap-to-move instead, so
 * both mobile controls coexist on the same pointer.
 */
export class VirtualJoystick {
  /** Current analogue vector; zero when released. */
  state: JoystickVector = { x: 0, y: 0, magnitude: 0 };

  private base: Phaser.GameObjects.Image;
  private knob: Phaser.GameObjects.Image;
  private pointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private downX = 0;
  private downY = 0;
  private downTime = 0;
  private engaged = false;
  private pressTracked = false;
  private onEngage: () => void;

  constructor(scene: Phaser.Scene, onEngage: () => void) {
    this.onEngage = onEngage;
    this.base = scene.add
      .image(0, 0, 'joy-base')
      .setScrollFactor(0)
      .setDepth(900)
      .setVisible(false);
    this.knob = scene.add
      .image(0, 0, 'joy-knob')
      .setScrollFactor(0)
      .setDepth(901)
      .setVisible(false);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.pointerId !== null) return;
      if (
        pointer.y <= HUD_BAR_HEIGHT ||
        (pointer.x >= BUTTON_ZONE.minX && pointer.y >= BUTTON_ZONE.minY) ||
        (pointer.x <= LEFT_BUTTON_ZONE.maxX && pointer.y >= LEFT_BUTTON_ZONE.minY) ||
        (pointer.x >= GEAR_ZONE.minX && pointer.y >= GEAR_ZONE.minY && pointer.y <= GEAR_ZONE.maxY)
      ) {
        // Presses on the HUD bar or the action button zone are not
        // joystick presses, and must not later read as taps either.
        this.pressTracked = false;
        return;
      }
      this.pressTracked = true;
      this.pointerId = pointer.id;
      this.originX = pointer.x;
      this.originY = pointer.y;
      this.downX = pointer.x;
      this.downY = pointer.y;
      this.downTime = scene.time.now;
      this.engaged = false;
      this.base.setPosition(pointer.x, pointer.y).setVisible(true);
      this.knob.setPosition(pointer.x, pointer.y).setVisible(true);
    });

    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (this.pointerId === null || pointer.id !== this.pointerId) return;
      const dx = pointer.x - this.originX;
      const dy = pointer.y - this.originY;
      const len = Math.hypot(dx, dy);
      this.state = joystickVector(dx, dy, RADIUS);
      if (len > 0) {
        const clamped = Math.min(len, RADIUS);
        this.knob.setPosition(
          this.originX + (dx / len) * clamped,
          this.originY + (dy / len) * clamped,
        );
      }
      if (!this.engaged && len >= ENGAGE_DISTANCE) {
        this.engaged = true;
        this.onEngage();
      }
    });

    const release = (pointer: Phaser.Input.Pointer) => {
      if (this.pointerId === null || pointer.id !== this.pointerId) return;
      this.pointerId = null;
      this.state = { x: 0, y: 0, magnitude: 0 };
      this.base.setVisible(false);
      this.knob.setVisible(false);
    };
    scene.input.on(Phaser.Input.Events.POINTER_UP, release);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
  }

  /** True if the latest press ever dragged far enough to steer. */
  engagedDuringPress(): boolean {
    return this.engaged;
  }

  /**
   * True when a release should be read as a tap: short press, barely
   * moved, and the joystick never engaged during it.
   */
  isTapRelease(pointer: Phaser.Input.Pointer, now: number): boolean {
    if (!this.pressTracked) return false;
    const moved = Math.hypot(pointer.x - this.downX, pointer.y - this.downY);
    return !this.engaged && moved < 14 && now - this.downTime < 600;
  }
}
