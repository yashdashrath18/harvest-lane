import * as THREE from 'three';
import { MAT, box } from './models';
import { fenceRect, WORLD_COLLIDERS } from './World';
import { HOTEL_PLOT, X, Z, u } from '../game/Layout';

/**
 * The Grand Hotel landmark (master prompt 8): a fenced plot in the
 * east zone's south-east lawn with a three-storey building, a
 * barriered door and a hand-lettered sign. Locked, the sign counts
 * down to Level 10; unlocked, the barrier tips away and the sign
 * promises more. There is no interior and no interaction yet: this
 * is the landmark and the promise, hotel gameplay comes later.
 */
export interface HotelVisual {
  group: THREE.Group;
  /** Plays (or applies instantly) the Level 10 unlock moment. */
  unlock: (animate: boolean) => void;
  /** Per-frame tick for the barrier animation. */
  update: (dtSeconds: number) => void;
  isUnlocked: () => boolean;
}

function signTexture(unlocked: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 176;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff6df';
  ctx.fillRect(0, 0, 512, 176);
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 160);
  ctx.fillStyle = '#5b3a1a';
  ctx.textAlign = 'center';
  ctx.font = '900 54px sans-serif';
  ctx.fillText('🏨 GRAND HOTEL', 256, 74);
  ctx.font = '700 40px sans-serif';
  ctx.fillStyle = unlocked ? '#3e7d32' : '#a34d2d';
  ctx.fillText(unlocked ? 'Opening soon!' : 'Unlocks at Level 10', 256, 136);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildHotel(scene: THREE.Scene): HotelVisual {
  const g = new THREE.Group();
  const { x, y, w, h } = HOTEL_PLOT;
  const cx = X(x + w / 2);
  const cz = Z(y + h / 2);

  // Fenced plot with ONE gate, under the door on the south side
  // (playtest fixes, 2026-11-01): players walk in and stand at the
  // door; the building stays solid and the door stays barriered
  // until L10. A west gate was tried and removed the same day: the
  // building sits too close to the west fence, so that gate only
  // opened into a narrow pocket the player could not walk out of
  // toward the door. A dirt spur on the ground leads to this gate.
  g.add(fenceRect(HOTEL_PLOT, { s: [[u(95), u(145)]] }));

  // Stone platform and the main block.
  const stone = new THREE.MeshLambertMaterial({ color: 0xb8bcc2 });
  const cream = new THREE.MeshLambertMaterial({ color: 0xf7ead2 });
  const trim = new THREE.MeshLambertMaterial({ color: 0xc96f4a });
  const glassDark = new THREE.MeshLambertMaterial({ color: 0x35586e });
  const glassLit = new THREE.MeshLambertMaterial({ color: 0xffd94d });
  const platform = box(u(190), 0.24, u(150), stone, cx, 0.12, cz);
  g.add(platform);
  const main = box(4.6, 3.4, 2.9, cream, cx, 0.24 + 1.7, cz);
  const top = box(3.6, 1.3, 2.3, cream, cx, 0.24 + 3.4 + 0.65, cz);
  g.add(main, top);
  const band = box(4.7, 0.22, 3.0, trim, cx, 0.24 + 3.4, cz);
  g.add(band);
  // Pyramid roof.
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.5, 4), trim);
  roof.position.set(cx, 0.24 + 3.4 + 1.3 + 0.75, cz);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.72;
  g.add(roof);
  // Windows: a tidy grid on the front face, a few lit.
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const lit = (row * 4 + col) % 5 === 2;
      const win = box(0.55, 0.62, 0.06, lit ? glassLit : glassDark, cx - 1.65 + col * 1.1, 1.1 + row * 1.05, cz + 1.48);
      g.add(win);
    }
  }
  for (let col = 0; col < 3; col++) {
    const win = box(0.55, 0.55, 0.06, glassDark, cx - 1.1 + col * 1.1, 4.35, cz + 1.18);
    g.add(win);
  }
  // Door and awning.
  const door = box(0.9, 1.5, 0.08, MAT.woodDark, cx, 0.24 + 0.75, cz + 1.48);
  const awning = box(1.5, 0.1, 0.7, trim, cx, 1.85, cz + 1.75);
  awning.rotation.x = 0.25;
  g.add(door, awning);
  WORLD_COLLIDERS.push({ minX: cx - 2.4, maxX: cx + 2.4, minZ: cz - 1.6, maxZ: cz + 1.6 });

  // The barrier across the door: posts and a striped plank, in a
  // group pivoted at its base so unlocking can tip it away.
  const barrier = new THREE.Group();
  barrier.position.set(cx, 0.24, cz + 1.85);
  const postGeo = new THREE.BoxGeometry(0.14, 0.85, 0.14);
  [-0.75, 0.75].forEach((off) => {
    const p = new THREE.Mesh(postGeo, MAT.woodDark);
    p.position.set(off, 0.42, 0);
    barrier.add(p);
  });
  for (let i = 0; i < 4; i++) {
    const seg = box(0.42, 0.2, 0.06, i % 2 === 0 ? new THREE.MeshLambertMaterial({ color: 0xe2574c }) : MAT.white, -0.63 + i * 0.42, 0.55, 0);
    barrier.add(seg);
  }
  g.add(barrier);

  // The sign at the plot's path-side corner.
  const sign = new THREE.Group();
  const legL = box(0.14, 1.5, 0.14, MAT.woodDark, -1.2, 0.75, 0);
  const legR = box(0.14, 1.5, 0.14, MAT.woodDark, 1.2, 0.75, 0);
  sign.add(legL, legR);
  const signMat = new THREE.MeshLambertMaterial({ map: signTexture(false) });
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.05, 0.08), signMat);
  board.position.y = 1.65;
  sign.add(board);
  sign.position.set(X(x + 26), 0, Z(y + h - 24));
  sign.rotation.y = 0.5;
  g.add(sign);
  scene.add(g);

  let unlocked = false;
  let tipT = -1; // 0..1 while the barrier tips, -1 idle
  return {
    group: g,
    isUnlocked: () => unlocked,
    unlock(animate: boolean) {
      if (unlocked) return;
      unlocked = true;
      signMat.map = signTexture(true);
      signMat.needsUpdate = true;
      if (animate) {
        tipT = 0;
      } else {
        barrier.visible = false;
      }
    },
    update(dt: number) {
      if (tipT < 0) return;
      tipT = Math.min(1, tipT + dt / 0.8);
      barrier.rotation.x = -1.5 * tipT * tipT;
      barrier.position.y = 0.24 - 0.3 * tipT;
      if (tipT >= 1) {
        barrier.visible = false;
        tipT = -1;
      }
    },
  };
}
