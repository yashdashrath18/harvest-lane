import Phaser from 'phaser';
import { PLAYER_SPEED } from '../game/GameConstants';
import { MovementSystem, type KeyboardDirection } from '../systems/MovementSystem';
import { VirtualJoystick } from '../ui/VirtualJoystick';

type Facing = 'down' | 'up' | 'side';

/**
 * Player entity with the original code-drawn farmer art and
 * directional walk animation (two frames per direction, frame 0 is
 * also the idle pose; left/right share the side art via flip).
 *
 * Controls: WASD or arrow keys, a floating virtual joystick, and
 * tap-to-move. The scene may install `onTapWorld` to intercept taps
 * (for example, tapping a crop walks to it and harvests on arrival).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly movement = new MovementSystem();
  /** Optional tap interceptor. Return true if the tap was consumed. */
  onTapWorld: ((worldX: number, worldY: number) => boolean) | null = null;

  private joystick: VirtualJoystick;
  private facing: Facing = 'down';
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key> | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-down-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    // Feet-level body so the figure can pass close in front of fences.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(30, 18);
    body.setOffset(13, 56);

    Player.ensureAnimations(scene);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
    }

    // Engaging the joystick cancels any tap target immediately.
    this.joystick = new VirtualJoystick(scene, () => this.movement.clearTapTarget());

    // A quick tap (short, barely moved, joystick never engaged) is a
    // move order on release, unless the scene consumes it.
    scene.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      if (!this.joystick.isTapRelease(pointer, scene.time.now)) return;
      const world = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (this.onTapWorld && this.onTapWorld(world.x, world.y)) return;
      this.movement.setTapTarget(world.x, world.y);
    });
  }

  private static ensureAnimations(scene: Phaser.Scene): void {
    const defs: Array<[string, string]> = [
      ['walk-down', 'down'],
      ['walk-up', 'up'],
      ['walk-side', 'side'],
    ];
    defs.forEach(([key, dir]) => {
      if (scene.anims.exists(key)) return;
      scene.anims.create({
        key,
        frames: [{ key: `player-${dir}-0` }, { key: `player-${dir}-1` }],
        frameRate: 7,
        repeat: -1,
      });
    });
  }

  private readKeyboardDirection(): KeyboardDirection {
    const direction: KeyboardDirection = { x: 0, y: 0 };
    if (!this.cursors || !this.wasd) return direction;
    if (this.cursors.left.isDown || this.wasd.left.isDown) direction.x = -1;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) direction.x = 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) direction.y = -1;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) direction.y = 1;
    return direction;
  }

  /** Movement speed multiplier from upgrades; 1 is base speed. */
  speedMultiplier = 1;

  /** Returns true while the player is moving. */
  updatePlayer(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const moving = this.movement.update(
      body,
      this.readKeyboardDirection(),
      this.joystick.state,
      PLAYER_SPEED * this.speedMultiplier,
    );
    this.updateAnimation(body, moving);
    return moving;
  }

  private updateAnimation(body: Phaser.Physics.Arcade.Body, moving: boolean): void {
    if (moving) {
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      if (Math.abs(vx) > Math.abs(vy)) {
        this.facing = 'side';
        this.setFlipX(vx > 0); // side art faces left; flip for right
      } else if (vy !== 0) {
        this.facing = vy > 0 ? 'down' : 'up';
        this.setFlipX(false);
      }
      const animKey = `walk-${this.facing}`;
      if (this.anims.currentAnim?.key !== animKey || !this.anims.isPlaying) {
        this.play(animKey);
      }
    } else {
      this.anims.stop();
      this.setTexture(`player-${this.facing}-0`);
      if (this.facing !== 'side') this.setFlipX(false);
    }
  }
}
