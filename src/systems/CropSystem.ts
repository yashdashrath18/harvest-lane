import Phaser from 'phaser';
import { CORN, type CropDefinition } from '../data/CropData';
import { Crop } from '../entities/Crop';

export interface FieldRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const CELL = 46;

/**
 * Owns every planted crop: lays out the plot grid inside each field,
 * advances growth on a throttled tick, and answers spatial queries for
 * the interaction logic (nearest ready crop, crop at a point).
 */
export class CropSystem {
  readonly crops: Crop[] = [];
  /** Growth speed multiplier from upgrades; 1 is the base rate. */
  timeScale = 1;
  private scene: Phaser.Scene;
  private seed = 1234567;

  constructor(scene: Phaser.Scene, fields: FieldRect[], now: number) {
    this.scene = scene;
    fields.forEach((field) => this.addField(field, now));
  }

  // Deterministic pseudo-random stagger so the farm layout is stable
  // between runs while still looking naturally varied.
  private rand(): number {
    this.seed = (this.seed * 1103515245 + 12345) % 2147483648;
    return this.seed / 2147483648;
  }

  /** Plants a full field. Also used when an area unlocks. */
  addField(field: FieldRect, now: number, definition: CropDefinition = CORN): void {
    const cols = Math.floor(field.w / CELL);
    const rows = Math.floor(field.h / CELL);
    const offsetX = field.x + (field.w - cols * CELL) / 2 + CELL / 2;
    const offsetY = field.y + (field.h - rows * CELL) / 2 + CELL / 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // About 1 in 6 plots starts fully grown so a freshly planted
        // field is partly harvestable soon; the rest are staggered.
        const initialProgress = this.rand() < 0.16 ? 1 : 0.15 + this.rand() * 0.78;
        const crop = new Crop(
          this.scene,
          offsetX + col * CELL,
          offsetY + row * CELL,
          definition,
          now,
          initialProgress,
        );
        this.crops.push(crop);
      }
    }
  }

  /** Advances all crops. Cheap enough at a throttled tick rate. */
  update(now: number): void {
    this.crops.forEach((crop) => crop.refresh(now, this.timeScale));
  }

  /** Nearest ready crop within `range` of a point, or null. */
  nearestReady(x: number, y: number, range: number): Crop | null {
    let best: Crop | null = null;
    let bestDist = range;
    this.crops.forEach((crop) => {
      if (!crop.ready) return;
      const d = Phaser.Math.Distance.Between(x, y, crop.x, crop.y);
      if (d <= bestDist) {
        best = crop;
        bestDist = d;
      }
    });
    return best;
  }

  /** The crop whose plot contains a point (within half a cell), or null. */
  cropAt(x: number, y: number): Crop | null {
    let best: Crop | null = null;
    let bestDist = CELL * 0.75;
    this.crops.forEach((crop) => {
      const d = Phaser.Math.Distance.Between(x, y, crop.x, crop.y);
      if (d <= bestDist) {
        best = crop;
        bestDist = d;
      }
    });
    return best;
  }
}
