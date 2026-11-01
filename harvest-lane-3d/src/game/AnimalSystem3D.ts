import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { CHICKEN_PEN, COW_PEN, X, Z, type RectPx } from './Layout';
import { assetUrl } from '../utils/assetUrl';
import { MAT, blobShadow, box, makeChicken, makeCow, makeEggMesh, makeMilkMesh, type ChickenRig, type CowRig } from '../three/models';

/** Base trough capacity (tier 0), in feed items. One item fuels one product. */
export const FEED_MAX = 20;
/** Where each pen's trough stands, in design pixels. */
export const TROUGH_PX = {
  chicken: { x: 672, y: 672 },
  cow: { x: 706, y: 1072 },
} as const;

function makeBangSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '900 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText('!', 48, 52);
  ctx.fillStyle = '#e2574c';
  ctx.fillText('!', 48, 52);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.setScalar(0.85);
  return sprite;
}

/** Animation state for a cow running the real Quaternius model. */
interface CowModelState {
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  current: string;
  grazeClip: string;
}

interface Animal {
  kind: 'chicken' | 'cow';
  chicken?: ChickenRig;
  cow?: CowRig;
  model?: CowModelState;
  group: THREE.Group;
  tx: number;
  tz: number;
  pauseMs: number;
  phase: number;
  produceMs: number;
}

/** Yaw correction for the cow model inside its wander group (set from visual QA). */
const COW_MODEL_YAW = 0;

interface Pickup {
  itemId: 'egg' | 'milk';
  group: THREE.Group;
  x: number;
  z: number;
  bornAt: number;
}

const EGG_EVERY_MS = 13_000;
const MILK_EVERY_MS = 21_000;
const MAX_PICKUPS = 8;

function penInner(pen: RectPx, marginPx: number): { minX: number; maxX: number; minZ: number; maxZ: number } {
  return {
    minX: X(pen.x + marginPx),
    maxX: X(pen.x + pen.w - marginPx),
    minZ: Z(pen.y + marginPx),
    maxZ: Z(pen.y + pen.h - marginPx),
  };
}

/**
 * Pen animals for the 3D game: chickens and cows that wander,
 * peck and graze, and produce eggs and milk as ground pickups the
 * farmer collects by walking over them. Same intervals and rules
 * as the 2D game's AnimalSystem.
 */
export class AnimalSystem3D {
  private animals: Animal[] = [];
  pickups: Pickup[] = [];
  /** Return true when the pickup fit in the backpack. */
  onCollect: ((itemId: string, x: number, z: number) => boolean) | null = null;
  onAmbient: ((kind: 'chicken' | 'cow') => void) | null = null;
  /** Fired once each time a pen's trough runs dry. */
  onHungry: ((kind: 'chicken' | 'cow') => void) | null = null;
  private ambientMs = 3_000;
  /** True once the real cow model has replaced the procedural cows. */
  cowModelReady = false;
  /**
   * Feeding: animals only produce while their pen's trough holds
   * feed (corn). Each egg or milk consumes one feed. An empty
   * trough stops production and raises a "!" over the trough.
   */
  private feed: Record<'chicken' | 'cow', number> = { chicken: 6, cow: 6 };
  /** Extension tiers owned per species (master prompt S4). */
  private tiers: Record<'chicken' | 'cow', number> = { chicken: 0, cow: 0 };
  /** The loaded cow GLTF, kept so cows bought later get the real model too. */
  private cowTemplate: unknown = null;
  private troughExtras: Record<'chicken' | 'cow', THREE.Group | null> = { chicken: null, cow: null };

  tierOf(kind: 'chicken' | 'cow'): number {
    return this.tiers[kind];
  }

  countOf(kind: 'chicken' | 'cow'): number {
    return this.animals.filter((a) => a.kind === kind).length;
  }

  /** This species' current trough capacity (grows +5 per tier). */
  feedMaxOf(kind: 'chicken' | 'cow'): number {
    return FEED_MAX + 5 * this.tiers[kind];
  }

  /** Sets tiers (save restore): respawns animals to match and rebuilds extras. */
  setTiers(tiers: { chicken: number; cow: number }): void {
    this.tiers = {
      chicken: Math.max(0, Math.min(9, Math.floor(tiers.chicken) || 0)),
      cow: Math.max(0, Math.min(6, Math.floor(tiers.cow) || 0)),
    };
    const want = {
      chicken: 3 + this.tiers.chicken,
      cow: 2 + this.tiers.cow,
    };
    while (this.countOf('chicken') < want.chicken) this.spawnChicken(this.countOf('chicken'));
    while (this.countOf('cow') < want.cow) this.spawnCow(this.countOf('cow'));
    this.rebuildTroughExtras('chicken');
    this.rebuildTroughExtras('cow');
    this.refreshTrough('chicken');
    this.refreshTrough('cow');
  }

  /** Buys one extension tier in-game: one more animal, more trough. */
  addTier(kind: 'chicken' | 'cow'): void {
    const next = { ...this.tiers, [kind]: this.tiers[kind] + 1 };
    this.setTiers(next);
  }

  tiersSnapshot(): { chicken: number; cow: number } {
    return { ...this.tiers };
  }

  /** One small extra trough per tier beside the main one (decorative, same pool). */
  private rebuildTroughExtras(kind: 'chicken' | 'cow'): void {
    const old = this.troughExtras[kind];
    if (old) {
      this.scene.remove(old);
      this.troughExtras[kind] = null;
    }
    const tier = this.tiers[kind];
    if (tier === 0) return;
    const base = this.troughPos(kind);
    const g = new THREE.Group();
    for (let i = 0; i < tier; i++) {
      const t = new THREE.Group();
      const bin = box(0.9, 0.34, 0.5, MAT.woodDark, 0, 0.17, 0);
      const rim = box(0.98, 0.08, 0.58, MAT.wood, 0, 0.36, 0);
      const fill = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.4), new THREE.MeshLambertMaterial({ color: 0xf2c14e }));
      fill.position.y = 0.34;
      t.add(bin, rim, fill);
      t.position.set(1.35 + (i % 3) * 0.55, 0, 0.62 + Math.floor(i / 3) * 0.55);
      g.add(t);
    }
    g.position.set(base.x, 0, base.z);
    this.scene.add(g);
    this.troughExtras[kind] = g;
  }

  private spawnChicken(index: number): void {
    const b = penInner(CHICKEN_PEN, 34);
    const rig = makeChicken();
    const p = { x: b.minX + Math.random() * (b.maxX - b.minX), z: b.minZ + Math.random() * (b.maxZ - b.minZ) };
    rig.group.position.set(p.x, 0, p.z);
    rig.group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(rig.group);
    this.animals.push({
      kind: 'chicken',
      chicken: rig,
      group: rig.group,
      tx: p.x,
      tz: p.z,
      pauseMs: 800 + index * 700,
      phase: Math.random() * 6,
      produceMs: EGG_EVERY_MS * (0.45 + (index * 0.37) % 0.8),
    });
  }

  private spawnCow(index: number): void {
    const b = penInner(COW_PEN, 40);
    const p = { x: b.minX + Math.random() * (b.maxX - b.minX), z: b.minZ + Math.random() * (b.maxZ - b.minZ) };
    if (this.cowTemplate) {
      // Real model path: start from an empty wander group, then swap.
      const group = new THREE.Group();
      group.position.set(p.x, 0, p.z);
      group.rotation.y = Math.random() * Math.PI * 2;
      group.add(blobShadow(1.6));
      this.scene.add(group);
      const animal: Animal = {
        kind: 'cow',
        group,
        tx: p.x,
        tz: p.z,
        pauseMs: 1_400 + index * 900,
        phase: Math.random() * 6,
        produceMs: MILK_EVERY_MS * (0.5 + index * 0.3),
      };
      this.animals.push(animal);
      this.applyCowModel(animal, this.cowTemplate as never, index);
      return;
    }
    const rig = makeCow();
    rig.group.position.set(p.x, 0, p.z);
    rig.group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(rig.group);
    this.animals.push({
      kind: 'cow',
      cow: rig,
      group: rig.group,
      tx: p.x,
      tz: p.z,
      pauseMs: 1_400 + index * 900,
      phase: Math.random() * 6,
      produceMs: MILK_EVERY_MS * (0.5 + index * 0.3),
    });
  }

  /** Swaps one cow's group contents for the real GLB model. */
  private applyCowModel(a: Animal, gltf: { scene: THREE.Group; animations: THREE.AnimationClip[] }, index: number): void {
    const bbox = new THREE.Box3().setFromObject(gltf.scene);
    const height = Math.max(0.01, bbox.max.y - bbox.min.y);
    const scale = 1.5 / height;
    const inst = skeletonClone(gltf.scene) as THREE.Group;
    inst.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        const converted = mats.map((m) => {
          const std = m as THREE.MeshStandardMaterial;
          return new THREE.MeshLambertMaterial({ color: std.color ? std.color.clone() : 0xffffff });
        });
        obj.material = Array.isArray(obj.material) ? converted : converted[0];
      }
    });
    inst.scale.setScalar(scale);
    inst.position.y = -bbox.min.y * scale;
    inst.rotation.y = COW_MODEL_YAW;
    while (a.group.children.length > 0) a.group.remove(a.group.children[0]);
    a.group.add(blobShadow(1.6));
    a.group.add(inst);
    const mixer = new THREE.AnimationMixer(inst);
    const actions = new Map<string, THREE.AnimationAction>();
    for (const clip of gltf.animations) {
      actions.set(clip.name.split('|').pop()!, mixer.clipAction(clip));
    }
    a.model = { mixer, actions, current: '', grazeClip: index % 2 === 0 ? 'Eating' : 'Idle_Headlow' };
    a.cow = undefined;
    this.setCowClip(a, a.model.grazeClip);
  }
  private hungryFlag: Record<'chicken' | 'cow', boolean> = { chicken: false, cow: false };
  private troughFill: Partial<Record<'chicken' | 'cow', THREE.Mesh>> = {};
  private bangSprites: Partial<Record<'chicken' | 'cow', THREE.Sprite>> = {};

  feedOf(kind: 'chicken' | 'cow'): number {
    return this.feed[kind];
  }

  /** Adds feed to a trough; returns how much actually fit. */
  addFeed(kind: 'chicken' | 'cow', amount: number): number {
    const added = Math.max(0, Math.min(this.feedMaxOf(kind) - this.feed[kind], amount));
    if (added > 0) {
      this.feed[kind] += added;
      this.hungryFlag[kind] = false;
      this.refreshTrough(kind);
    }
    return added;
  }

  feedSnapshot(): { chicken: number; cow: number } {
    return { ...this.feed };
  }

  restoreFeed(data: { chicken: number; cow: number }): void {
    const clamp = (v: number, kind: 'chicken' | 'cow') => (typeof v === 'number' && Number.isFinite(v) ? Math.min(this.feedMaxOf(kind), Math.max(0, Math.floor(v))) : 0);
    this.feed = { chicken: clamp(data?.chicken, 'chicken'), cow: clamp(data?.cow, 'cow') };
    this.refreshTrough('chicken');
    this.refreshTrough('cow');
  }

  troughPos(kind: 'chicken' | 'cow'): { x: number; z: number } {
    const p = TROUGH_PX[kind];
    return { x: X(p.x), z: Z(p.y) };
  }

  private refreshTrough(kind: 'chicken' | 'cow'): void {
    const fill = this.troughFill[kind];
    if (fill) {
      const frac = this.feed[kind] / this.feedMaxOf(kind);
      fill.visible = frac > 0;
      fill.scale.x = Math.max(0.05, frac);
    }
    const bang = this.bangSprites[kind];
    if (bang) bang.visible = this.feed[kind] <= 0;
  }

  private buildTrough(scene: THREE.Scene, kind: 'chicken' | 'cow'): void {
    const pos = this.troughPos(kind);
    const g = new THREE.Group();
    const bin = box(1.7, 0.42, 0.62, MAT.woodDark, 0, 0.21, 0);
    const rim = box(1.82, 0.1, 0.74, MAT.wood, 0, 0.44, 0);
    g.add(bin, rim);
    const fill = new THREE.Mesh(
      new THREE.BoxGeometry(1.56, 0.14, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xf2c14e }),
    );
    fill.position.y = 0.42;
    g.add(fill);
    this.troughFill[kind] = fill;
    const bang = makeBangSprite();
    bang.position.set(0, 1.5, 0);
    bang.visible = false;
    g.add(bang);
    this.bangSprites[kind] = bang;
    g.position.set(pos.x, 0, pos.z);
    scene.add(g);
    this.refreshTrough(kind);
  }

  /**
   * Loads the real cow model (Quaternius, CC0, see docs/ASSETS.md)
   * and swaps it into each cow's wander group, keeping a blob
   * shadow. The cows keep their skeletal clips: Walk while
   * strolling, Eating or Idle_Headlow while paused. Any failure
   * leaves the procedural cows in place.
   */
  async loadCowModel(): Promise<void> {
    try {
      const gltf = await new GLTFLoader().loadAsync(assetUrl('models/Cow.glb'));
      this.cowTemplate = gltf;
      let n = 0;
      for (const a of this.animals) {
        if (a.kind !== 'cow') continue;
        this.applyCowModel(a, gltf, n);
        n++;
      }
      if (n > 0) this.cowModelReady = true;
    } catch {
      /* model unavailable: the procedural cows stay */
    }
  }

  private setCowClip(a: Animal, name: string): void {
    const model = a.model;
    if (!model || model.current === name) return;
    const next = model.actions.get(name) ?? model.actions.get('Idle');
    if (!next) return;
    const prev = model.actions.get(model.current);
    if (prev && prev !== next) prev.fadeOut(0.25);
    next.reset().fadeIn(0.25).play();
    model.current = name;
  }

  constructor(private scene: THREE.Scene) {
    this.chickenPen = penInner(CHICKEN_PEN, 34);
    this.cowPen = penInner(COW_PEN, 40);
    for (let i = 0; i < 3; i++) this.spawnChicken(i);
    for (let i = 0; i < 2; i++) this.spawnCow(i);
    this.buildTrough(scene, 'chicken');
    this.buildTrough(scene, 'cow');
  }

  private chickenPen: ReturnType<typeof penInner>;
  private cowPen: ReturnType<typeof penInner>;

  get pickupCount(): number {
    return this.pickups.length;
  }

  private spawnPickup(itemId: 'egg' | 'milk', near: THREE.Group): boolean {
    if (this.pickups.filter((p) => p.itemId === itemId).length >= MAX_PICKUPS) return false;
    const group = itemId === 'egg' ? makeEggMesh() : makeMilkMesh();
    const x = near.position.x + (Math.random() - 0.5) * 1.2;
    const z = near.position.z + (Math.random() - 0.5) * 1.2;
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.pickups.push({ itemId, group, x, z, bornAt: performance.now() });
    return true;
  }

  update(dtMs: number, playerX: number, playerZ: number): void {
    const dt = dtMs / 1000;
    this.ambientMs -= dtMs;

    for (const a of this.animals) {
      const pos = a.group.position;
      const bounds = a.kind === 'chicken' ? this.chickenPen : this.cowPen;
      a.model?.mixer.update(dt);
      // Production, gated on feed: one trough item per product.
      a.produceMs -= dtMs;
      if (a.produceMs <= 0) {
        a.produceMs = a.kind === 'chicken' ? EGG_EVERY_MS : MILK_EVERY_MS;
        if (this.feed[a.kind] > 0) {
          // Feed is only spent when the product actually lands on
          // the ground (with 12 hens the pickup cap would otherwise
          // burn the trough for nothing).
          if (this.spawnPickup(a.kind === 'chicken' ? 'egg' : 'milk', a.group)) {
            this.feed[a.kind] -= 1;
            this.refreshTrough(a.kind);
          }
        } else if (!this.hungryFlag[a.kind]) {
          this.hungryFlag[a.kind] = true;
          this.refreshTrough(a.kind);
          this.onHungry?.(a.kind);
        }
      }
      // Wander: pause (peck or graze), then stroll to a new point.
      if (a.pauseMs > 0) {
        a.pauseMs -= dtMs;
        if (a.model) this.setCowClip(a, a.model.grazeClip);
        if (a.chicken) {
          // Pecking: quick head dips.
          const peck = Math.max(0, Math.sin(performance.now() / 90 + a.phase)) ** 3;
          a.chicken.head.rotation.x = peck * 0.65;
          a.chicken.body.position.y = 0.34;
        } else if (a.cow) {
          // Grazing: head lowered, tail swaying.
          a.cow.head.rotation.x = 0.55 + Math.sin(performance.now() / 600 + a.phase) * 0.06;
          a.cow.tail.rotation.x = Math.sin(performance.now() / 350 + a.phase) * 0.4;
        }
        if (a.pauseMs <= 0) {
          a.tx = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
          a.tz = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
        }
        continue;
      }
      const dx = a.tx - pos.x;
      const dz = a.tz - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.15) {
        a.pauseMs = a.kind === 'chicken' ? 900 + Math.random() * 1_400 : 1_800 + Math.random() * 2_200;
        continue;
      }
      if (a.model) this.setCowClip(a, 'Walk');
      const speed = a.kind === 'chicken' ? 1.25 : 0.7;
      pos.x += (dx / dist) * Math.min(dist, speed * dt);
      pos.z += (dz / dist) * Math.min(dist, speed * dt);
      const targetFacing = Math.atan2(dx / dist, dz / dist);
      let diff = targetFacing - a.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a.group.rotation.y += diff * Math.min(1, dt * 6);
      a.phase += dt * (a.kind === 'chicken' ? 14 : 5);
      if (a.chicken) {
        a.chicken.head.rotation.x = 0;
        a.chicken.body.position.y = 0.34 + Math.abs(Math.sin(a.phase)) * 0.05;
      } else if (a.cow) {
        a.cow.head.rotation.x = Math.sin(a.phase * 0.5) * 0.05;
        a.cow.tail.rotation.x = Math.sin(performance.now() / 400 + a.phase) * 0.3;
      }
    }

    // Ambient pen sounds when the farmer is nearby.
    if (this.ambientMs <= 0) {
      this.ambientMs = 3_500 + Math.random() * 2_500;
      const cc = { x: (this.chickenPen.minX + this.chickenPen.maxX) / 2, z: (this.chickenPen.minZ + this.chickenPen.maxZ) / 2 };
      const wc = { x: (this.cowPen.minX + this.cowPen.maxX) / 2, z: (this.cowPen.minZ + this.cowPen.maxZ) / 2 };
      if (Math.hypot(playerX - cc.x, playerZ - cc.z) < 7) this.onAmbient?.('chicken');
      else if (Math.hypot(playerX - wc.x, playerZ - wc.z) < 7.5) this.onAmbient?.('cow');
    }

    // Pickups: bob, spin slowly, and collect on walk-over.
    const now = performance.now();
    this.pickups = this.pickups.filter((p) => {
      p.group.position.y = 0.06 + Math.sin(now / 320 + p.x * 3) * 0.05;
      p.group.rotation.y += dt * 1.2;
      const dx = p.x - playerX;
      const dz = p.z - playerZ;
      if (dx * dx + dz * dz < 0.72) {
        if (this.onCollect?.(p.itemId, p.x, p.z)) {
          this.scene.remove(p.group);
          return false;
        }
      }
      return true;
    });
  }
}
