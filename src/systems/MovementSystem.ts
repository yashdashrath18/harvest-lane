import Phaser from 'phaser';
import { MOVE_ARRIVE_DISTANCE } from '../game/GameConstants';
import { hasArrivedWithin } from '../utils/MathUtils';

export interface KeyboardDirection {
  x: number;
  y: number;
}

export interface JoystickState {
  /** Analogue vector from the virtual joystick, components in [-1, 1]. */
  x: number;
  y: number;
  magnitude: number;
}

/**
 * Movement logic for the player.
 *
 * Three input modes share this system, in priority order:
 * - Keyboard (WASD and arrow keys): direct velocity while a key is held.
 * - Virtual joystick: analogue velocity while the pointer is dragged.
 * - Pointer tap: a target point the player walks to.
 *
 * Keyboard input always wins while a key is held, and engaging any
 * direct control cancels any active tap target. This is a pure decision
 * layer over the Arcade physics body, so the rules can be unit tested.
 */
export class MovementSystem {
  private tapTarget: { x: number; y: number } | null = null;

  setTapTarget(x: number, y: number): void {
    this.tapTarget = { x, y };
  }

  clearTapTarget(): void {
    this.tapTarget = null;
  }

  hasTapTarget(): boolean {
    return this.tapTarget !== null;
  }

  /**
   * Returns true when the body has reached its tap target, under the
   * shared arrival distance. Exposed as a static so tests exercise the
   * exact rule used at runtime.
   */
  static hasArrived(
    bodyX: number,
    bodyY: number,
    targetX: number,
    targetY: number,
  ): boolean {
    return hasArrivedWithin(bodyX, bodyY, targetX, targetY, MOVE_ARRIVE_DISTANCE);
  }

  /**
   * Applies this frame's movement decision to the body.
   * Priority: keyboard, then joystick, then tap target.
   * Returns true while the player is moving.
   */
  update(
    body: Phaser.Physics.Arcade.Body,
    direction: KeyboardDirection,
    joystick: JoystickState,
    speed: number,
  ): boolean {
    const hasKeyboardInput = direction.x !== 0 || direction.y !== 0;

    if (hasKeyboardInput) {
      this.tapTarget = null;
      const length = Math.hypot(direction.x, direction.y);
      body.setVelocity((direction.x / length) * speed, (direction.y / length) * speed);
      return true;
    }

    if (joystick.magnitude > 0.12) {
      this.tapTarget = null;
      body.setVelocity(joystick.x * speed, joystick.y * speed);
      return true;
    }

    if (this.tapTarget) {
      if (
        MovementSystem.hasArrived(body.x + body.halfWidth, body.y + body.halfHeight, this.tapTarget.x, this.tapTarget.y)
      ) {
        this.tapTarget = null;
        body.setVelocity(0, 0);
        return false;
      }
      const angle = Phaser.Math.Angle.Between(
        body.x + body.halfWidth,
        body.y + body.halfHeight,
        this.tapTarget.x,
        this.tapTarget.y,
      );
      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      return true;
    }

    body.setVelocity(0, 0);
    return false;
  }
}
