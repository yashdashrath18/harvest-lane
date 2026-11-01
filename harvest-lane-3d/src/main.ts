import * as THREE from 'three';
import './ui/hud.css';
import { buildWorld, WORLD_COLLIDERS, WORLD_MATS, addFieldVisuals } from './three/World';
import { applyOutfit } from './three/outfits';
import { buildHotel, type HotelVisual } from './three/hotel';
import { HOTEL_UNLOCK_LEVEL } from './data/HotelData';
import { BASE_ITEMS, DEFAULT_OUTFIT, OUTFIT_CATEGORIES, outfitItem, outfitItemsIn, type OutfitCategory } from './data/OutfitData';
import { STRIP_RECTS, EAST_FIELD_RECT } from './game/Layout';
import { LAND_PACK_COUNT, PLOTS_PER_PACK, landPackLevel, landPackPrice, EAST_FIELD } from './data/LandData';
import { CHURN_COST, CORN_PER_GEM, HELPER_COST, OFFLINE_CAP_HOURS, OFFLINE_MIN_MINUTES, offlineCoinsPerHour } from './data/EconomyData';
import {
  COW_BASE,
  COW_MAX_TIER,
  HEN_BASE,
  HEN_MAX_TIER,
  cowLevel,
  cowPrice,
  henLevel,
  henPrice,
  troughCapacity,
} from './data/AnimalData';
import { MAT, box, makeFarmer, type FarmerRig } from './three/models';
import { SPAWN, X, Z, u } from './game/Layout';
import { HUD } from './ui/HUD';
import { Controls } from './input/Controls';
import { Playables } from './platform/YouTubePlayablesAdapter';
import { Audio } from './systems/AudioSystem';
import { CropField3D } from './game/CropField3D';
import { loadRealCropGeometries } from './three/crops';
import { BackpackSystem } from './systems/BackpackSystem';
import { MissionSystem } from './systems/MissionSystem';
import { ProgressionSystem } from './systems/ProgressionSystem';
import { MarketSystem } from './systems/MarketSystem';
import { CustomerSystem3D } from './game/CustomerSystem3D';
import { EventBus, GameEvents } from './game/EventBus';
import { UNLOCKS, XP_VALUES, capacityBonusFor, totalXpForLevel, unlocksAt } from './data/LevelData';
import { SeedSystem, TRICKLE_INTERVAL_MS } from './systems/SeedSystem';
import { SEED_PACKS, seedBagCapacity } from './data/SeedData';
import { STALL_FRONT, STALL_POS } from './game/Layout';

const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x95d64e);
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);

const hemi = new THREE.HemisphereLight(0xfff6de, 0x5d8a3c, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(8, 18, 6);
scene.add(sun);

buildWorld(scene);

// The east crossing starts barricaded (master prompt S3): crossed
// planks on the old perimeter's east gap, removed by the first land
// purchase out there. Its collider keeps the player honest until then.
const barricade = new THREE.Group();
{
  const plankGeo = new THREE.BoxGeometry(0.18, 2.2, 0.5);
  [-0.7, 0.7].forEach((off) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), MAT.woodDark);
    post.position.set(off, 0.55, 0);
    barricade.add(post);
  });
  [0.35, 0.8].forEach((h, i) => {
    const plank = new THREE.Mesh(plankGeo, MAT.wood);
    plank.rotation.z = i === 0 ? 0.5 : -0.5;
    plank.rotation.y = Math.PI / 2;
    plank.position.set(0, h, 0);
    barricade.add(plank);
  });
  barricade.position.set(X(1068), 0, Z(845));
  scene.add(barricade);
}
// The Grand Hotel landmark stands in the east zone from day one,
// barriered and signposted until Level 10 (master prompt S8).
const hotel: HotelVisual = buildHotel(scene);
let hotelUnlocked = false;
function unlockHotel(animate: boolean): void {
  if (hotelUnlocked) return;
  hotelUnlocked = true;
  hotel.unlock(animate);
  if (animate) {
    const hx = X(1450);
    const hz = Z(1050);
    panTo(hx, hz, 1.6);
    floatAt('🏨 GRAND HOTEL UNLOCKED!', hx, hz - 2, '#ffd9a0');
    bursts.spawn(hx, hz, 0xffc93c, 16, 1.4);
    Audio.playSuccess();
    saveDirty = true;
  }
}

const barricadeCollider = { minX: X(1068) - 0.25, maxX: X(1068) + 0.25, minZ: Z(795), maxZ: Z(895) };
WORLD_COLLIDERS.push(barricadeCollider);
let barricadeRemoved = false;
function removeBarricade(): void {
  if (barricadeRemoved) return;
  barricadeRemoved = true;
  barricade.visible = false;
  const i = WORLD_COLLIDERS.indexOf(barricadeCollider);
  if (i >= 0) WORLD_COLLIDERS.splice(i, 1);
}

const farmer: FarmerRig = makeFarmer();
farmer.group.position.set(X(SPAWN.x), 0, Z(SPAWN.y));
scene.add(farmer.group);

const hud = new HUD(app);
const controls = new Controls(renderer.domElement);

// Game state for the farming loop.
const backpack = new BackpackSystem(10);
const missions = new MissionSystem();
const progression = new ProgressionSystem();
const seeds = new SeedSystem();

/** Refreshes the seed bag readout (total/capacity plus per-crop counts). */
function refreshSeeds(): void {
  hud.setSeeds(
    `🌱 Seeds ${seeds.total}/${seedBagCapacity(progression.level)} · 🌽 ${seeds.countOf('corn')} 🥕 ${seeds.countOf('carrot')}`,
  );
}
hud.setLevel(1, 0);
const cropField = new CropField3D(scene);
// Real CC0 crop models (Quaternius) swap in over the procedural
// crops when they arrive; the game runs either way.
void loadRealCropGeometries().then((ok) => {
  if (ok) cropField.refreshCropModels();
});
hud.setBag(0, backpack.capacity);
// The 3D edition harvests by walking over crops (Yash's design
// change), so the HUD harvest button has no job here.
(hud.root.querySelector('#btn-harvest') as HTMLElement).style.display = 'none';

const ITEM_CHIP: Record<string, string> = { corn: '🌽', carrot: '🥕', egg: '🥚', milk: '🥛', cheese: '🧀' };
function refreshObjective(): void {
  const rows = missions.describe();
  const active = rows.find((r) => !r.claimed && !r.complete) ?? rows.find((r) => !r.claimed);
  if (!active) {
    hud.setObjective('All missions complete', '⭐');
    return;
  }
  const chip = active.id.includes('egg')
    ? '🥚'
    : active.id.includes('area')
      ? '⭐'
      : active.id.includes('serve')
        ? '🧑'
        : '🌽';
  const suffix = active.complete ? ' ... claim it in MISSIONS' : ` (${active.progress}/${active.target})`;
  hud.setObjective(`${active.title}${suffix}`, chip);
}
refreshObjective();

const project = new THREE.Vector3();
function floatAt(text: string, wx: number, wz: number, color?: string): void {
  project.set(wx, 1.6, wz).project(camera);
  const sx = (project.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-project.y * 0.5 + 0.5) * window.innerHeight;
  hud.floatText(text, sx, sy, color);
}

// Tiny pooled particle bursts for harvest, sales and level-ups:
// the juice that makes actions feel physical.
interface BurstParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}
class BurstPool {
  private parts: BurstParticle[] = [];
  private geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  private mats = new Map<number, THREE.Material>();
  constructor(private sceneRef: THREE.Scene) {}
  spawn(x: number, z: number, color: number, count = 10, y = 0.9): void {
    let mat = this.mats.get(color);
    if (!mat) {
      mat = new THREE.MeshLambertMaterial({ color });
      this.mats.set(color, mat);
    }
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 1.6;
      this.parts.push({ mesh, vx: Math.cos(a) * sp, vy: 2.2 + Math.random() * 1.6, vz: Math.sin(a) * sp, life: 0.55 });
      this.sceneRef.add(mesh);
    }
  }
  update(dt: number): void {
    this.parts = this.parts.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) {
        this.sceneRef.remove(p.mesh);
        return false;
      }
      p.vy -= 6.5 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 5;
      p.mesh.rotation.y += dt * 7;
      p.mesh.scale.setScalar(Math.max(0.2, Math.min(1, p.life / 0.3)));
      return true;
    });
  }
}
const bursts = new BurstPool(scene);

/** Refreshes the level badge (number, bar, xp count). */
function refreshLevel(): void {
  hud.setLevel(
    progression.level,
    progression.levelFraction,
    `${progression.xpIntoLevel}/${ProgressionSystem.xpForNext(progression.level)}`,
  );
}

// "+N XP" floats are batched so a fast harvest sweep shows one tidy
// number instead of a stream (master prompt 1.3).
let pendingXpFloat = 0;
let xpFloatTimer: ReturnType<typeof setTimeout> | null = null;
function queueXpFloat(amount: number): void {
  pendingXpFloat += amount;
  if (xpFloatTimer) return;
  xpFloatTimer = setTimeout(() => {
    xpFloatTimer = null;
    if (pendingXpFloat > 0) floatAt(`+${pendingXpFloat} XP`, playerPos.x, playerPos.z - 0.8, '#c39bff');
    pendingXpFloat = 0;
  }, 600);
}

/** Awards XP and celebrates a level-up (panel, gems, capacity, confetti). */
function gainXp(amount: number): void {
  const capBefore = capacityBonusFor(progression.level);
  const res = progression.gain(amount);
  refreshLevel();
  queueXpFloat(amount);
  if (res.levelsGained > 0) {
    const gems = ProgressionSystem.gemsPerLevel * res.levelsGained;
    market.addGems(gems);
    const capGain = capacityBonusFor(res.level) - capBefore;
    const rewards = [`+${gems} 💎`];
    if (capGain > 0) rewards.push(`+${capGain} 🎒 backpack space`);
    const unlockLabels: string[] = [];
    for (let l = res.level - res.levelsGained + 1; l <= res.level; l++) {
      for (const u of unlocksAt(l)) unlockLabels.push(`${u.icon} ${u.label}`);
    }
    hud.showLevelUp(res.level, rewards.join(' · '), unlockLabels);
    hud.bumpLevel();
    bursts.spawn(playerPos.x, playerPos.z, 0xffc93c, 14, 1.4);
    bursts.spawn(playerPos.x, playerPos.z, 0x57b93c, 14, 1.3);
    bursts.spawn(playerPos.x, playerPos.z, 0x6bb7ff, 14, 1.5);
    Audio.playSuccess();
    applyUpgrades();
    if (res.level >= HOTEL_UNLOCK_LEVEL) unlockHotel(true);
  }
}

cropField.onHarvest = (cropId, wx, wz) => {
  const added = backpack.add(cropId, 1);
  if (added <= 0) return false;
  missions.track('harvest', cropId, 1);
  gainXp(XP_VALUES.harvest);
  Audio.playHarvest();
  bursts.spawn(wx, wz, cropId === 'carrot' ? 0xf08a2d : 0x7ec850, 7, 0.7);
  hud.setBag(backpack.total, backpack.capacity);
  floatAt(`+1 ${ITEM_CHIP[cropId] ?? ''}`, wx, wz);
  refreshObjective();
  return true;
};
cropField.onFull = () => {
  floatAt('Backpack full', playerPos.x, playerPos.z, '#ffb3a3');
  Audio.playError();
};

/**
 * Seed care (master prompt S2): the anti-softlock trickle and the
 * out-of-seeds hint. Runs while playing; both checks are cheap and
 * throttled to a 250ms tick.
 */
let trickleMs = 0;
let seedHintMs = 0;
function seedCareStep(dtMs: number): void {
  seedHintMs += dtMs;
  const stockTotal = Object.values(market.snapshot().stock).reduce((a, b) => a + b, 0);
  const deadEnd = SeedSystem.shouldTrickle({
    seedsTotal: seeds.total,
    coins: market.coins,
    hasRipeCrop: cropField.readyCount() > 0,
    hasSellable: backpack.total > 0 || stockTotal > 0 || market.pendingCash > 0,
  });
  if (deadEnd) {
    trickleMs += dtMs;
    if (trickleMs >= TRICKLE_INTERVAL_MS) {
      trickleMs = 0;
      if (seeds.add('corn', 1, seedBagCapacity(progression.level)) > 0) {
        floatAt('+1 🌽 seed (starter help)', playerPos.x, playerPos.z, '#b8f7a1');
        refreshSeeds();
      }
    }
  } else {
    trickleMs = 0;
  }
  if (seedHintMs >= 250) {
    seedHintMs = 0;
    const bareId = cropField.bareCropAt(playerPos.x, playerPos.z);
    hud.showSeedHint(bareId && seeds.countOf(bareId) === 0 ? bareId : null);
  }
}

// Planting (master prompt S2): walking over bare soil with seeds in
// the bag plants one, through the same path the helper uses.
cropField.onPlant = (cropId, wx, wz) => {
  if (!seeds.consume(cropId)) return false;
  missions.track('plant', cropId, 1);
  gainXp(XP_VALUES.plant);
  Audio.playPlant();
  bursts.spawn(wx, wz, 0x8a5a2b, 6, 0.6);
  refreshSeeds();
  refreshObjective();
  return true;
};

// Market and customers.
const market = new MarketSystem();
EventBus.on(GameEvents.CoinsChanged, (n) => hud.setCoins(n as number));
EventBus.on(GameEvents.GemsChanged, (n) => hud.setGems(n as number));
function refreshStockChip(): void {
  const stock = market.snapshot().stock;
  const parts = Object.entries(stock)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${ITEM_CHIP[id] ?? id} x${n}`);
  hud.setStock(parts.length ? `Stall: ${parts.join('  ')}` : 'Stall empty');
}
EventBus.on(GameEvents.StockChanged, refreshStockChip);
refreshStockChip();

const projector = (x: number, y: number, z: number) => {
  project.set(x, y, z).project(camera);
  return {
    sx: (project.x * 0.5 + 0.5) * window.innerWidth,
    sy: (-project.y * 0.5 + 0.5) * window.innerHeight,
    visible: project.z < 1,
  };
};
const customers = new CustomerSystem3D(scene, hud.root, projector);
let lastEarned = 0;
customers.onTryServe = (order) => {
  // Sale money lands on the physical cash pile by the stall; the
  // farmer collects it by walking over the pile.
  const earned = market.tryServe(order, true);
  if (earned <= 0) return false;
  lastEarned = earned;
  missions.track('sell', order.itemId, order.quantity);
  missions.track('serve', undefined, 1);
  gainXp(XP_VALUES.servePerItem * order.quantity);
  Audio.playCoin();
  refreshObjective();
  return true;
};
customers.onServed = (pos) => {
  floatAt('😊', pos.x, pos.z);
  floatAt(`+${lastEarned} coins`, pos.x, pos.z, '#ffe066');
};
customers.onWaveCleared = (servedAll) => {
  floatAt('Queue cleared! 🧘', playerPos.x, playerPos.z, '#b8f7a1');
  if (servedAll) {
    market.addPendingCash(5);
    floatAt('+5 🪙 calm bonus', playerPos.x, playerPos.z - 0.6, '#ffe066');
  }
};
customers.onTimeout = (pos) => {
  floatAt('😞', pos.x, pos.z);
  Audio.playError();
};

// Animals and their pickups.
import { AnimalSystem3D } from './game/AnimalSystem3D';
const animals = new AnimalSystem3D(scene);
// The real CC0 cow model (Quaternius) replaces the procedural cows
// when it arrives; the game runs either way.
void animals.loadCowModel();
animals.onCollect = (itemId, wx, wz) => {
  const added = backpack.add(itemId, 1);
  if (added <= 0) return false;
  missions.track('collect', itemId, 1);
  gainXp(XP_VALUES.collect);
  Audio.playPickup();
  hud.setBag(backpack.total, backpack.capacity);
  floatAt(`+1 ${ITEM_CHIP[itemId] ?? ''}`, wx, wz);
  refreshObjective();
  return true;
};
animals.onAmbient = (kind) => {
  if (kind === 'chicken') Audio.playCluck();
  else Audio.playMoo();
};
animals.onHungry = (kind) => {
  const pos = animals.troughPos(kind);
  floatAt(
    kind === 'chicken' ? '🐔 Hungry! Bring 🌽 to the trough' : '🐄 Hungry! Bring 🌽 to the trough',
    pos.x,
    pos.z,
    '#ffb3a3',
  );
  Audio.playError();
};

// Feeding: stand at a trough holding corn and it stocks itself.
let feedTimerMs = 0;
function feedStep(dtMs: number): void {
  for (const kind of ['chicken', 'cow'] as const) {
    const tp = animals.troughPos(kind);
    const dx = playerPos.x - tp.x;
    const dz = playerPos.z - tp.z;
    if (dx * dx + dz * dz < 1.7 * 1.7 && backpack.countOf('corn') > 0 && animals.feedOf(kind) < animals.feedMaxOf(kind)) {
      feedTimerMs += dtMs;
      while (feedTimerMs >= 260) {
        feedTimerMs -= 260;
        if (backpack.remove('corn', 1) <= 0) break;
        if (animals.addFeed(kind, 1) <= 0) {
          backpack.add('corn', 1);
          break;
        }
        hud.setBag(backpack.total, backpack.capacity);
        floatAt('+1 🌽 feed', tp.x, tp.z, '#ffe066');
        Audio.playPickup();
        if (backpack.countOf('corn') <= 0 || animals.feedOf(kind) >= animals.feedMaxOf(kind)) break;
      }
      return;
    }
  }
  feedTimerMs = 0;
}

// The cash pile: sale money stacks up physically beside the stall
// in three size tiers until the farmer walks over it.
const PILE_POS = { x: X(765), z: Z(1398) };
const pileGroup = new THREE.Group();
const pileTiers: THREE.Group[] = [];
{
  const gold = new THREE.MeshLambertMaterial({ color: 0xf2c14e });
  const bill = new THREE.MeshLambertMaterial({ color: 0x57b93c });
  const coinGeo = new THREE.CylinderGeometry(0.34, 0.38, 0.09, 14);
  const mkTier = (build: (g: THREE.Group) => void): THREE.Group => {
    const g = new THREE.Group();
    build(g);
    g.visible = false;
    pileGroup.add(g);
    pileTiers.push(g);
    return g;
  };
  mkTier((g) => {
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(coinGeo, gold);
      c.position.set((i - 1) * 0.3, 0.05 + i * 0.02, (i % 2) * 0.24 - 0.1);
      g.add(c);
    }
  });
  mkTier((g) => {
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(coinGeo, gold);
      c.position.set(-0.35 + (i % 3) * 0.34, 0.05 + Math.floor(i / 3) * 0.1, 0.28);
      g.add(c);
    }
    const b = box(0.62, 0.1, 0.3, bill, 0.3, 0.1, -0.3);
    b.rotation.y = 0.5;
    g.add(b);
  });
  mkTier((g) => {
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(coinGeo, gold);
      c.position.set(0.42, 0.05 + i * 0.095, -0.32);
      g.add(c);
    }
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), bill);
    bag.scale.set(1, 0.82, 1);
    bag.position.set(-0.15, 0.26, 0.05);
    g.add(bag);
    const b = box(0.62, 0.1, 0.3, bill, 0.1, 0.22, 0.34);
    b.rotation.y = -0.4;
    g.add(b);
  });
  const pallet = box(1.5, 0.09, 1.2, MAT.wood, 0, 0.045, 0);
  pileGroup.add(pallet);
  pileGroup.position.set(PILE_POS.x, 0, PILE_POS.z);
  scene.add(pileGroup);
}
function refreshPile(): void {
  const n = market.pendingCash;
  pileTiers[0].visible = n > 0;
  pileTiers[1].visible = n >= 50;
  pileTiers[2].visible = n >= 150;
}
EventBus.on(GameEvents.CashPileChanged, () => {
  refreshPile();
  saveDirty = true;
});

// The sneakers boost pad on the path south of spawn: step on it
// for 1.5x speed for two minutes.
const PAD_POS = { x: X(540), z: Z(1005) };
let boostUntilT = -1;
{
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 24),
    new THREE.MeshLambertMaterial({ color: 0xe2574c }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(PAD_POS.x, 0.03, PAD_POS.z);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.0, 24),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(PAD_POS.x, 0.03, PAD_POS.z);
  scene.add(disc, ring);
}

// The hired helper: works the fields on his own once bought.
import { HelperAI } from './game/HelperAI';
const helper = new HelperAI(scene, cropField);
helper.onHarvest = (cropId) => {
  missions.track('harvest', cropId, 1);
  refreshObjective();
};
helper.onDeposit = (itemId) => {
  market.addStock(itemId, 1);
};
// Helper tier 2 (Level 8+): he plants bare plots, drawing from the
// same seed bag, when there is nothing ripe and his arms are empty.
helper.canPlant = () => {
  if (progression.level < 8) return null;
  const ids = ['corn', 'carrot'].filter((id) => seeds.countOf(id) > 0);
  return ids.length > 0 ? ids : null;
};
helper.onPlant = (x, z) => {
  const cropId = cropField.bareCropAt(x, z);
  if (!cropId || !seeds.consume(cropId)) return;
  if (cropField.plantCropAt(x, z)) {
    missions.track('plant', cropId, 1);
    Audio.playPlant();
    refreshSeeds();
    refreshObjective();
  } else {
    seeds.add(cropId, 1, seedBagCapacity(progression.level));
  }
};

// The cheese churn: stands west of the stall once bought, turns
// milk into cheese (worth 3x) while the farmer stands at it.
const CHURN_POS = { x: X(706), z: Z(1305) };
const churnGroup = new THREE.Group();
{
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.85, 12), MAT.wood);
  barrel.position.y = 0.43;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.09, 12), MAT.woodLight);
  lid.position.y = 0.9;
  const paddle = box(0.09, 0.7, 0.09, MAT.woodDark, 0, 1.2, 0);
  paddle.rotation.z = 0.5;
  const signBoard = box(0.8, 0.4, 0.06, MAT.woodLight, 0, 1.35, 0.2);
  churnGroup.add(barrel, lid, paddle, signBoard);
  churnGroup.position.set(CHURN_POS.x, 0, CHURN_POS.z);
  churnGroup.visible = false;
  scene.add(churnGroup);
}
let churnTimerMs = 0;
function churnStep(dtMs: number): void {
  if (!churnOwned) return;
  const dx = playerPos.x - CHURN_POS.x;
  const dz = playerPos.z - CHURN_POS.z;
  if (dx * dx + dz * dz > 1.6 * 1.6 || backpack.countOf('milk') <= 0) {
    churnTimerMs = 0;
    return;
  }
  churnTimerMs += dtMs;
  while (churnTimerMs >= 700) {
    churnTimerMs -= 700;
    if (backpack.remove('milk', 1) <= 0) break;
    backpack.add('cheese', 1);
    gainXp(XP_VALUES.churn);
    hud.setBag(backpack.total, backpack.capacity);
    floatAt('+1 🧀', CHURN_POS.x, CHURN_POS.z, '#ffe066');
    Audio.playPickup();
    if (backpack.countOf('milk') <= 0) break;
  }
}

// Panels: shop, missions, settings, earn offers (phase 5).
import { UpgradeSystem } from './systems/UpgradeSystem';
import { SOUTH_FIELD } from './data/UpgradeData';
import {
  DEFAULT_COSMETICS,
  FARMER_SKINS,
  WEATHER_SKINS,
  ROAD_SKINS,
  farmerSkin,
  weatherSkin,
  roadSkin,
  skinPrice,
  type CosmeticsState,
  type SkinCategory,
  type SkinPrice,
} from './data/SkinData';
const upgrades = new UpgradeSystem();
let southUnlocked = false;
let helperHired = false;
let churnOwned = false;
let landPacks = 0;
let eastUnlocked = false;

// Camera celebration pan for land purchases (skippable by tapping).
let panUntil = -1;
let panPoint = new THREE.Vector3();
function panTo(x: number, z: number, seconds = 1.2): void {
  panPoint.set(x, 0, z);
  panUntil = clock.elapsedTime + seconds;
}
renderer.domElement.addEventListener('pointerdown', () => {
  panUntil = -1;
});

/** Builds one East Strip: fence, soil, plots, and (on purchase) the party. */
function buildStrip(index: number, celebrate: boolean): void {
  addFieldVisuals(scene, STRIP_RECTS[index], { w: [[u(62), u(138)]] });
  cropField.plantStrip(scene, index);
  removeBarricade();
  if (celebrate) {
    const c = STRIP_RECTS[index];
    const wx = X(c.x + c.w / 2);
    const wz = Z(c.y + c.h / 2);
    panTo(wx, wz);
    floatAt('🗺️ NEW LAND!', wx, wz, '#b8f7a1');
    bursts.spawn(wx, wz, 0x7ec850, 12, 1.1);
    Audio.playSuccess();
  }
}

function buildEastField(celebrate: boolean): void {
  addFieldVisuals(scene, EAST_FIELD_RECT, { w: [[u(192), u(268)]] });
  cropField.plantEast(scene);
  removeBarricade();
  if (celebrate) {
    const wx = X(EAST_FIELD_RECT.x + EAST_FIELD_RECT.w / 2);
    const wz = Z(EAST_FIELD_RECT.y + EAST_FIELD_RECT.h / 2);
    panTo(wx, wz);
    floatAt('🗺️ EAST FIELD!', wx, wz, '#b8f7a1');
    bursts.spawn(wx, wz, 0x7ec850, 16, 1.2);
    Audio.playSuccess();
  }
}
let cosmetics: CosmeticsState = { ...DEFAULT_COSMETICS, owned: [...DEFAULT_COSMETICS.owned] };

/** Applies the equipped cosmetics: farmer colours, weather light, road tint. */
function applyCosmetics(): void {
  applyOutfit(farmer, cosmetics);
  const w = weatherSkin(cosmetics.weather);
  (scene.background as THREE.Color).setHex(w.bg);
  sun.color.setHex(w.sun);
  sun.intensity = w.sunIntensity;
  hemi.color.setHex(w.hemi);
  hemi.intensity = w.hemiIntensity;
  if (WORLD_MATS.grass) WORLD_MATS.grass.color.setHex(w.grassTint);
  const r = roadSkin(cosmetics.road);
  if (WORLD_MATS.path) WORLD_MATS.path.color.setHex(r.tint);
}

function applyUpgrades(): void {
  backpack.setCapacity(upgrades.backpackCapacity() + progression.capacityBonus);
  hud.setBag(backpack.total, backpack.capacity);
  cropField.setGrowthScale(upgrades.growthFactor());
  market.priceMultiplier = upgrades.priceMultiplier();
}
function panelBody(): HTMLElement {
  return hud.root.querySelector('#panel-body')!;
}

let shopTab: 'upgrades' | 'skins' | 'seeds' | 'land' | 'animals' = 'upgrades';

function shopTabsHtml(): string {
  return `<div class="tab-row"><button class="tab-btn ${shopTab === 'upgrades' ? 'on' : ''}" data-shop-tab="upgrades">⬆️ Upgrades</button><button class="tab-btn ${shopTab === 'land' ? 'on' : ''}" data-shop-tab="land">🗺️ Land</button><button class="tab-btn ${shopTab === 'animals' ? 'on' : ''}" data-shop-tab="animals">🐔 Animals</button><button class="tab-btn ${shopTab === 'seeds' ? 'on' : ''}" data-shop-tab="seeds">🌱 Seeds</button><button class="tab-btn ${shopTab === 'skins' ? 'on' : ''}" data-shop-tab="skins">🎨 Skins</button></div>`;
}

function wireShopTabs(): void {
  panelBody()
    .querySelectorAll('[data-shop-tab]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-shop-tab');
        shopTab = tab === 'skins' ? 'skins' : tab === 'seeds' ? 'seeds' : tab === 'land' ? 'land' : tab === 'animals' ? 'animals' : 'upgrades';
        Audio.playClick();
        renderShop();
      }),
    );
}

function renderShop(): void {
  if (shopTab === 'skins') {
    renderSkins();
    return;
  }
  if (shopTab === 'seeds') {
    renderSeeds();
    return;
  }
  if (shopTab === 'land') {
    renderLand();
    return;
  }
  if (shopTab === 'animals') {
    renderAnimals();
    return;
  }
  const rows = upgrades
    .describe()
    .map((r) => {
      const pips = '●'.repeat(r.level) + '○'.repeat(r.maxLevel - r.level);
      const fx = r.effectNext ? `${r.effectNow} → ${r.effectNext}` : r.effectNow;
      const btn =
        r.nextCost === null
          ? '<button class="buy-btn" disabled>MAX</button>'
          : `<button class="buy-btn" data-buy="${r.id}" ${market.coins < r.nextCost ? 'disabled' : ''}>🪙 ${r.nextCost}</button>`;
      return `<div class="shop-row"><div class="shop-info"><div class="shop-name">${r.name} <span class="pips">${pips}</span></div><div class="shop-fx">${fx}</div></div>${btn}</div>`;
    })
    .join('');
  const south = southUnlocked
    ? '<div class="shop-row"><div class="shop-info"><div class="shop-name">South Field</div><div class="shop-fx">Unlocked: 48 carrot plots growing</div></div><button class="buy-btn" disabled>OPEN</button></div>'
    : progression.level < 3
      ? '<div class="shop-row"><div class="shop-info"><div class="shop-name">South Field 🥕</div><div class="shop-fx">48 carrot plots in the south</div></div><button class="buy-btn" disabled>🔒 Level 3</button></div>'
      : `<div class="shop-row"><div class="shop-info"><div class="shop-name">South Field</div><div class="shop-fx">${SOUTH_FIELD.blurb}</div></div><button class="buy-btn" data-buy="south-field" ${market.coins < SOUTH_FIELD.cost ? 'disabled' : ''}>🪙 ${SOUTH_FIELD.cost}</button></div>`;
  const helperRow = helperHired
    ? '<div class="shop-row"><div class="shop-info"><div class="shop-name">Farm Helper 🧑‍🌾</div><div class="shop-fx">Working your fields: harvests ripe crops and stocks the stall</div></div><button class="buy-btn" disabled>HIRED</button></div>'
    : `<div class="shop-row"><div class="shop-info"><div class="shop-name">Farm Helper 🧑‍🌾</div><div class="shop-fx">Harvests ripe crops and stocks the stall for you, all day</div></div><button class="buy-btn" data-buy="helper" ${market.coins < HELPER_COST ? 'disabled' : ''}>🪙 ${HELPER_COST}</button></div>`;
  const churnRow = churnOwned
    ? '<div class="shop-row"><div class="shop-info"><div class="shop-name">Cheese Churn 🧀</div><div class="shop-fx">Built by the stall: stand at it with milk to churn cheese (sells for 42)</div></div><button class="buy-btn" disabled>BUILT</button></div>'
    : progression.level < 6
      ? '<div class="shop-row"><div class="shop-info"><div class="shop-name">Cheese Churn 🧀</div><div class="shop-fx">Turn 1 milk (14) into 1 cheese (42)</div></div><button class="buy-btn" disabled>🔒 Level 6</button></div>'
      : `<div class="shop-row"><div class="shop-info"><div class="shop-name">Cheese Churn 🧀</div><div class="shop-fx">Turn 1 milk (14) into 1 cheese (42). Customers will start ordering it</div></div><button class="buy-btn" data-buy="churn" ${market.coins < CHURN_COST ? 'disabled' : ''}>🪙 ${CHURN_COST}</button></div>`;
  hud.openPanel('Shop', shopTabsHtml() + rows + south + helperRow + churnRow);
  wireShopTabs();
  panelBody()
    .querySelectorAll('[data-buy]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-buy')!;
        if (id === 'south-field') {
          if (!market.spendCoins(SOUTH_FIELD.cost)) return Audio.playError();
          southUnlocked = true;
          missions.track('area', undefined, 1);
          cropField.plantSouth(scene);
          seeds.add('carrot', 10, seedBagCapacity(progression.level));
          refreshSeeds();
          floatAt('+10 🥕 seeds', playerPos.x, playerPos.z, '#b8f7a1');
          customers.allowCarrot = true;
          Audio.playSuccess();
          refreshObjective();
          renderShop();
          return;
        }
        if (id === 'helper') {
          if (!market.spendCoins(HELPER_COST)) return Audio.playError();
          helperHired = true;
          helper.setActive(true);
          saveDirty = true;
          Audio.playSuccess();
          floatAt('🧑‍🌾 Helper hired!', playerPos.x, playerPos.z, '#b8f7a1');
          renderShop();
          return;
        }
        if (id === 'churn') {
          if (!market.spendCoins(CHURN_COST)) return Audio.playError();
          churnOwned = true;
          churnGroup.visible = true;
          customers.allowCheese = true;
          saveDirty = true;
          Audio.playSuccess();
          floatAt('🧀 Cheese churn built!', CHURN_POS.x, CHURN_POS.z, '#ffe066');
          renderShop();
          return;
        }
        if (upgrades.buy(id, market)) {
          Audio.playUpgrade();
          applyUpgrades();
          renderShop();
        } else Audio.playError();
      }),
    );
}

/** The Seeds tab: seed packs for the replant loop (master prompt S2). */
function renderSeeds(): void {
  const cap = seedBagCapacity(progression.level);
  const rows = SEED_PACKS.map((pack) => {
    const held = seeds.countOf(pack.cropId);
    const space = cap - seeds.total;
    const btn =
      space <= 0
        ? '<button class="buy-btn" disabled>BAG FULL</button>'
        : `<button class="buy-btn" data-seed-buy="${pack.cropId}" ${market.coins < pack.price ? 'disabled' : ''}>🪙 ${pack.price}</button>`;
    return `<div class="shop-row"><div class="shop-info"><div class="shop-name">${pack.icon} ${pack.label} ×${pack.packSize}</div><div class="shop-fx">In your bag: ${held} · Seed bag ${seeds.total}/${cap}${space > 0 && space < pack.packSize ? ` · only ${space} fit` : ''}</div></div>${btn}</div>`;
  }).join('');
  hud.openPanel(
    'Shop',
    shopTabsHtml() +
      rows +
      '<div class="earn-note">Harvested plots stay bare until you plant. Walk over bare soil with seeds in the bag to plant. The bag grows +2 per farm level.</div>',
  );
  wireShopTabs();
  panelBody()
    .querySelectorAll('[data-seed-buy]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        const pack = SEED_PACKS.find((p) => p.cropId === btn.getAttribute('data-seed-buy'))!;
        if (!market.spendCoins(pack.price)) return Audio.playError();
        const added = seeds.add(pack.cropId, pack.packSize, seedBagCapacity(progression.level));
        if (added <= 0) {
          market.addCoins(pack.price); // bag filled between render and tap: refund
          return Audio.playError();
        }
        Audio.playSuccess();
        refreshSeeds();
        renderSeeds();
      }),
    );
}

hud.onSeedHint = () => {
  shopTab = 'seeds';
  renderShop();
};

/** The Animals tab: hen and cow extension tiers (master prompt S4). */
function renderAnimals(): void {
  const row = (
    kind: 'chicken' | 'cow',
    emoji: string,
    name: string,
    base: number,
    maxTier: number,
    priceOf: (t: number) => number,
    levelOf: (t: number) => number,
  ): string => {
    const tier = animals.tierOf(kind);
    const count = base + tier;
    const trough = troughCapacity(tier);
    if (tier >= maxTier) {
      return `<div class="shop-row"><div class="shop-info"><div class="shop-name">${emoji} ${name} · ${count}</div><div class="shop-fx">Full flock: trough holds ${trough} corn</div></div><button class="buy-btn" disabled>MAX</button></div>`;
    }
    const price = priceOf(tier);
    const need = levelOf(tier);
    if (progression.level < need) {
      return `<div class="shop-row"><div class="shop-info"><div class="shop-name">${emoji} ${name} · ${count}</div><div class="shop-fx">Next: ${count + 1} animals, trough ${troughCapacity(tier + 1)}</div></div><button class="buy-btn" disabled>🔒 Level ${need}</button></div>`;
    }
    return `<div class="shop-row"><div class="shop-info"><div class="shop-name">${emoji} ${name} · ${count}</div><div class="shop-fx">Next: ${count + 1} animals, trough ${troughCapacity(tier + 1)}</div></div><button class="buy-btn" data-animal-tier="${kind}" ${market.coins < price ? 'disabled' : ''}>🪙 ${price}</button></div>`;
  };
  hud.openPanel(
    'Shop',
    shopTabsHtml() +
      row('chicken', '🐔', 'Hens', HEN_BASE, HEN_MAX_TIER, henPrice, henLevel) +
      row('cow', '🐄', 'Cows', COW_BASE, COW_MAX_TIER, cowPrice, cowLevel),
  );
  wireShopTabs();
  panelBody()
    .querySelectorAll('[data-animal-tier]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        const kind = btn.getAttribute('data-animal-tier') as 'chicken' | 'cow';
        const tier = animals.tierOf(kind);
        const price = kind === 'chicken' ? henPrice(tier) : cowPrice(tier);
        if (!market.spendCoins(price)) return Audio.playError();
        animals.addTier(kind);
        const pos = animals.troughPos(kind);
        floatAt(kind === 'chicken' ? '🐔 +1 Hen!' : '🐄 +1 Cow!', pos.x, pos.z, '#ffd9a0');
        Audio.playSuccess();
        panTo(pos.x, pos.z, 1.0);
        saveDirty = true;
        renderAnimals();
      }),
    );
}

/** The Land tab: East Strip packs and the East Field (master prompt S3). */
function renderLand(): void {
  const rows: string[] = [];
  for (let i = 0; i < LAND_PACK_COUNT; i++) {
    const name = `East Strip ${i + 1}`;
    if (i < landPacks) {
      rows.push(`<div class="shop-row"><div class="shop-info"><div class="shop-name">🗺️ ${name}</div><div class="shop-fx">Yours: ${PLOTS_PER_PACK} corn plots growing east</div></div><button class="buy-btn" disabled>OWNED</button></div>`);
    } else if (i > landPacks) {
      rows.push(`<div class="shop-row"><div class="shop-info"><div class="shop-name">🗺️ ${name}</div><div class="shop-fx">Buy Strip ${i} first</div></div><button class="buy-btn" disabled>🔒 Order</button></div>`);
    } else if (progression.level < landPackLevel(i)) {
      rows.push(`<div class="shop-row"><div class="shop-info"><div class="shop-name">🗺️ ${name}</div><div class="shop-fx">${PLOTS_PER_PACK} more corn plots east of the farm</div></div><button class="buy-btn" disabled>🔒 Level ${landPackLevel(i)}</button></div>`);
    } else {
      const price = landPackPrice(i);
      rows.push(`<div class="shop-row"><div class="shop-info"><div class="shop-name">🗺️ ${name}</div><div class="shop-fx">${PLOTS_PER_PACK} more corn plots east of the farm</div></div><button class="buy-btn" data-land-pack="${i}" ${market.coins < price ? 'disabled' : ''}>🪙 ${price}</button></div>`);
    }
  }
  if (eastUnlocked) {
    rows.push(`<div class="shop-row"><div class="shop-info"><div class="shop-name">🌾 East Field</div><div class="shop-fx">Yours: ${EAST_FIELD.plots} corn plots growing</div></div><button class="buy-btn" disabled>OWNED</button></div>`);
  } else if (progression.level < EAST_FIELD.level) {
    rows.push(`<div class="shop-row"><div class="shop-info"><div class="shop-name">🌾 East Field</div><div class="shop-fx">A whole new field of ${EAST_FIELD.plots} corn plots, past the strips</div></div><button class="buy-btn" disabled>🔒 Level ${EAST_FIELD.level}</button></div>`);
  } else {
    rows.push(`<div class="shop-row"><div class="shop-info"><div class="shop-name">🌾 East Field</div><div class="shop-fx">A whole new field of ${EAST_FIELD.plots} corn plots, past the strips</div></div><button class="buy-btn" data-buy-east="1" ${market.coins < EAST_FIELD.price ? 'disabled' : ''}>🪙 ${EAST_FIELD.price}</button></div>`);
  }
  hud.openPanel('Shop', shopTabsHtml() + rows.join(''));
  wireShopTabs();
  panelBody()
    .querySelectorAll('[data-land-pack]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-land-pack'));
        if (i !== landPacks) return Audio.playError();
        if (!market.spendCoins(landPackPrice(i))) return Audio.playError();
        landPacks++;
        buildStrip(i, true);
        missions.track('area', undefined, 1);
        saveDirty = true;
        refreshObjective();
        renderLand();
      }),
    );
  panelBody()
    .querySelectorAll('[data-buy-east]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        if (eastUnlocked) return Audio.playError();
        if (!market.spendCoins(EAST_FIELD.price)) return Audio.playError();
        eastUnlocked = true;
        buildEastField(true);
        missions.track('area', undefined, 1);
        saveDirty = true;
        refreshObjective();
        renderLand();
      }),
    );
}

/** The Skins tab: farmer outfits, weather themes and road styles. */
function renderSkins(): void {
  const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
  const priceText = (p: SkinPrice): string => (p.gems ? `💎 ${p.gems}` : p.coins ? `🪙 ${p.coins}` : 'FREE');
  const afford = (p: SkinPrice): boolean => (p.gems ? market.gems >= p.gems : p.coins ? market.coins >= p.coins : true);
  const row = (
    cat: SkinCategory,
    id: string,
    name: string,
    blurb: string,
    colors: number[],
    price: SkinPrice,
  ): string => {
    const equipped = cosmetics[cat] === id;
    const owned = cosmetics.owned.includes(id);
    const btn = equipped
      ? '<button class="buy-btn" disabled>ON ✓</button>'
      : owned
        ? `<button class="buy-btn claim" data-skin-equip="${cat}:${id}">EQUIP</button>`
        : `<button class="buy-btn" data-skin-buy="${cat}:${id}" ${afford(price) ? '' : 'disabled'}>${priceText(price)}</button>`;
    const swatches = colors.map((c) => `<span class="sw" style="background:${hex(c)}"></span>`).join('');
    return `<div class="shop-row"><div class="shop-info"><div class="shop-name">${name} <span class="swatches">${swatches}</span></div><div class="shop-fx">${blurb}</div></div>${btn}</div>`;
  };
  const farmerRows = FARMER_SKINS.map((s) => row('farmer', s.id, s.name, s.blurb, [s.shirt, s.denim, s.hat], s.price)).join('');
  const weatherRows = WEATHER_SKINS.map((s) => row('weather', s.id, s.name, s.blurb, [s.bg, s.sun], s.price)).join('');
  const roadRows = ROAD_SKINS.map((s) => row('road', s.id, s.name, s.blurb, [s.tint], s.price)).join('');
  // Outfit attachment rows (master prompt S6): base piece plus the
  // purchasable items of each category.
  const outfitRow = (cat: OutfitCategory, id: string, name: string, blurb: string, colors: number[], priceText: string, state: 'on' | 'equip' | 'buy' | 'locked', lockLabel = ''): string => {
    const btn =
      state === 'on'
        ? '<button class="buy-btn" disabled>ON ✓</button>'
        : state === 'equip'
          ? `<button class="buy-btn claim" data-outfit-equip="${cat}:${id}">EQUIP</button>`
          : state === 'locked'
            ? `<button class="buy-btn" disabled>${lockLabel}</button>`
            : `<button class="buy-btn" data-outfit-buy="${cat}:${id}">${priceText}</button>`;
    const swatches = colors.map((c) => `<span class="sw" style="background:${hex(c)}"></span>`).join('');
    return `<div class="shop-row"><div class="shop-info"><div class="shop-name">${name} <span class="swatches">${swatches}</span></div><div class="shop-fx">${blurb}</div></div>${btn}</div>`;
  };
  const outfitSections = OUTFIT_CATEGORIES.map((c) => {
    const baseId = DEFAULT_OUTFIT[c.id];
    const base = BASE_ITEMS[c.id];
    let rows = outfitRow(c.id, baseId, base.name, base.blurb, [], '', cosmetics[c.id] === baseId ? 'on' : 'equip');
    for (const item of outfitItemsIn(c.id)) {
      const equipped = cosmetics[c.id] === item.id;
      const owned = cosmetics.owned.includes(item.id);
      const price: SkinPrice = { coins: item.coins, gems: item.gems };
      if (equipped) rows += outfitRow(c.id, item.id, item.name, item.blurb, [item.color, item.accent], '', 'on');
      else if (owned) rows += outfitRow(c.id, item.id, item.name, item.blurb, [item.color, item.accent], '', 'equip');
      else if (item.level && progression.level < item.level)
        rows += outfitRow(c.id, item.id, item.name, item.blurb, [item.color, item.accent], '', 'locked', `🔒 Level ${item.level}`);
      else if (!afford(price))
        rows += outfitRow(c.id, item.id, item.name, item.blurb, [item.color, item.accent], priceText(price), 'locked', priceText(price));
      else rows += outfitRow(c.id, item.id, item.name, item.blurb, [item.color, item.accent], priceText(price), 'buy');
    }
    return `<div class="panel-sub">${c.icon} ${c.name}</div>` + rows;
  }).join('');
  hud.openPanel(
    'Shop',
    shopTabsHtml() +
      '<div class="outfit-preview" id="outfit-preview-slot"></div>' +
      '<div class="panel-sub">👕 Shirts</div>' + farmerRows +
      outfitSections +
      '<div class="panel-sub">🌤️ Weather & light</div>' + weatherRows +
      '<div class="panel-sub">🛣️ Roads</div>' + roadRows,
  );
  wireShopTabs();
  panelBody()
    .querySelectorAll('[data-skin-buy]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        const [cat, id] = btn.getAttribute('data-skin-buy')!.split(':') as [SkinCategory, string];
        const price = skinPrice(cat, id);
        const paid = price.gems ? market.spendGems(price.gems) : price.coins ? market.spendCoins(price.coins) : true;
        if (!paid) return Audio.playError();
        cosmetics.owned.push(id);
        cosmetics[cat] = id;
        applyCosmetics();
        saveDirty = true;
        Audio.playSuccess();
        renderShop();
      }),
    );
  panelBody()
    .querySelectorAll('[data-skin-equip]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        const [cat, id] = btn.getAttribute('data-skin-equip')!.split(':') as [SkinCategory, string];
        cosmetics[cat] = id;
        applyCosmetics();
        saveDirty = true;
        Audio.playClick();
        renderShop();
      }),
    );
  panelBody()
    .querySelectorAll('[data-outfit-buy]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        const [cat, id] = btn.getAttribute('data-outfit-buy')!.split(':') as [OutfitCategory, string];
        const item = outfitItem(id);
        if (!item) return Audio.playError();
        const paid = item.gems ? market.spendGems(item.gems) : item.coins ? market.spendCoins(item.coins) : true;
        if (!paid) return Audio.playError();
        cosmetics.owned.push(id);
        cosmetics[cat] = id;
        applyCosmetics();
        saveDirty = true;
        Audio.playSuccess();
        renderShop();
      }),
    );
  panelBody()
    .querySelectorAll('[data-outfit-equip]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        const [cat, id] = btn.getAttribute('data-outfit-equip')!.split(':') as [OutfitCategory, string];
        cosmetics[cat] = id;
        applyCosmetics();
        saveDirty = true;
        Audio.playClick();
        renderShop();
      }),
    );
  startOutfitPreview();
}

/**
 * The outfit preview (master prompt 6.3): a second tiny renderer
 * with its own farmer, wearing exactly what the player wears (or
 * just bought), turning slowly. Its canvas is a persistent element
 * moved into the shop panel, so no GL contexts leak across renders;
 * the loop idles whenever the canvas is not on screen.
 */
interface OutfitPreview {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  rig: FarmerRig;
  canvas: HTMLCanvasElement;
}
let outfitPreview: OutfitPreview | null = null;
function startOutfitPreview(): void {
  const slot = panelBody().querySelector('#outfit-preview-slot');
  if (!slot) return;
  if (!outfitPreview) {
    const canvas = document.createElement('canvas');
    canvas.id = 'outfit-canvas';
    canvas.width = 300;
    canvas.height = 300;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(150, 150, false);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff6de, 0x8a6d3b, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(2, 4, 3);
    scene.add(key);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.set(0, 1.6, 3.8);
    camera.lookAt(0, 0.95, 0);
    const rig = makeFarmer();
    scene.add(rig.group);
    outfitPreview = { renderer, scene, camera, rig, canvas };
    let last = performance.now();
    const loop = (now: number) => {
      requestAnimationFrame(loop);
      const p = outfitPreview!;
      if (!document.body.contains(p.canvas)) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      p.rig.group.rotation.y += dt * 0.9;
      p.renderer.render(p.scene, p.camera);
    };
    requestAnimationFrame(loop);
  }
  applyOutfit(outfitPreview.rig, cosmetics);
  slot.appendChild(outfitPreview.canvas);
}

function renderMissions(): void {
  const rowHtml = (r: ReturnType<MissionSystem['describe']>[number]): string => {
    const pct = Math.min(100, (r.progress / r.target) * 100);
    const right = r.claimed
      ? '<button class="buy-btn" disabled>✓ Done</button>'
      : r.complete
        ? `<button class="buy-btn claim" data-claim="${r.id}">CLAIM</button>`
        : `<div class="shop-fx">${r.progress}/${r.target}</div>`;
    return `<div class="mission-row"><div class="mission-info"><div class="mission-name">${r.title}</div><div class="mission-sub">Reward: ${r.rewardText}</div><div class="m-track"><div class="m-fill" style="width:${pct}%"></div></div></div>${right}</div>`;
  };
  const daily = missions.describeDaily().map(rowHtml).join('');
  const rows = missions.describe().map(rowHtml).join('');
  hud.openPanel(
    'Missions',
    `<div class="panel-sub">☀️ Daily missions · fresh every morning</div>${daily}<div class="panel-sub">⭐ Missions & contracts</div>${rows}`,
  );
  panelBody()
    .querySelectorAll('[data-claim]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        const res = missions.claimReward(btn.getAttribute('data-claim')!, market);
        if (res.ok) {
          Audio.playSuccess();
          if (res.xp > 0) gainXp(res.xp);
          refreshObjective();
          renderMissions();
        } else Audio.playError();
      }),
    );
}

function renderSettings(): void {
  hud.openPanel(
    'Settings',
    `<div class="slider-row"><label>Music</label><input type="range" id="set-music" min="0" max="100" value="${Math.round(Audio.settings.musicVolume * 100)}"><span class="val" id="set-music-val"></span></div>
     <div class="slider-row"><label>SFX</label><input type="range" id="set-sfx" min="0" max="100" value="${Math.round(Audio.settings.sfxVolume * 100)}"><span class="val" id="set-sfx-val"></span></div>
     <div class="earn-note">Volumes save automatically and apply live.</div>`,
  );
  const body = panelBody();
  const wire = (id: string, apply: (v: number) => void) => {
    const input = body.querySelector(`#${id}`) as HTMLInputElement;
    const val = body.querySelector(`#${id}-val`) as HTMLElement;
    val.textContent = `${input.value}%`;
    input.addEventListener('input', () => {
      val.textContent = `${input.value}%`;
      apply(Number(input.value) / 100);
    });
  };
  wire('set-music', (v) => Audio.setMusicVolume(v));
  wire('set-sfx', (v) => {
    Audio.setSfxVolume(v);
    Audio.playClick();
  });
}

const EARN_OFFERS = {
  coins: { icon: '🪙', amount: 50, label: '50 coins', rewardId: 'earn-coins' },
  gems: { icon: '💎', amount: 3, label: '3 gems', rewardId: 'earn-gems' },
} as const;
function renderEarn(kind: keyof typeof EARN_OFFERS): void {
  const offer = EARN_OFFERS[kind];
  const trade =
    kind === 'gems'
      ? `<div class="earn-note">Or trade surplus corn, no ad needed:</div>
         <button class="watch-btn" id="btn-trade" ${backpack.countOf('corn') < CORN_PER_GEM ? 'disabled' : ''}>Trade ${CORN_PER_GEM} 🌽 → 1 💎 (you have ${backpack.countOf('corn')} 🌽)</button>`
      : '';
  hud.openPanel(
    kind === 'coins' ? 'Earn Coins' : 'Earn Gems',
    `<div class="earn-big">${offer.icon}</div><div class="earn-amt">+ ${offer.label}</div>
     <div class="earn-note">Watch a short ad to earn this reward.</div>
     <button class="watch-btn" id="btn-watch">▶ Watch ad</button>
     <div class="earn-note" id="earn-status"></div>${trade}`,
  );
  if (kind === 'gems') {
    panelBody().querySelector('#btn-trade')?.addEventListener('click', () => {
      if (backpack.remove('corn', CORN_PER_GEM) < CORN_PER_GEM) return Audio.playError();
      market.addGems(1);
      hud.setBag(backpack.total, backpack.capacity);
      Audio.playSuccess();
      saveDirty = true;
      renderEarn('gems');
    });
  }
  const status = panelBody().querySelector('#earn-status') as HTMLElement;
  panelBody().querySelector('#btn-watch')!.addEventListener('click', async () => {
    status.textContent = 'Loading ad...';
    const completed = await Playables.requestRewardedAd(offer.rewardId);
    if (completed) {
      if (kind === 'coins') market.addCoins(offer.amount);
      else market.addGems(offer.amount);
      Audio.playSuccess();
      status.textContent = `Reward added: +${offer.label}.`;
    } else {
      status.textContent =
        'Ads play in the YouTube version of Harvest Lane. This web version has no ad network, so no reward was added.';
    }
  });
}
hud.onOpenShop = renderShop;
hud.onOpenMissions = renderMissions;
hud.onOpenSettings = renderSettings;
hud.onLevelTap = () => {
  const cur = progression.level;
  const rows: string[] = [
    `<div class="panel-sub">⭐ You are Level ${cur} · ${progression.xpIntoLevel}/${ProgressionSystem.xpForNext(cur)} XP to Level ${cur + 1} · ${totalXpForLevel(cur + 1) - progression.xp} XP away</div>`,
  ];
  for (let l = cur + 1; l <= Math.min(50, cur + 5); l++) {
    const defs = UNLOCKS[l] ?? [];
    const body = defs.length
      ? defs.map((d) => `${d.icon} ${d.label}`).join('<br/>')
      : 'Gems and backpack space';
    const hot = l === 10 ? ' style="border-color:#d9930d;background:#fff3cf"' : '';
    rows.push(
      `<div class="shop-row"${hot}><div class="grow"><div class="name">Level ${l}${l === 10 ? ' · 🏨 Hotel' : ''}</div><div class="desc">${body}</div></div><span class="max">${totalXpForLevel(l)} XP</span></div>`,
    );
  }
  hud.openPanel('Level Roadmap', rows.join(''));
};
hud.onPillCoins = () => renderEarn('coins');
hud.onPillGems = () => renderEarn('gems');

// Saves and the Playables lifecycle (phase 6).
import {
  SAVE_VERSION,
  loadLocalSave,
  storeLocalSave,
  parseSaveString,
  serializeSave,
  type GameSave,
} from './systems/SaveSystem';
let saveArmed = false;
let saveDirty = false;
let platformPaused = false;

function collectSave(): GameSave {
  const snap = market.snapshot();
  // Player position is stored in the save's design pixels, the
  // inverse of the Layout X/Z conversions.
  const px = {
    x: playerPos.x * 46 + 540,
    y: playerPos.z * 46 + 800,
  };
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    coins: snap.coins,
    gems: snap.gems,
    pendingCash: snap.pendingCash,
    xp: progression.xp,
    feed: animals.feedSnapshot(),
    animalTiers: animals.tiersSnapshot(),
    helperHired,
    churnOwned,
    stock: snap.stock,
    backpack: backpack.snapshot(),
    seeds: seeds.snapshot(),
    landPacks,
    eastUnlocked,
    hotelUnlocked,
    upgrades: upgrades.snapshot(),
    areaUnlocked: southUnlocked,
    missions: missions.snapshot(),
    cosmetics: {
      owned: [...cosmetics.owned],
      farmer: cosmetics.farmer,
      weather: cosmetics.weather,
      road: cosmetics.road,
      hat: cosmetics.hat,
      shoes: cosmetics.shoes,
      chain: cosmetics.chain,
      glasses: cosmetics.glasses,
    },
    player: { x: px.x, y: px.y },
    audio: { musicVolume: Audio.settings.musicVolume, sfxVolume: Audio.settings.sfxVolume },
  };
}

function applySave(save: GameSave): void {
  market.restore({ coins: save.coins, gems: save.gems, stock: save.stock, pendingCash: save.pendingCash });
  progression.restore({ xp: save.xp });
  seeds.restore(save.seeds);
  refreshSeeds();
  refreshLevel();
  landPacks = save.landPacks;
  eastUnlocked = save.eastUnlocked;
  for (let i = 0; i < landPacks; i++) buildStrip(i, false);
  if (eastUnlocked) buildEastField(false);
  hotelUnlocked = save.hotelUnlocked;
  if (hotelUnlocked) hotel.unlock(false);
  else if (progression.level >= HOTEL_UNLOCK_LEVEL) unlockHotel(true);
  animals.setTiers(save.animalTiers);
  animals.restoreFeed(save.feed);
  helperHired = save.helperHired;
  churnOwned = save.churnOwned;
  cosmetics = {
    owned: [...save.cosmetics.owned],
    farmer: save.cosmetics.farmer,
    weather: save.cosmetics.weather,
    road: save.cosmetics.road,
    hat: save.cosmetics.hat,
    shoes: save.cosmetics.shoes,
    chain: save.cosmetics.chain,
    glasses: save.cosmetics.glasses,
  };
  applyCosmetics();
  helper.setActive(helperHired);
  churnGroup.visible = churnOwned;
  customers.allowCheese = churnOwned;
  upgrades.restore(save.upgrades);
  backpack.restore(save.backpack);
  missions.restore(save.missions);
  if (save.areaUnlocked && !southUnlocked) {
    southUnlocked = true;
    cropField.plantSouth(scene);
    customers.allowCarrot = true;
  }
  applyUpgrades();
  hud.setBag(backpack.total, backpack.capacity);
  hud.setCoins(market.coins);
  hud.setGems(market.gems);
  refreshStockChip();
  refreshObjective();
  playerPos.x = X(save.player.x);
  playerPos.z = Z(save.player.y);
  Audio.setMusicVolume(save.audio.musicVolume);
  Audio.setSfxVolume(save.audio.sfxVolume);
}

function saveNow(): void {
  if (!saveArmed) return;
  const save = collectSave();
  if (Playables.inPlayablesEnv) {
    void Playables.saveCloudSave(serializeSave(save));
  } else {
    storeLocalSave(save);
  }
  saveDirty = false;
  hud.flashSaved();
}

// Mark progress dirty on the events that matter, and let the
// interval persist it. Cloud writes stay behind the adapter's own
// load-before-save guard.
[GameEvents.CoinsChanged, GameEvents.GemsChanged, GameEvents.StockChanged, GameEvents.BackpackChanged].forEach(
  (evt) => EventBus.on(evt, () => (saveDirty = true)),
);
window.setInterval(() => {
  if (saveDirty) saveNow();
}, 5_000);
document.addEventListener('visibilitychange', () => {
  // Only a session that actually changed something writes on hide:
  // an untouched session must never overwrite the stored save (it
  // could be masking a corrupt payload the next boot should find).
  if (document.hidden && saveDirty) saveNow();
});

/**
 * Offline earnings: while the player was away the farm kept
 * selling at a modest rate (12 + 3 per farm level coins per hour),
 * capped at 4 hours. The grant waits behind a welcome-back panel.
 */
let pendingWelcome: number | null = null;
function queueOfflineEarnings(save: GameSave): void {
  if (!save.savedAt) return;
  const awayMs = Date.now() - save.savedAt;
  if (awayMs < OFFLINE_MIN_MINUTES * 60_000) return;
  const hours = Math.min(awayMs / 3_600_000, OFFLINE_CAP_HOURS);
  const grant = Math.floor(hours * offlineCoinsPerHour(progression.level));
  if (grant >= 5) pendingWelcome = grant;
}

// Boot: load first, then arm saving. In the Playables environment
// the cloud save is the only save; standalone uses localStorage.
async function boot(): Promise<void> {
  let hadSave = false;
  if (Playables.inPlayablesEnv) {
    const raw = await Playables.loadCloudSave();
    const save = parseSaveString(raw);
    if (save) {
      hadSave = true;
      applySave(save);
      queueOfflineEarnings(save);
    }
    const audioEnabled = Playables.isAudioEnabled();
    if (audioEnabled !== null) Audio.setPlatformMuted(!audioEnabled);
    Playables.onAudioEnabledChange((enabled) => Audio.setPlatformMuted(!enabled));
    Playables.onPauseResume({
      onPause: () => {
        platformPaused = true;
        saveNow();
      },
      onResume: () => {
        platformPaused = false;
      },
    });
  } else {
    const save = loadLocalSave();
    if (save) {
      hadSave = true;
      applySave(save);
      queueOfflineEarnings(save);
    }
  }
  // A brand-new farm starts with a full bag of corn seeds (S2), so
  // the replant loop never opens as a wall.
  if (!hadSave) {
    seeds.add('corn', seedBagCapacity(1), seedBagCapacity(1));
    refreshSeeds();
  }
  // Restoring echoes change events; they are not new progress.
  saveDirty = false;
  saveArmed = true;
}

let depositTimerMs = 0;
function depositStep(dtMs: number): void {
  const fx = X(STALL_FRONT.x);
  const fz = Z(STALL_FRONT.y);
  const dx = playerPos.x - fx;
  const dz = playerPos.z - fz;
  if (dx * dx + dz * dz > 1.7 * 1.7 || backpack.total === 0) {
    depositTimerMs = 0;
    return;
  }
  depositTimerMs += dtMs;
  while (depositTimerMs >= 160) {
    depositTimerMs -= 160;
    for (const id of ['corn', 'carrot', 'egg', 'milk', 'cheese']) {
      if (backpack.countOf(id) > 0) {
        backpack.remove(id, 1);
        market.addStock(id, 1);
        hud.setBag(backpack.total, backpack.capacity);
        floatAt(`+1 ${ITEM_CHIP[id] ?? ''}`, fx, fz - 0.8);
        Audio.playPickup();
        break;
      }
    }
    if (backpack.total === 0) break;
  }
}

let started = false;
hud.onPlay = () => {
  started = true;
  hud.hideMenu();
  Audio.ensure();
  Playables.gameReady();
  if (pendingWelcome !== null) {
    const grant = pendingWelcome;
    pendingWelcome = null;
    hud.openPanel(
      'Welcome back!',
      `<div class="earn-big">🌾</div><div class="earn-amt">Your farm kept selling</div>
       <div class="earn-note">While you were away the stall earned 🪙 ${grant} (up to 4 hours counted, more at higher farm levels).</div>
       <div class="earn-note">Offline earnings come from already-planted crops and your animals. Crops are never auto-replanted while you are away.</div>
       <button class="watch-btn" id="btn-collect-offline">Collect 🪙 ${grant}</button>`,
    );
    panelBody().querySelector('#btn-collect-offline')!.addEventListener('click', () => {
      market.addCoins(grant);
      Audio.playSuccess();
      saveDirty = true;
      hud.closePanel();
    });
  }
};

const CAM_OFFSET = new THREE.Vector3(0, 16.5, 15.5);
const playerPos = farmer.group.position;
const camTarget = new THREE.Vector3().copy(playerPos);
let facing = Math.PI; // facing the camera (south) at spawn
let walkPhase = 0;
let stepTimer = 0;

const WORLD_BOUNDS = { minX: X(30), maxX: X(1580), minZ: Z(30), maxZ: Z(1570) };
const SPEED = 7.2;

const clock = new THREE.Clock();
let firstFrame = true;

function animate(): void {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.25);
  const t = clock.elapsedTime;
  // Substep so slow devices still run at real-time speed: each
  // step is at most 50ms of game time, however long the frame took.
  const steps = Math.max(1, Math.ceil(rawDt / 0.05));
  const dt = rawDt / steps;
  for (let s = 0; s < steps; s++) stepGame(dt, t);
  bursts.update(rawDt);
  hotel.update(rawDt);

  // During a land-purchase celebration the camera glances at the
  // new land instead of following the farmer (tap cancels early).
  if (t < panUntil) {
    camTarget.lerp(panPoint, Math.min(1, rawDt * 3));
  } else {
    camTarget.lerp(new THREE.Vector3(playerPos.x, 0, playerPos.z), Math.min(1, rawDt * 5));
  }
  camera.position.set(camTarget.x + CAM_OFFSET.x, CAM_OFFSET.y, camTarget.z + CAM_OFFSET.z);
  camera.lookAt(camTarget.x, 0.8, camTarget.z - 1.5);

  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    Playables.firstFrameReady();
  }
}

function stepGame(dt: number, t: number): void {
  let mx = 0;
  let mz = 0;
  let mag = 0;
  if (started && !hud.panelOpen && !platformPaused) {
    const kv = controls.keyVector();
    if (kv) {
      mx = kv.x;
      mz = kv.z;
      mag = 1;
    } else if (controls.vector.magnitude > 0.05) {
      mx = controls.vector.x;
      mz = controls.vector.y;
      mag = controls.vector.magnitude;
    }
  }

  const R = 0.38;
  const hitsCollider = (x: number, z: number): boolean =>
    WORLD_COLLIDERS.some(
      (c) => x + R > c.minX && x - R < c.maxX && z + R > c.minZ && z - R < c.maxZ,
    );
  const moving = mag > 0.02;
  if (moving) {
    const speed = SPEED * upgrades.speedMultiplier() * (t < boostUntilT ? 1.5 : 1);
    // Axis-separated movement against the world colliders (fences,
    // stall, trees, sign): each axis is tested on its own, so the
    // farmer slides along a fence instead of sticking to it.
    const nx = THREE.MathUtils.clamp(playerPos.x + mx * speed * mag * dt, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
    if (!hitsCollider(nx, playerPos.z)) playerPos.x = nx;
    const nz = THREE.MathUtils.clamp(playerPos.z + mz * speed * mag * dt, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
    if (!hitsCollider(playerPos.x, nz)) playerPos.z = nz;
    const targetFacing = Math.atan2(mx, mz);
    let diff = targetFacing - facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    facing += diff * Math.min(1, dt * 14);
    walkPhase += dt * 11 * mag;
    // Grass footsteps, roughly two per stride cycle.
    stepTimer -= dt;
    if (stepTimer <= 0) {
      stepTimer = 0.29;
      Audio.playFootstep();
    }
  }
  // Depenetration safety net, every tick, moving or not: if the
  // farmer ever ends up overlapping a collider (a save written by
  // an older build, from before fences were solid, can restore him
  // inside one), the axis checks above would reject every move and
  // stick him permanently. Push him out along the smallest exit,
  // a few passes for corners where two colliders meet.
  for (let pass = 0; pass < 3; pass++) {
    let pushed = false;
    for (const c of WORLD_COLLIDERS) {
      if (
        playerPos.x + R <= c.minX || playerPos.x - R >= c.maxX ||
        playerPos.z + R <= c.minZ || playerPos.z - R >= c.maxZ
      ) continue;
      const exits = [
        { d: playerPos.x + R - c.minX, x: c.minX - R, z: playerPos.z },
        { d: c.maxX + R - playerPos.x, x: c.maxX + R, z: playerPos.z },
        { d: playerPos.z + R - c.minZ, x: playerPos.x, z: c.minZ - R },
        { d: c.maxZ + R - playerPos.z, x: playerPos.x, z: c.maxZ + R },
      ];
      exits.sort((a, b) => a.d - b.d);
      playerPos.x = THREE.MathUtils.clamp(exits[0].x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
      playerPos.z = THREE.MathUtils.clamp(exits[0].z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
      pushed = true;
    }
    if (!pushed) break;
  }
  if (!hud.panelOpen && !platformPaused) {
    cropField.update(dt * 1000, playerPos.x, playerPos.z, t);
    animals.update(dt * 1000, playerPos.x, playerPos.z);
    if (started) {
      customers.update(dt * 1000);
      depositStep(dt * 1000);
      feedStep(dt * 1000);
      churnStep(dt * 1000);
      if (helperHired) helper.update(dt * 1000);
      // Collect the cash pile by walking over it.
      if (market.pendingCash > 0) {
        const dx = playerPos.x - PILE_POS.x;
        const dz = playerPos.z - PILE_POS.z;
        if (dx * dx + dz * dz < 1.7 * 1.7) {
          const n = market.collectPendingCash();
          if (n > 0) {
            floatAt(`+${n} 🪙`, PILE_POS.x, PILE_POS.z, '#ffe066');
            bursts.spawn(PILE_POS.x, PILE_POS.z, 0xf2c14e, 10, 0.8);
            Audio.playCoin();
          }
        }
      }
      // The sneakers pad: step on it for two minutes of 1.5x speed.
      const pdx = playerPos.x - PAD_POS.x;
      const pdz = playerPos.z - PAD_POS.z;
      if (pdx * pdx + pdz * pdz < 0.81 && t > boostUntilT) {
        boostUntilT = t + 120;
        floatAt('⚡ Speed boost! 2 min', playerPos.x, playerPos.z, '#ffd94d');
        Audio.playSuccess();
      }
      seedCareStep(dt * 1000);
    }
  }

  farmer.group.rotation.y = facing;
  const swing = moving ? Math.sin(walkPhase) * 0.62 : 0;
  farmer.legL.rotation.x = swing;
  farmer.legR.rotation.x = -swing;
  farmer.armL.rotation.x = -swing * 0.8;
  farmer.armR.rotation.x = swing * 0.8;
  farmer.body.position.y = 0.78 + (moving ? Math.abs(Math.sin(walkPhase)) * 0.07 : Math.sin(t * 2) * 0.015);
  // A worn chain sways against the walk (master prompt 6.3).
  if (farmer.chainSlot) {
    farmer.chainSlot.rotation.x = moving ? Math.sin(walkPhase * 2) * 0.07 : Math.sin(t * 2) * 0.02;
    farmer.chainSlot.rotation.z = moving ? Math.sin(walkPhase) * 0.05 : 0;
  }
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// QA hooks (stripped from the release build, same rule as the 2D game).
if (import.meta.env.MODE !== 'release') {
  (window as unknown as { harvestLane3D: unknown }).harvestLane3D = {
    scene,
    renderer,
    farmer,
    hud,
    started: () => started,
    playerPos: () => ({ x: playerPos.x, z: playerPos.z }),
    teleport: (x: number, z: number) => {
      playerPos.x = x;
      playerPos.z = z;
    },
    crops: cropField,
    backpack,
    seeds,
    land: () => ({ packs: landPacks, east: eastUnlocked }),
    hotel: () => ({ unlocked: hotelUnlocked }),
    missions,
    market,
    customers,
    animals,
    upgrades,
    progression,
    gainXp,
    helper,
    boostActive: () => clock.elapsedTime < boostUntilT,
    helperHired: () => helperHired,
    cosmetics: () => cosmetics,
    churnOwned: () => churnOwned,
    colliders: WORLD_COLLIDERS,
    controls,
    audio: Audio,
    southUnlocked: () => southUnlocked,
    u,
  };
}

// Boot runs last, once every declaration above exists: the
// standalone restore path applies a save synchronously, and it
// touches state declared throughout this module.
void boot();
