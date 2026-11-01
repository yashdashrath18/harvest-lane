import * as THREE from 'three';
import { box, type FarmerRig } from './models';
import { DEFAULT_OUTFIT, outfitItem, type OutfitItem } from '../data/OutfitData';
import { farmerSkin, type CosmeticsState } from '../data/SkinData';

/**
 * Outfit attachments (master prompt 6): builds the hat, chain and
 * glasses meshes for an equipped item and applies the whole outfit
 * (shirt palette, hat, shoe colours, chain, glasses) to a farmer
 * rig. Used for the player and for the shop's preview farmer, so
 * what you preview is exactly what you wear.
 */
function lam(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

function clearGroup(g: THREE.Group): void {
  while (g.children.length > 0) g.remove(g.children[0]);
}

function buildHat(item: OutfitItem): THREE.Group {
  const g = new THREE.Group();
  const main = lam(item.color);
  const accent = lam(item.accent);
  if (item.style === 'cap') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), main);
    dome.position.y = 0.3;
    const peak = box(0.44, 0.06, 0.34, accent, 0, 0.32, 0.42);
    g.add(dome, peak);
  } else if (item.style === 'sun') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.76, 0.07, 18), main);
    brim.position.y = 0.36;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.3, 12), main);
    crown.position.y = 0.52;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.38, 0.09, 14), accent);
    band.position.y = 0.42;
    g.add(brim, crown, band);
  } else if (item.style === 'flower') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.09, 18), main);
    brim.position.y = 0.38;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.3, 14), main);
    crown.position.y = 0.55;
    g.add(brim, crown);
    // A little daisy pinned to the side.
    const petal = lam(item.accent);
    const centre = lam(0xffd94d);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), petal);
      p.position.set(0.34 + Math.cos(a) * 0.07, 0.5 + Math.sin(a) * 0.07, 0.24);
      g.add(p);
    }
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), centre);
    c.position.set(0.34, 0.5, 0.27);
    g.add(c);
  } else if (item.style === 'cone') {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.62, 14), main);
    cone.position.y = 0.62;
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), accent);
    pom.position.y = 0.96;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.33, 0.09, 14), accent);
    band.position.y = 0.33;
    g.add(cone, pom, band);
  } else if (item.style === 'crown') {
    const bandC = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.22, 14), main);
    bandC.position.y = 0.42;
    g.add(bandC);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), main);
      spike.position.set(Math.sin(a) * 0.3, 0.6, Math.cos(a) * 0.3);
      g.add(spike);
    }
    const gem = box(0.12, 0.16, 0.05, accent, 0, 0.42, 0.35);
    g.add(gem);
  }
  return g;
}

function buildChain(item: OutfitItem): THREE.Group {
  // Built relative to the neck anchor (the slot group sits there),
  // so the walk sway can pivot the slot naturally.
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.04, 8, 20), lam(item.color));
  ring.rotation.x = 0.62;
  g.add(ring);
  if (item.style === 'pendant') {
    const gem = box(0.13, 0.17, 0.06, lam(item.accent), 0, -0.22, 0.17);
    gem.rotation.x = 0.3;
    g.add(gem);
  }
  return g;
}

function buildGlasses(item: OutfitItem): THREE.Group {
  const g = new THREE.Group();
  const frame = lam(item.color);
  const lens = lam(item.accent);
  if (item.style === 'shades') {
    [-0.15, 0.15].forEach((x) => {
      const l = box(0.24, 0.13, 0.04, lens, x, 0.2, 0.31);
      g.add(l);
    });
    g.add(box(0.08, 0.03, 0.03, frame, 0, 0.24, 0.31));
  } else if (item.style === 'round') {
    [-0.15, 0.15].forEach((x) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 16), frame);
      r.position.set(x, 0.2, 0.31);
      g.add(r);
    });
    g.add(box(0.1, 0.025, 0.025, frame, 0, 0.22, 0.31));
  } else if (item.style === 'star') {
    [-0.15, 0.15].forEach((x) => {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 5), frame);
      s.rotation.x = Math.PI / 2;
      s.rotation.z = 0.3;
      s.position.set(x, 0.2, 0.31);
      g.add(s);
    });
    g.add(box(0.08, 0.03, 0.03, frame, 0, 0.24, 0.31));
  }
  return g;
}

/** Applies the full outfit state to a rig (player or preview). */
export function applyOutfit(rig: FarmerRig, c: CosmeticsState): void {
  if (!rig.mats || !rig.head) return;
  // Shirt palette first: the straw hat's colours follow the shirt.
  const f = farmerSkin(c.farmer);
  rig.mats.shirt.color.setHex(f.shirt);
  rig.mats.denim.color.setHex(f.denim);
  rig.mats.hat.color.setHex(f.hat);
  rig.mats.hatDark.color.setHex(f.hatDark);
  rig.mats.band.color.setHex(f.band);

  // Hat slot: the built-in straw hat is the rig's own meshes; any
  // other hat hides them and builds its attachment instead.
  if (!rig.hatSlot) {
    rig.hatSlot = new THREE.Group();
    rig.head.add(rig.hatSlot);
  }
  clearGroup(rig.hatSlot);
  const hatItem = outfitItem(c.hat);
  const straw = c.hat === DEFAULT_OUTFIT.hat || !hatItem;
  rig.hatMeshes?.forEach((m) => (m.visible = straw));
  if (!straw && hatItem) rig.hatSlot.add(buildHat(hatItem));

  // Shoes: boot colour, plus a pale sole stripe for sneakers.
  const shoeItem = outfitItem(c.shoes);
  rig.mats.boot.color.setHex(shoeItem ? shoeItem.color : 0x6b4a2b);
  rig.boots?.forEach((b) => {
    while (b.children.length > 0) b.remove(b.children[0]);
    if (shoeItem?.style === 'sneakers') {
      const sole = box(0.27, 0.05, 0.41, rig.mats!.bootAccent, 0, -0.06, 0.005);
      b.add(sole);
    }
  });

  // Chain slot on the chest, anchored at the neck for the sway.
  if (!rig.chainSlot) {
    rig.chainSlot = new THREE.Group();
    rig.chainSlot.position.set(0, 0.84, 0.16);
    rig.body.add(rig.chainSlot);
  }
  clearGroup(rig.chainSlot);
  const chainItem = outfitItem(c.chain);
  if (chainItem) rig.chainSlot.add(buildChain(chainItem));

  // Glasses slot on the face.
  if (!rig.glassesSlot) {
    rig.glassesSlot = new THREE.Group();
    rig.head.add(rig.glassesSlot);
  }
  clearGroup(rig.glassesSlot);
  const glassItem = outfitItem(c.glasses);
  if (glassItem) rig.glassesSlot.add(buildGlasses(glassItem));
}
