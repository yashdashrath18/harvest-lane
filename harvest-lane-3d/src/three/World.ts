import * as THREE from 'three';
import { MAT, box } from './models';
import { FIELDS, CHICKEN_PEN, COW_PEN, STALL_POS, EAST_ZONE, rect3, u, X, Z, type RectPx } from '../game/Layout';

/** The shared soil material, kept so bought land can be fenced and soiled later. */
let soilMaterial: THREE.MeshLambertMaterial | null = null;

/**
 * Adds a field's soil bed and fence (with gate gaps) to the scene.
 * Used at build time for the starter fields and at purchase time for
 * land bought in the shop (master prompt S3).
 */
export function addFieldVisuals(
  scene: THREE.Scene,
  rect: RectPx,
  gaps: Partial<Record<'n' | 's' | 'e' | 'w', [number, number][]>> = {},
): void {
  if (!soilMaterial) return;
  const { cx, cz, w, d } = rect3(rect);
  const p = groundPlane(w, d, soilMaterial, 0.02);
  p.position.x = cx;
  p.position.z = cz;
  scene.add(p);
  scene.add(fenceRect(rect, gaps));
}

function canvasTexture(draw: (c: CanvasRenderingContext2D, s: number) => void, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Solid boxes the player cannot walk through: every fence span
 * (gate gaps excluded by construction), the stall, tree trunks and
 * the entrance sign. Filled as a side effect of building the world.
 */
export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
export const WORLD_COLLIDERS: Collider[] = [];
/** Live handles to the ground materials, so weather and road skins can retint them. Filled by buildWorld. */
export const WORLD_MATS: { grass?: THREE.MeshLambertMaterial; path?: THREE.MeshLambertMaterial } = {};
function addCollider(cx: number, cz: number, w: number, d: number): void {
  WORLD_COLLIDERS.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
}

function groundPlane(w: number, d: number, mat: THREE.Material, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
}

/** A fence run along +x of the given length, posts and two rails. */
export function fenceRun(length: number): THREE.Group {
  const g = new THREE.Group();
  const railGeo = new THREE.BoxGeometry(length, 0.1, 0.07);
  [0.34, 0.66].forEach((h) => {
    const rail = new THREE.Mesh(railGeo, MAT.wood);
    rail.position.set(length / 2, h, 0);
    g.add(rail);
  });
  const postGeo = new THREE.BoxGeometry(0.16, 0.92, 0.16);
  const capGeo = new THREE.BoxGeometry(0.24, 0.1, 0.24);
  for (let x = 0.08; x <= length; x += 1.4) {
    const post = new THREE.Mesh(postGeo, MAT.wood);
    post.position.set(x, 0.46, 0);
    const cap = new THREE.Mesh(capGeo, MAT.woodLight);
    cap.position.set(x, 0.95, 0);
    g.add(post, cap);
  }
  return g;
}

export function fenceRect(r: RectPx, gaps: Partial<Record<'n' | 's' | 'e' | 'w', [number, number][]>> = {}): THREE.Group {
  const { cx, cz, w, d } = rect3(r);
  const g = new THREE.Group();
  const run = (len: number, px: number, pz: number, rotY: number) => {
    const f = fenceRun(len);
    f.position.set(px, 0, pz);
    f.rotation.y = rotY;
    g.add(f);
  };
  const spans = (total: number, gapList: [number, number][] = []): [number, number][] => {
    const out: [number, number][] = [];
    let cur = 0;
    const sorted = [...gapList].sort((a, b) => a[0] - b[0]);
    for (const [gs, ge] of sorted) {
      if (gs > cur) out.push([cur, gs]);
      cur = Math.max(cur, ge);
    }
    if (cur < total) out.push([cur, total]);
    return out;
  };
  // North and south edges run along x; west and east along z.
  // Every span also registers a collider; gaps stay walkable.
  // Fence colliders are thin (0.12): with the player's 0.38 radius
  // the old 0.3 band ate 0.53 units on each side of a fence line,
  // which sealed narrow paths between two fences entirely.
  for (const [s, e] of spans(w, gaps.n)) {
    run(e - s, cx - w / 2 + s, cz - d / 2, 0);
    addCollider(cx - w / 2 + (s + e) / 2, cz - d / 2, e - s, 0.12);
  }
  for (const [s, e] of spans(w, gaps.s)) {
    run(e - s, cx - w / 2 + s, cz + d / 2, 0);
    addCollider(cx - w / 2 + (s + e) / 2, cz + d / 2, e - s, 0.12);
  }
  for (const [s, e] of spans(d, gaps.w)) {
    run(e - s, cx - w / 2, cz - d / 2 + s, -Math.PI / 2);
    addCollider(cx - w / 2, cz - d / 2 + (s + e) / 2, 0.12, e - s);
  }
  for (const [s, e] of spans(d, gaps.e)) {
    run(e - s, cx + w / 2, cz - d / 2 + s, -Math.PI / 2);
    addCollider(cx + w / 2, cz - d / 2 + (s + e) / 2, 0.12, e - s);
  }
  return g;
}

function tree(x: number, z: number, s = 1): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 1.4 * s, 8), MAT.woodDark);
  trunk.position.y = 0.7 * s;
  g.add(trunk);
  const blobs: [number, number, number, number][] = [
    [0, 2.2, 0, 1.15],
    [-0.7, 1.8, 0.2, 0.8],
    [0.7, 1.85, -0.15, 0.85],
  ];
  blobs.forEach(([bx, by, bz, r], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r * s, 12, 10), i === 0 ? MAT.leaf : MAT.leafDark);
    m.position.set(bx * s, by * s, bz * s);
    g.add(m);
  });
  // Fruit dots
  const fruitMat = new THREE.MeshLambertMaterial({ color: 0xe2574c });
  [[0.5, 2.3, 0.8], [-0.6, 2.0, 0.7], [0.1, 1.7, 0.95]].forEach(([fx, fy, fz]) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 8, 6), fruitMat);
    f.position.set(fx * s, fy * s, fz * s);
    g.add(f);
  });
  g.position.set(x, 0, z);
  addCollider(x, z, 0.6, 0.6);
  return g;
}

/** The market stall: posts, striped awning, counter, crates. */
export function makeStall(): THREE.Group {
  const g = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.18, 2.6, 0.18);
  [[-2.3, -0.7], [2.3, -0.7], [-2.3, 0.9], [2.3, 0.9]].forEach(([px, pz]) => {
    const p = new THREE.Mesh(postGeo, MAT.woodDark);
    p.position.set(px, 1.3, pz);
    g.add(p);
  });
  // Awning: alternating blue and white slats, slightly sloped.
  for (let i = 0; i < 9; i++) {
    const slat = box(0.62, 0.07, 2.2, i % 2 === 0 ? MAT.blueStripe : MAT.white, -2.48 + i * 0.62, 2.62, 0.1);
    slat.rotation.z = 0.06;
    g.add(slat);
  }
  const counter = box(5.2, 1.0, 1.1, MAT.wood, 0, 0.5, 0.75);
  const counterTop = box(5.5, 0.14, 1.4, MAT.woodLight, 0, 1.05, 0.75);
  g.add(counter, counterTop);
  // Crates of produce on the counter.
  const crateCols = [0xe8873a, 0xe2574c, 0x7ec850];
  crateCols.forEach((col, i) => {
    const crate = box(1.0, 0.42, 0.8, MAT.woodDark, -1.7 + i * 1.7, 1.33, 0.75);
    g.add(crate);
    const fruitMat = new THREE.MeshLambertMaterial({ color: col });
    [-0.27, 0.02, 0.31].forEach((off, j) => {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), fruitMat);
      f.position.set(-1.7 + i * 1.7 + off, 1.62 + (j === 1 ? 0.1 : 0), 0.75);
      f.scale.y = 0.92;
      g.add(f);
      // A little leaf on top of each fruit.
      const leafTop = box(0.16, 0.04, 0.1, MAT.leaf, -1.7 + i * 1.7 + off + 0.05, 1.82 + (j === 1 ? 0.1 : 0), 0.75);
      leafTop.rotation.y = off * 2;
      g.add(leafTop);
    });
  });
  g.position.set(X(STALL_POS.x), 0, Z(STALL_POS.y));
  addCollider(X(STALL_POS.x), Z(STALL_POS.y) + 0.3, 5.6, 2.4);
  return g;
}

export function buildWorld(scene: THREE.Scene): void {
  // Grass
  const grassTex = canvasTexture((c, s) => {
    c.fillStyle = '#95d64e';
    c.fillRect(0, 0, s, s);
    // Mottled light and shade patches.
    for (let i = 0; i < 380; i++) {
      const x = Math.abs(Math.sin(i * 127.1) * 1000) % s;
      const y = Math.abs(Math.sin(i * 311.7) * 1000) % s;
      c.fillStyle = i % 3 === 0 ? 'rgba(110,178,52,0.4)' : i % 3 === 1 ? 'rgba(132,201,63,0.5)' : 'rgba(172,228,105,0.42)';
      c.beginPath();
      c.ellipse(x, y, 10 + (i % 9), 6 + (i % 6), i, 0, Math.PI * 2);
      c.fill();
    }
    // Dense individual blades in three greens, two lengths.
    for (let i = 0; i < 1500; i++) {
      const x = Math.abs(Math.sin(i * 57.3) * 1000) % s;
      const y = Math.abs(Math.sin(i * 83.9) * 1000) % s;
      const tall = i % 4 === 0;
      c.strokeStyle = i % 3 === 0 ? '#6fb32f' : i % 3 === 1 ? '#8bd450' : '#7cc742';
      c.lineWidth = tall ? 3 : 2;
      c.beginPath();
      c.moveTo(x, y + (tall ? 10 : 6));
      c.quadraticCurveTo(x + 2, y + 3, x + (i % 7) - 3, y - (tall ? 5 : 2));
      c.stroke();
    }
    // Sparse tiny meadow flowers: white and yellow four-petal dots.
    for (let i = 0; i < 9; i++) {
      const x = 30 + (Math.abs(Math.sin(i * 211.7) * 1000) % (s - 60));
      const y = 30 + (Math.abs(Math.sin(i * 157.3) * 1000) % (s - 60));
      c.fillStyle = i % 2 ? '#ffffff' : '#ffd94d';
      for (let p = 0; p < 4; p++) {
        const a = (p / 4) * Math.PI * 2 + i;
        c.beginPath();
        c.ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.4, 3.4, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#f0a13c';
      c.beginPath();
      c.arc(x, y, 2.4, 0, Math.PI * 2);
      c.fill();
    }
  }, 1024);
  grassTex.repeat.set(9, 13);
  const grassMat = new THREE.MeshLambertMaterial({ map: grassTex });
  WORLD_MATS.grass = grassMat;
  const grass = groundPlane(u(1080) + 8, u(1600) + 8, grassMat);
  scene.add(grass);

  // Sandy paths: main crossroads plus the stall apron.
  const sandTex = canvasTexture((c, s) => {
    c.fillStyle = '#ecc987';
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < 380; i++) {
      const x = Math.abs(Math.sin(i * 67.3) * 1000) % s;
      const y = Math.abs(Math.sin(i * 41.9) * 1000) % s;
      c.fillStyle = i % 3 === 0 ? '#dfb671' : i % 3 === 1 ? '#f5dca6' : '#d9ad63';
      c.beginPath();
      c.ellipse(x, y, 2 + (i % 4), 1.5 + (i % 3), i, 0, Math.PI * 2);
      c.fill();
    }
  }, 512);
  sandTex.repeat.set(4, 4);
  const pathMat = new THREE.MeshLambertMaterial({ map: sandTex });
  WORLD_MATS.path = pathMat;
  const pathRects: RectPx[] = [
    { x: 452, y: 0, w: 176, h: 1600 },
    { x: 0, y: 830, w: 1080, h: 160 },
    { x: 600, y: 1160, w: 480, h: 360 },
  ];
  pathRects.forEach((r) => {
    const { cx, cz, w, d } = rect3(r);
    const p = groundPlane(w, d, pathMat, 0.01);
    p.position.x = cx;
    p.position.z = cz;
    scene.add(p);
  });

  // Soil fields with ploughed rows.
  const soilTex = canvasTexture((c, s) => {
    c.fillStyle = '#a9743f';
    c.fillRect(0, 0, s, s);
    c.fillStyle = '#8a5a2b';
    for (let y = 20; y < s; y += 42) c.fillRect(0, y, s, 10);
    c.fillStyle = '#c08d54';
    for (let y = 4; y < s; y += 42) c.fillRect(0, y, s, 7);
    // Clods and small stones scattered over the tilled earth.
    for (let i = 0; i < 240; i++) {
      const x = Math.abs(Math.sin(i * 71.7) * 1000) % s;
      const y = Math.abs(Math.sin(i * 49.3) * 1000) % s;
      c.fillStyle = i % 3 === 0 ? 'rgba(122,79,36,0.55)' : i % 3 === 1 ? 'rgba(208,164,106,0.5)' : 'rgba(150,116,80,0.6)';
      c.beginPath();
      c.ellipse(x, y, 2 + (i % 4), 1.6 + (i % 3), i, 0, Math.PI * 2);
      c.fill();
    }
  }, 512);
  soilTex.repeat.set(3, 3);
  const soilMat = new THREE.MeshLambertMaterial({ map: soilTex });
  soilMaterial = soilMat;
  // Fields are fenced, with a gate gap on the path-facing side so
  // the farmer walks in through the opening, not through the rails.
  const FIELD_GAPS: Record<string, Partial<Record<'n' | 's' | 'e' | 'w', [number, number][]>>> = {
    A: { e: [[2.5, 4.2]] },
    B: { e: [[2.05, 3.75]] },
    CORN: { w: [[3.4, 5.1]] },
    SOUTH: { e: [[2.5, 4.2]] },
  };
  (Object.entries(FIELDS) as [string, RectPx][]).forEach(([name, r]) => {
    const { cx, cz, w, d } = rect3(r);
    const p = groundPlane(w, d, soilMat, 0.02);
    p.position.x = cx;
    p.position.z = cz;
    scene.add(p);
    scene.add(fenceRect(r, FIELD_GAPS[name]));
  });

  // Pens (fences now; animals arrive in their phase).
  scene.add(fenceRect(CHICKEN_PEN, { s: [[1.8, 3.5]] }));
  scene.add(fenceRect(COW_PEN, { s: [[3.2, 4.9]] }));

  // Perimeter fence with a south gate gap at the entrance path, and
  // an east gap where the farm will one day expand (a barricade,
  // added in main, blocks it until the first land purchase).
  const per: RectPx = { x: 12, y: 12, w: 1056, h: 1576 };
  scene.add(fenceRect(per, { s: [[u(452 - 12), u(628 - 12)]], e: [[u(800 - 12), u(890 - 12)]] }));

  // The east expansion zone: extra grass, a crossing path, and the
  // zone's own outer fence with a west gap at the crossing. The
  // strips and the East Field get their fences when bought.
  const grass2 = groundPlane(u(420), u(1600) + 8, grassMat);
  grass2.position.x = X(1420);
  scene.add(grass2);
  const zonePaths: RectPx[] = [
    { x: 1068, y: 800, w: 532, h: 90 },
    { x: 1244, y: 140, w: 88, h: 1320 },
  ];
  zonePaths.forEach((r) => {
    const { cx, cz, w, d } = rect3(r);
    const p = groundPlane(w, d, pathMat, 0.01);
    p.position.x = cx;
    p.position.z = cz;
    scene.add(p);
  });
  scene.add(fenceRect(EAST_ZONE, { w: [[u(800 - 140), u(890 - 140)]] }));

  // Stall and entrance sign.
  scene.add(makeStall());
  const sign = new THREE.Group();
  const board = box(3.6, 1.0, 0.16, MAT.wood, 0, 2.0, 0);
  const legL = box(0.2, 2.0, 0.2, MAT.woodDark, -1.4, 1.0, 0);
  const legR = box(0.2, 2.0, 0.2, MAT.woodDark, 1.4, 1.0, 0);
  sign.add(board, legL, legR);
  sign.position.set(X(540), 0, Z(120));
  addCollider(X(540), Z(120), 3.4, 0.5);
  scene.add(sign);

  // Decor: trees, bushes.
  scene.add(tree(X(300), Z(108), 1.1));
  scene.add(tree(X(905), Z(590), 0.9));
  scene.add(tree(X(120), Z(1460), 1.0));
  scene.add(tree(X(990), Z(240), 1.05));
  const bushMat = MAT.leafDark;
  [[X(905), Z(640)], [X(180), Z(760)], [X(980), Z(1080)]].forEach(([bx, bz]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), bushMat);
    b.position.set(bx, 0.35, bz);
    b.scale.y = 0.7;
    scene.add(b);
  });
}
