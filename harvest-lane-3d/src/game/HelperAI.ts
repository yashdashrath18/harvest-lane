import * as THREE from 'three';
import { makeCustomer, type CharacterRig } from '../three/models';
import { FIELDS, STALL_FRONT, X, Z, type RectPx } from './Layout';
import type { CropField3D } from './CropField3D';

/**
 * The hired farm helper: a second character who works the fields
 * on his own. He walks to the nearest ripe crop (routing out of
 * and into fields through their gate gaps, like the player has
 * to), harvests it, and when his arms are full he carries the
 * produce to the stall and stocks it. Slow and steady by design:
 * he takes the boring laps off the player, he does not outplay
 * them.
 */

const GATE_PX: Record<string, { x: number; y: number }> = {
  A: { x: 452, y: 322 },
  B: { x: 452, y: 673 },
  CORN: { x: 628, y: 364 },
  SOUTH: { x: 452, y: 1178 },
};
const SPEED = 5.0;
export const HELPER_CAPACITY = 8;

function fieldOf(x: number, z: number): string | null {
  for (const [name, r] of Object.entries(FIELDS) as [string, RectPx][]) {
    if (x >= X(r.x) - 0.2 && x <= X(r.x + r.w) + 0.2 && z >= Z(r.y) - 0.2 && z <= Z(r.y + r.h) + 0.2) {
      return name;
    }
  }
  return null;
}

export class HelperAI {
  readonly rig: CharacterRig;
  active = false;
  onHarvest: ((cropId: string) => void) | null = null;
  onDeposit: ((itemId: string) => void) | null = null;
  private carry = new Map<string, number>();
  private carryTotal = 0;
  private waypoints: { x: number; z: number }[] = [];
  private mode: 'seek' | 'harvest' | 'deposit' | 'idle' = 'idle';
  private workTimerMs = 0;
  private facing = Math.PI;
  private walkPhase = 0;

  constructor(
    scene: THREE.Scene,
    private cropField: CropField3D,
  ) {
    this.rig = makeCustomer(1);
    this.rig.group.position.set(X(STALL_FRONT.x) - 1.6, 0, Z(STALL_FRONT.y));
    this.rig.group.visible = false;
    scene.add(this.rig.group);
  }

  setActive(v: boolean): void {
    this.active = v;
    this.rig.group.visible = v;
  }

  get carrying(): number {
    return this.carryTotal;
  }

  /** Routes from the current position to a target, via field gates. */
  private routeTo(tx: number, tz: number): void {
    const pos = this.rig.group.position;
    const pts: { x: number; z: number }[] = [];
    const here = fieldOf(pos.x, pos.z);
    const there = fieldOf(tx, tz);
    if (here && here !== there) {
      const g = GATE_PX[here];
      pts.push({ x: X(g.x), z: Z(g.y) });
    }
    if (there && there !== here) {
      const g = GATE_PX[there];
      pts.push({ x: X(g.x), z: Z(g.y) });
    }
    pts.push({ x: tx, z: tz });
    this.waypoints = pts;
  }

  update(dtMs: number): void {
    if (!this.active) return;
    const dt = dtMs / 1000;
    const pos = this.rig.group.position;

    if (this.mode === 'harvest' || this.mode === 'deposit') {
      this.workTimerMs -= dtMs;
      if (this.workTimerMs <= 0) {
        if (this.mode === 'harvest') {
          const id = this.cropField.harvestCropAt(pos.x, pos.z);
          if (id) {
            this.carry.set(id, (this.carry.get(id) ?? 0) + 1);
            this.carryTotal++;
            this.onHarvest?.(id);
          }
          this.mode = 'seek';
        } else {
          // Deposit one item per tick until his arms are empty.
          for (const [id, n] of this.carry) {
            if (n <= 0) continue;
            this.carry.set(id, n - 1);
            this.carryTotal--;
            this.onDeposit?.(id);
            break;
          }
          if (this.carryTotal <= 0) this.mode = 'seek';
          else this.workTimerMs = 160;
        }
      }
      this.animateRig(false, dt);
      return;
    }

    // Choose the next destination when there is no route.
    if (this.waypoints.length === 0) {
      if (this.carryTotal >= HELPER_CAPACITY) {
        this.routeTo(X(STALL_FRONT.x) - 0.8, Z(STALL_FRONT.y));
        this.mode = 'deposit';
      } else {
        const crop = this.cropField.nearestReadyCrop(pos.x, pos.z);
        if (crop) {
          this.routeTo(crop.x, crop.z);
          this.mode = 'seek';
        } else if (this.carryTotal > 0) {
          this.routeTo(X(STALL_FRONT.x) - 0.8, Z(STALL_FRONT.y));
          this.mode = 'deposit';
        } else {
          this.mode = 'idle';
        }
      }
    }

    const target = this.waypoints[0];
    if (!target) {
      this.animateRig(false, dt);
      return;
    }
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.32) {
      this.waypoints.shift();
      if (this.waypoints.length === 0) {
        if (this.mode === 'seek') {
          this.mode = 'harvest';
          this.workTimerMs = 380;
        } else if (this.mode === 'deposit') {
          this.workTimerMs = 0;
        }
      }
      this.animateRig(false, dt);
      return;
    }
    const step = Math.min(dist, SPEED * dt);
    pos.x += (dx / dist) * step;
    pos.z += (dz / dist) * step;
    const targetFacing = Math.atan2(dx / dist, dz / dist);
    let diff = targetFacing - this.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.facing += diff * Math.min(1, dt * 10);
    this.walkPhase += dt * 10;
    this.animateRig(true, dt);
  }

  private animateRig(moving: boolean, dt: number): void {
    void dt;
    this.rig.group.rotation.y = this.facing;
    const swing = moving ? Math.sin(this.walkPhase) * 0.6 : 0;
    this.rig.legL.rotation.x = swing;
    this.rig.legR.rotation.x = -swing;
    this.rig.armL.rotation.x = -swing * 0.8;
    this.rig.armR.rotation.x = swing * 0.8;
    this.rig.body.position.y = 0.78 + (moving ? Math.abs(Math.sin(this.walkPhase)) * 0.06 : 0);
  }
}
