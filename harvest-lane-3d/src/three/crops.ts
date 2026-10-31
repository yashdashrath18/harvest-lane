import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from '../utils/assetUrl';

/**
 * Crop models for the 3D game. Each growth stage is ONE merged
 * geometry with vertex colours, so a whole field of 200 crops costs
 * one draw call per visible crop and shares four geometries per
 * crop type. All shapes are primitives arranged in code.
 */
const LEAF = new THREE.Color(0x4e9a45);
const LEAF_DARK = new THREE.Color(0x3f8438);
const LEAF_LIGHT = new THREE.Color(0x7ec850);
const GOLD = new THREE.Color(0xf7b733);
const GOLD_LIGHT = new THREE.Color(0xffd94d);
const ORANGE = new THREE.Color(0xe8873a);
const STEM = new THREE.Color(0x4a8a3d);

function paint(geo: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const count = geo.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function part(
  geo: THREE.BufferGeometry,
  color: THREE.Color,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.BufferGeometry {
  geo.rotateX(rx);
  geo.rotateY(ry);
  geo.rotateZ(rz);
  geo.translate(x, y, z);
  return paint(geo, color);
}

/** A leaf: a flattened, bent box. */
function leaf(len: number, x: number, y: number, z: number, ry: number, tilt: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(0.1, len, 0.38);
  geo.translate(0, len / 2, 0);
  return part(geo, LEAF, x, y, z, tilt, ry, 0);
}

function cornStage(stage: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  if (stage === 0) {
    parts.push(part(new THREE.ConeGeometry(0.09, 0.3, 6), LEAF_LIGHT, -0.07, 0.13, 0, 0, 0, 0.5));
    parts.push(part(new THREE.ConeGeometry(0.09, 0.34, 6), LEAF, 0.07, 0.15, 0, 0, 0, -0.5));
    return mergeGeometries(parts)!;
  }
  const stemH = stage === 1 ? 0.55 : stage === 2 ? 1.05 : 1.35;
  parts.push(part(new THREE.CylinderGeometry(0.045, 0.06, stemH, 6), STEM, 0, stemH / 2, 0));
  parts.push(leaf(0.5, 0, stemH * 0.35, 0, 0.4, 0.7));
  parts.push(leaf(0.5, 0, stemH * 0.45, 0, 2.5, 0.7));
  if (stage >= 2) {
    parts.push(leaf(0.55, 0, stemH * 0.62, 0, 1.4, 0.75));
    parts.push(leaf(0.55, 0, stemH * 0.72, 0, 3.6, 0.75));
    parts.push(leaf(0.4, 0, stemH * 0.95, 0, 5.3, 0.5));
  }
  if (stage === 3) {
    const cob = (x: number, y: number, z: number, rz: number) => {
      // Plump cob with a lighter kernel sheen and an open husk.
      parts.push(part(new THREE.CapsuleGeometry(0.14, 0.34, 3, 10), GOLD, x, y, z, 0, 0, rz));
      parts.push(part(new THREE.CapsuleGeometry(0.09, 0.2, 3, 8), GOLD_LIGHT, x, y + 0.06, z + 0.07, 0, 0, rz));
      parts.push(part(new THREE.ConeGeometry(0.17, 0.36, 6), LEAF_LIGHT, x, y - 0.26, z, Math.PI, 0, rz * 0.4));
      parts.push(part(new THREE.ConeGeometry(0.13, 0.3, 6), LEAF, x - 0.08, y - 0.2, z - 0.04, Math.PI, 0, rz * 0.4 + 0.5));
    };
    cob(0.19, 0.78, 0.05, -0.5);
    cob(-0.18, 0.97, -0.04, 0.55);
    cob(0.02, 1.14, 0.15, -0.15);
    // Silky tassel crowning the stalk.
    const TASSEEL = new THREE.Color(0xc98d4e);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      parts.push(
        part(new THREE.ConeGeometry(0.045, 0.3, 5), TASSEEL, Math.cos(a) * 0.07, stemH + 0.12, Math.sin(a) * 0.07, Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5),
      );
    }
  }
  return mergeGeometries(parts)!;
}

function carrotStage(stage: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const tuft = (scale: number, y: number) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      parts.push(
        part(
          new THREE.ConeGeometry(0.07, 0.42 * scale, 5),
          i % 2 ? LEAF : LEAF_DARK,
          Math.cos(a) * 0.09,
          y + 0.18 * scale,
          Math.sin(a) * 0.09,
          Math.sin(a) * 0.45,
          0,
          Math.cos(a) * 0.45,
        ),
      );
    }
  };
  if (stage === 0) tuft(0.45, 0);
  else if (stage === 1) tuft(0.75, 0);
  else tuft(1.05, 0);
  if (stage === 3) {
    // Plump orange shoulders with paler tips, ready to pull.
    const shoulder = (x: number, z: number) => {
      parts.push(part(new THREE.CylinderGeometry(0.12, 0.07, 0.2, 9), ORANGE, x, 0.06, z));
      parts.push(part(new THREE.CylinderGeometry(0.07, 0.03, 0.12, 8), new THREE.Color(0xf2a65e), x, -0.02, z));
    };
    shoulder(-0.09, 0.04);
    shoulder(0.1, -0.05);
    shoulder(0.0, 0.13);
  }
  return mergeGeometries(parts)!;
}

export const CROP_MATERIAL = new THREE.MeshLambertMaterial({ vertexColors: true });

export const CROP_GEOMETRIES: Record<string, THREE.BufferGeometry[]> = {
  corn: [0, 1, 2, 3].map(cornStage),
  carrot: [0, 1, 2, 3].map(carrotStage),
};

// ---------------------------------------------------------------------------
// Real crop models: Quaternius Ultimate Crops (CC0, see docs/ASSETS.md),
// converted at load time into the same merged, vertex-coloured geometry
// format the procedural crops use, so CropField3D and its single
// CROP_MATERIAL work unchanged. If the files cannot load, the procedural
// geometries above simply stay in place.
// ---------------------------------------------------------------------------

// Carrots only. The pack's corn was evaluated in-game on 2026-10-31
// and rejected: at the correct scale its ripe stage reads as thin
// weeds with no visible cobs, while the procedural corn (chunky
// stalk, wide leaves, three gold cobs) reads far better on a phone.
// The carrot stages, by contrast, beat the procedural cone tufts.
const REAL_CROP_FILES: Record<string, string[]> = {
  carrot: ['models/Carrot_1.glb', 'models/Carrot_2.glb', 'models/Carrot_3.glb', 'models/Carrot_4.glb'],
};
/** Ripe-stage height in world units, matched to the procedural crops. */
const REAL_CROP_HEIGHT: Record<string, number> = { carrot: 0.6 };

function baseColorOf(material: THREE.Material): THREE.Color {
  const m = material as THREE.MeshStandardMaterial;
  const color = m.color ? m.color.clone() : new THREE.Color(1, 1, 1);
  // The pack's palette is authored for a tone-mapped showcase viewer;
  // under this game's flat Lambert lighting it reads too dark, so the
  // baked colours get a lift (linear space, clamped).
  color.multiplyScalar(1.45);
  color.r = Math.min(1, color.r);
  color.g = Math.min(1, color.g);
  color.b = Math.min(1, color.b);
  return color;
}

/** Bakes each primitive's material colour into a vertex colour attribute. */
function bakeVertexColors(geo: THREE.BufferGeometry, mesh: THREE.Mesh): THREE.BufferGeometry {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const deindexed = geo.index ? geo.toNonIndexed() : geo;
  const count = deindexed.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const groups = deindexed.groups.length > 0 ? deindexed.groups : [{ start: 0, count, materialIndex: 0 }];
  for (const group of groups) {
    const color = baseColorOf(mats[group.materialIndex ?? 0] ?? mats[0]);
    const end = Math.min(count, group.start + group.count);
    for (let i = group.start; i < end; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
  }
  deindexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  deindexed.deleteAttribute('uv');
  return deindexed;
}

async function loadStageGeometry(loader: GLTFLoader, file: string): Promise<THREE.BufferGeometry | null> {
  const gltf = await loader.loadAsync(assetUrl(file));
  gltf.scene.updateWorldMatrix(true, true);
  const parts: THREE.BufferGeometry[] = [];
  gltf.scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const baked = bakeVertexColors(obj.geometry.clone().applyMatrix4(obj.matrixWorld), obj);
      parts.push(baked);
    }
  });
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0] : mergeGeometries(parts);
}

/**
 * Replaces the procedural crop geometries with the real models,
 * normalised so the ripe stage matches the procedural height and
 * every stage of a crop shares one scale. Returns false (keeping
 * the procedural crops) when anything fails to load.
 */
export async function loadRealCropGeometries(): Promise<boolean> {
  const loader = new GLTFLoader();
  let anyLoaded = false;
  for (const [cropId, files] of Object.entries(REAL_CROP_FILES)) {
    try {
      const raw: THREE.BufferGeometry[] = [];
      for (const file of files) {
        const geo = await loadStageGeometry(loader, file);
        if (!geo) throw new Error(`no geometry in ${file}`);
        raw.push(geo);
      }
      raw[3].computeBoundingBox();
      const bb = raw[3].boundingBox!;
      const scale = REAL_CROP_HEIGHT[cropId] / Math.max(0.01, bb.max.y - bb.min.y);
      const geoms = raw.map((geo) => {
        geo.scale(scale, scale, scale);
        geo.computeBoundingBox();
        geo.translate(0, -geo.boundingBox!.min.y, 0);
        return geo;
      });
      CROP_GEOMETRIES[cropId] = geoms;
      anyLoaded = true;
    } catch {
      /* this crop keeps its procedural geometries */
    }
  }
  return anyLoaded;
}
