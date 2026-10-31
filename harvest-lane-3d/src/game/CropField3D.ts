import * as THREE from 'three';
import { CROPS, type CropDefinition } from '../data/CropData';
import { FIELDS, X, Z, type RectPx } from '../game/Layout';
import { CROP_GEOMETRIES, CROP_MATERIAL } from '../three/crops';

interface Crop {
  def: CropDefinition;
  x: number;
  z: number;
  mesh: THREE.Mesh;
  /** Milliseconds of growth accumulated. */
  grownMs: number;
  state: 'growing' | 'ready' | 'regrowing';
  stage: number;
}

const CELL = 46;

/** Plots inside a field rect, on the same 46px grid as the 2D game. */
function plotPositions(field: RectPx): { x: number; y: number }[] {
  const cols = Math.floor(field.w / CELL);
  const rows = Math.floor(field.h / CELL);
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ x: field.x + CELL / 2 + c * CELL, y: field.y + CELL / 2 + r * CELL });
    }
  }
  return out;
}

/**
 * All crops in the 3D farm. Growth runs on the ported crop data;
 * harvesting is walk-over: the farmer collects any ready crop he
 * steps on, which is the 3D edition's core interaction.
 */
export class CropField3D {
  private crops: Crop[] = [];
  private growthScale = 1;
  private tickMs = 0;
  onHarvest: ((cropId: string, x: number, z: number) => boolean) | null = null;
  onFull: (() => void) | null = null;
  private fullCooldownMs = 0;

  constructor(scene: THREE.Scene) {
    const plant = (field: RectPx, cropId: string, phaseSeed: number) => {
      plotPositions(field).forEach((p, i) => {
        const def = CROPS[cropId];
        const mesh = new THREE.Mesh(CROP_GEOMETRIES[cropId][0], CROP_MATERIAL);
        mesh.position.set(X(p.x), 0, Z(p.y));
        scene.add(mesh);
        // Deterministic stagger so fields are never in lockstep.
        const frac = ((i * 37 + phaseSeed * 91) % 100) / 100;
        this.crops.push({
          def,
          x: X(p.x),
          z: Z(p.y),
          mesh,
          grownMs: frac * def.growthTimeMs,
          state: 'growing',
          stage: -1,
        });
      });
    };
    plant(FIELDS.A, 'corn', 1);
    plant(FIELDS.B, 'corn', 2);
    plant(FIELDS.CORN, 'corn', 3);
    // SOUTH stays empty soil until it is unlocked (shop phase);
    // plantSouth() plants its carrots then.
  }

  plantSouth(scene: THREE.Scene): void {
    plotPositions(FIELDS.SOUTH).forEach((p, i) => {
      const def = CROPS.carrot;
      const mesh = new THREE.Mesh(CROP_GEOMETRIES.carrot[0], CROP_MATERIAL);
      mesh.position.set(X(p.x), 0, Z(p.y));
      scene.add(mesh);
      const frac = ((i * 41) % 100) / 100;
      this.crops.push({
        def,
        x: X(p.x),
        z: Z(p.y),
        mesh,
        grownMs: frac * def.growthTimeMs,
        state: 'growing',
        stage: -1,
      });
    });
  }

  setGrowthScale(scale: number): void {
    this.growthScale = scale;
  }

  realModelsReady = false;

  /**
   * Called after the real crop models replace the procedural
   * geometries: resetting each crop's stage makes the next growth
   * tick re-point its mesh at the new geometry for its stage.
   */
  refreshCropModels(): void {
    this.realModelsReady = true;
    this.crops.forEach((c) => {
      c.stage = -1;
    });
  }

  /** QA helper (only reachable through the dev hooks). */
  debugMakeReady(): void {
    this.crops.forEach((c) => {
      if (c.state === 'growing') c.grownMs = c.def.growthTimeMs;
    });
  }

  get cropCount(): number {
    return this.crops.length;
  }

  readyCount(): number {
    return this.crops.filter((c) => c.state === 'ready').length;
  }

  /** The ready crop nearest to a point (the helper's targeting). */
  nearestReadyCrop(x: number, z: number): { x: number; z: number; id: string } | null {
    let best: Crop | null = null;
    let bestDist = Infinity;
    for (const c of this.crops) {
      if (c.state !== 'ready') continue;
      const d = (c.x - x) ** 2 + (c.z - z) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best ? { x: best.x, z: best.z, id: best.def.id } : null;
  }

  /**
   * Harvests the ready crop at a point, if one is there: the same
   * regrow bookkeeping as a player walk-over, minus the backpack.
   * Returns the crop id, or null when nothing was ready.
   */
  harvestCropAt(x: number, z: number): string | null {
    for (const c of this.crops) {
      if (c.state !== 'ready') continue;
      const dx = c.x - x;
      const dz = c.z - z;
      if (dx * dx + dz * dz < 0.95) {
        c.state = 'regrowing';
        c.grownMs = 0;
        c.mesh.visible = false;
        c.stage = -1;
        return c.def.id;
      }
    }
    return null;
  }

  update(dtMs: number, playerX: number, playerZ: number, timeSec: number): void {
    this.fullCooldownMs = Math.max(0, this.fullCooldownMs - dtMs);
    this.tickMs += dtMs;
    const doTick = this.tickMs >= 120;
    if (doTick) this.tickMs = 0;

    for (const crop of this.crops) {
      if (crop.state !== 'ready') {
        crop.grownMs += dtMs * this.growthScale;
        const target = crop.state === 'regrowing' ? crop.def.regrowTimeMs : crop.def.growthTimeMs;
        if (crop.grownMs >= target) {
          if (crop.state === 'regrowing') {
            crop.state = 'growing';
            crop.grownMs = 0;
          } else {
            crop.state = 'ready';
          }
        }
      }
      if (doTick) {
        const stage =
          crop.state === 'ready'
            ? 3
            : Math.min(2, Math.floor((crop.grownMs / crop.def.growthTimeMs) * 3));
        if (crop.state === 'regrowing') {
          crop.mesh.visible = crop.grownMs > crop.def.regrowTimeMs * 0.4;
          if (crop.mesh.visible && crop.stage !== 0) {
            crop.mesh.geometry = CROP_GEOMETRIES[crop.def.id][0];
            crop.stage = 0;
          }
        } else if (stage !== crop.stage) {
          crop.mesh.geometry = CROP_GEOMETRIES[crop.def.id][stage];
          crop.stage = stage;
        }
        // Growth ease: young crops sit slightly smaller.
        const s = crop.state === 'ready' ? 1 : 0.75 + 0.25 * Math.min(1, crop.grownMs / crop.def.growthTimeMs);
        crop.mesh.scale.setScalar(s);
      }
      if (crop.state === 'ready') {
        // Gentle breathing pulse so ripe crops invite a walk-over.
        crop.mesh.scale.setScalar(1 + Math.sin(timeSec * 3 + crop.x * 2 + crop.z) * 0.045);
        const dx = crop.x - playerX;
        const dz = crop.z - playerZ;
        if (dx * dx + dz * dz < 0.81) {
          // Stepped on: the game decides whether it fits.
          if (this.onHarvest?.(crop.def.id, crop.x, crop.z)) {
            crop.state = 'regrowing';
            crop.grownMs = 0;
            crop.mesh.visible = false;
            crop.stage = -1;
          } else if (this.fullCooldownMs <= 0) {
            this.fullCooldownMs = 1200;
            this.onFull?.();
          }
        }
      }
    }
  }
}
