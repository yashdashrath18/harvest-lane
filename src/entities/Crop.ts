import Phaser from 'phaser';
import type { CropDefinition } from '../data/CropData';

/**
 * One planted crop on a field plot. Growth is time-based: the stage is
 * derived from elapsed time over the crop's growth duration, and the
 * texture swaps only when the stage changes. After harvest the crop
 * regrows from stage 0 over its regrow duration.
 */
export class Crop extends Phaser.GameObjects.Image {
  readonly definition: CropDefinition;
  private plantedAt: number;
  private durationMs: number;
  private stage = -1;
  private lastTimeScale = 1;
  ready = false;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: CropDefinition, now: number, initialProgress: number) {
    super(scene, x, y, `crop-${definition.id}-0`);
    this.definition = definition;
    this.durationMs = definition.growthTimeMs;
    // Stagger initial progress so a fresh farm is not uniformly young.
    this.plantedAt = now - initialProgress * this.durationMs;
    scene.add.existing(this);
    this.setDepth(y + 10);
    this.refresh(now);
  }

  /** Growth progress 0..1 with the same time scale refresh uses. */
  progress01(now: number): number {
    return Math.min(1, ((now - this.plantedAt) * this.lastTimeScale) / this.durationMs);
  }

  /** Advances growth. Returns true if the visual stage changed. */
  refresh(now: number, timeScale = 1): boolean {
    this.lastTimeScale = timeScale;
    const progress = Math.min(1, ((now - this.plantedAt) * timeScale) / this.durationMs);
    const nextStage = Math.min(
      this.definition.stages - 1,
      Math.floor(progress * this.definition.stages),
    );
    // Ready exactly when the final (ripe) stage is showing, so what
    // the player sees is always what they can harvest.
    this.ready = nextStage >= this.definition.stages - 1;
    if (nextStage === this.stage) return false;
    this.stage = nextStage;
    this.setTexture(`crop-${this.definition.id}-${nextStage}`);
    return true;
  }

  get stageIndex(): number {
    return this.stage;
  }

  /** Starts regrowth after a successful harvest. */
  startRegrowth(now: number): void {
    this.plantedAt = now;
    this.durationMs = this.definition.regrowTimeMs;
    this.stage = -1;
    this.refresh(now);
  }
}
