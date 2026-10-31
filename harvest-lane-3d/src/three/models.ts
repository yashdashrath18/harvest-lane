import * as THREE from 'three';

/** Procedural wood grain, drawn once on a canvas: warm planks with
 * grain streaks and knots, used by every wooden object so the world
 * reads textured instead of flat. */
function woodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#b5793a';
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const y = Math.abs(Math.sin(i * 39.7) * 1000) % 256;
    c.strokeStyle = i % 3 === 0 ? 'rgba(122,79,36,0.5)' : 'rgba(208,154,85,0.45)';
    c.lineWidth = 1 + (i % 3);
    c.beginPath();
    c.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) c.lineTo(x, y + Math.sin(x * 0.05 + i) * 3);
    c.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = Math.abs(Math.sin(i * 91.3) * 1000) % 240;
    const y = Math.abs(Math.sin(i * 47.9) * 1000) % 240;
    c.strokeStyle = 'rgba(122,79,36,0.65)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
    c.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Shared materials in the game's palette, textured where it counts. */
export const MAT = {
  grass: new THREE.MeshLambertMaterial({ color: 0x95d64e }),
  path: new THREE.MeshLambertMaterial({ color: 0xecc987 }),
  soil: new THREE.MeshLambertMaterial({ color: 0x9a6a42 }),
  wood: new THREE.MeshLambertMaterial({ map: woodTexture() }),
  woodDark: new THREE.MeshLambertMaterial({ color: 0x8a5a2b }),
  woodLight: new THREE.MeshLambertMaterial({ color: 0xd09a55 }),
  cream: new THREE.MeshLambertMaterial({ color: 0xfdf3da }),
  ribbon: new THREE.MeshLambertMaterial({ color: 0x2e6fdb }),
  creamDark: new THREE.MeshLambertMaterial({ color: 0xe8dcc0 }),
  eggWhite: new THREE.MeshLambertMaterial({ color: 0xffffff }),
  skin: new THREE.MeshLambertMaterial({ color: 0xf6c795 }),
  shirtRed: new THREE.MeshLambertMaterial({ color: 0xd65347 }),
  denim: new THREE.MeshLambertMaterial({ color: 0x46689c }),
  straw: new THREE.MeshLambertMaterial({ color: 0xf0d060 }),
  strawDark: new THREE.MeshLambertMaterial({ color: 0xe3ba45 }),
  boot: new THREE.MeshLambertMaterial({ color: 0x5a4030 }),
  leaf: new THREE.MeshLambertMaterial({ color: 0x4e9a45 }),
  leafDark: new THREE.MeshLambertMaterial({ color: 0x3f8438 }),
  cornGold: new THREE.MeshLambertMaterial({ color: 0xf7b733 }),
  white: new THREE.MeshLambertMaterial({ color: 0xffffff }),
  blackPatch: new THREE.MeshLambertMaterial({ color: 0x3a3a3a }),
  pink: new THREE.MeshLambertMaterial({ color: 0xf2b8c6 }),
  red: new THREE.MeshLambertMaterial({ color: 0xe2574c }),
  orange: new THREE.MeshLambertMaterial({ color: 0xf29c38 }),
  purple: new THREE.MeshLambertMaterial({ color: 0x9b7ed9 }),
  teal: new THREE.MeshLambertMaterial({ color: 0x2e9e8f }),
  blueStripe: new THREE.MeshLambertMaterial({ color: 0x5ea9dd }),
  shadow: new THREE.MeshBasicMaterial({
    color: 0x1d3a12,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  }),
};

export function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

export function blobShadow(radius: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), MAT.shadow);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  m.renderOrder = 1;
  return m;
}

export interface FarmerRig {
  group: THREE.Group;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  body: THREE.Object3D;
  /** Recolourable materials, present on the player farmer only (skins). */
  mats?: {
    shirt: THREE.MeshLambertMaterial;
    denim: THREE.MeshLambertMaterial;
    hat: THREE.MeshLambertMaterial;
    hatDark: THREE.MeshLambertMaterial;
    band: THREE.MeshLambertMaterial;
  };
}

export type CharacterRig = FarmerRig;

export interface ChickenRig {
  group: THREE.Group;
  head: THREE.Group;
  body: THREE.Group;
}

/** A chicken: plump white body, pecking head, red comb, orange beak. */
export function makeChicken(): ChickenRig {
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.34;
  const puff = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), MAT.cream);
  puff.scale.set(1, 0.9, 1.25);
  body.add(puff);
  // Wings: soft flattened ovals hugging each side.
  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), MAT.creamDark);
    wing.scale.set(0.32, 0.75, 1.1);
    wing.position.set(0.28 * side, 0.03, -0.03);
    body.add(wing);
  });
  // A fan of three tail feathers instead of a single cone.
  [-0.35, 0, 0.35].forEach((tilt) => {
    const feather = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 6), MAT.creamDark);
    feather.position.set(tilt * 0.22, 0.17, -0.31);
    feather.rotation.x = -0.75;
    feather.rotation.z = tilt;
    body.add(feather);
  });
  const head = new THREE.Group();
  head.position.set(0, 0.22, 0.3);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), MAT.cream);
  skull.position.y = 0.08;
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 6), MAT.orange);
  beak.position.set(0, 0.06, 0.22);
  beak.rotation.x = Math.PI / 2;
  // Eyes: two tiny dark beads.
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x26221e });
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), eyeMat);
    eye.position.set(0.11 * side, 0.13, 0.13);
    head.add(eye);
  });
  const combMat = new THREE.MeshLambertMaterial({ color: 0xd64545 });
  const comb = box(0.06, 0.14, 0.2, combMat, 0, 0.26, 0.02);
  head.add(skull, beak, comb);
  body.add(head);
  const legMat = MAT.orange;
  body.add(box(0.05, 0.3, 0.05, legMat, -0.1, -0.32, 0), box(0.05, 0.3, 0.05, legMat, 0.1, -0.32, 0));
  group.add(body);
  group.add(blobShadow(0.8));
  return { group, head, body };
}

export interface CowRig {
  group: THREE.Group;
  head: THREE.Group;
  tail: THREE.Object3D;
}

/** A cow: white body with black patches, pink muzzle, small horns. */
export function makeCow(): CowRig {
  const group = new THREE.Group();
  const patch = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const bodyG = new THREE.Group();
  bodyG.position.y = 0.98;
  bodyG.add(box(1.06, 0.92, 1.6, MAT.cream, 0, 0, 0));
  // A rounded barrel over the box softens the silhouette.
  const barrel = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 12), MAT.cream);
  barrel.scale.set(0.68, 0.6, 1.02);
  bodyG.add(barrel);
  bodyG.add(box(0.5, 0.5, 0.7, patch, 0.32, 0.15, -0.3));
  bodyG.add(box(0.44, 0.4, 0.6, patch, -0.34, -0.1, 0.42));
  bodyG.add(box(0.4, 0.24, 0.4, new THREE.MeshLambertMaterial({ color: 0xe8a0a8 }), 0, -0.52, -0.2));
  group.add(bodyG);
  const legM = MAT.creamDark;
  [[-0.36, 0.55], [0.36, 0.55], [-0.36, -0.55], [0.36, -0.55]].forEach(([lx, lz]) => {
    group.add(box(0.24, 0.78, 0.24, legM, lx, 0.39, lz));
  });
  const head = new THREE.Group();
  head.position.set(0, 1.28, 0.92);
  head.add(box(0.58, 0.56, 0.52, MAT.cream, 0, 0, 0.18));
  head.add(box(0.5, 0.26, 0.2, new THREE.MeshLambertMaterial({ color: 0xe8a0a8 }), 0, -0.16, 0.48));
  head.add(box(0.2, 0.12, 0.06, MAT.creamDark, -0.42, 0.12, 0.1));
  head.add(box(0.2, 0.12, 0.06, MAT.creamDark, 0.42, 0.12, 0.1));
  const hornM = new THREE.MeshLambertMaterial({ color: 0xe8dcc0 });
  const h1 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 6), hornM);
  h1.position.set(-0.24, 0.34, 0.1);
  h1.rotation.z = 0.5;
  const h2 = h1.clone();
  h2.position.x = 0.24;
  h2.rotation.z = -0.5;
  head.add(h1, h2);
  group.add(head);
  const tail = box(0.08, 0.7, 0.08, legM, 0, 1.15, -0.86);
  group.add(tail);
  group.add(blobShadow(1.6));
  return { group, head, tail };
}

/** A ground egg pickup: a small white ellipsoid. */
export function makeEggMesh(): THREE.Group {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 10),
    MAT.eggWhite,
  );
  m.scale.set(1, 1.25, 1);
  m.position.y = 0.2;
  const g = new THREE.Group();
  g.add(m, blobShadow(0.5));
  return g;
}

/** A ground milk pickup: a little white bottle with a blue cap. */
export function makeMilkMesh(): THREE.Group {
  const g = new THREE.Group();
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.44, 10), MAT.eggWhite);
  bottle.position.y = 0.3;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 10), MAT.ribbon);
  cap.position.y = 0.58;
  g.add(bottle, cap, blobShadow(0.5));
  return g;
}

const CUSTOMER_VARIANTS = [
  { shirt: 0x3f7fbf, trousers: 0x46689c, skin: 0x8d5a3b, hat: 0xf29c38, hatStyle: 'sun' },
  { shirt: 0xe8873a, trousers: 0x5b4636, skin: 0xf6c795, hat: 0x9b7ed9, hatStyle: 'wide' },
  { shirt: 0x57a639, trousers: 0x3d405b, skin: 0xc68642, hat: 0x2e9e8f, hatStyle: 'cap' },
] as const;

/**
 * A customer in the farmer's proportions with its own palette and
 * hat: orange sun hat, wide purple hat, or teal cap. Same rig shape
 * as the farmer so one walk-cycle driver animates everyone.
 */
export function makeCustomer(variant: number): CharacterRig {
  const v = CUSTOMER_VARIANTS[variant % CUSTOMER_VARIANTS.length];
  const shirt = new THREE.MeshLambertMaterial({ color: v.shirt });
  const shirtDark = new THREE.MeshLambertMaterial({ color: new THREE.Color(v.shirt).multiplyScalar(0.82) });
  const trousers = new THREE.MeshLambertMaterial({ color: v.trousers });
  const skin = new THREE.MeshLambertMaterial({ color: v.skin });
  const hatMat = new THREE.MeshLambertMaterial({ color: v.hat });
  const group = new THREE.Group();

  const mkLeg = (side: number): THREE.Group => {
    const hip = new THREE.Group();
    hip.position.set(0.16 * side, 0.78, 0);
    hip.add(box(0.24, 0.62, 0.26, trousers, 0, -0.28, 0), box(0.26, 0.16, 0.4, MAT.boot, 0, -0.62, 0.05));
    group.add(hip);
    return hip;
  };
  const legL = mkLeg(-1);
  const legR = mkLeg(1);

  const body = new THREE.Group();
  body.position.y = 0.78;
  body.add(box(0.86, 0.78, 0.5, shirt, 0, 0.39, 0));
  body.add(box(0.2, 0.78, 0.5, shirtDark, 0.36, 0.39, 0));
  const mkArm = (side: number): THREE.Group => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.55 * side, 0.68, 0);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), skin);
    hand.position.set(0, -0.58, 0);
    shoulder.add(box(0.22, 0.6, 0.24, shirt, 0, -0.26, 0), hand);
    body.add(shoulder);
    return shoulder;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);

  const head = new THREE.Group();
  head.position.y = 0.92;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), skin);
  skull.position.y = 0.16;
  head.add(skull);
  if (v.hatStyle === 'sun') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.08, 16), hatMat);
    brim.position.y = 0.38;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
    dome.position.y = 0.4;
    head.add(brim, dome);
  } else if (v.hatStyle === 'wide') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.76, 0.07, 18), hatMat);
    brim.position.y = 0.36;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.3, 12), hatMat);
    crown.position.y = 0.52;
    head.add(brim, crown);
  } else {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
    dome.position.y = 0.3;
    const peak = box(0.44, 0.06, 0.34, hatMat, 0, 0.32, 0.42);
    head.add(dome, peak);
  }
  body.add(head);
  group.add(body);
  group.add(blobShadow(0.55));
  return { group, legL, legR, armL, armR, body };
}

/**
 * The farmer, built from primitives in the game's own proportions:
 * straw hat, red shirt, denim overalls. Limbs pivot at the shoulder
 * and hip so the walk cycle is a swing, and the whole rig faces its
 * movement direction at runtime. Original model, drawn in code.
 */
export function makeFarmer(): FarmerRig {
  const group = new THREE.Group();
  // The farmer wears cloned materials so shop skins can recolour
  // him at runtime without touching the shared palette (customers
  // and props keep their own colours).
  const mats = {
    shirt: MAT.shirtRed.clone(),
    denim: MAT.denim.clone(),
    hat: MAT.straw.clone(),
    hatDark: MAT.strawDark.clone(),
    band: new THREE.MeshLambertMaterial({ color: 0xb5502f }),
  };

  const mkLeg = (side: number): THREE.Group => {
    const hip = new THREE.Group();
    hip.position.set(0.16 * side, 0.78, 0);
    const leg = box(0.24, 0.62, 0.26, mats.denim, 0, -0.28, 0);
    const bootMesh = box(0.26, 0.16, 0.4, MAT.boot, 0, -0.62, 0.05);
    hip.add(leg, bootMesh);
    group.add(hip);
    return hip;
  };
  const legL = mkLeg(-1);
  const legR = mkLeg(1);

  const body = new THREE.Group();
  body.position.y = 0.78;
  const torso = box(0.86, 0.78, 0.5, mats.shirt, 0, 0.39, 0);
  const bib = box(0.5, 0.44, 0.06, mats.denim, 0, 0.3, 0.27);
  body.add(torso, bib);

  const mkArm = (side: number): THREE.Group => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.55 * side, 0.68, 0);
    const arm = box(0.22, 0.6, 0.24, mats.shirt, 0, -0.26, 0);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), MAT.skin);
    hand.position.set(0, -0.58, 0);
    shoulder.add(arm, hand);
    body.add(shoulder);
    return shoulder;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);

  const head = new THREE.Group();
  head.position.y = 0.92;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), MAT.skin);
  skull.position.y = 0.16;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.09, 18), mats.hat);
  brim.position.y = 0.38;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.3, 14), mats.hatDark);
  crown.position.y = 0.55;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.4, 0.1, 14), mats.band);
  band.position.y = 0.44;
  head.add(skull, brim, crown, band);
  body.add(head);
  group.add(body);
  group.add(blobShadow(0.55));
  return { group, legL, legR, armL, armR, body, mats };
}
