import * as THREE from 'three';
import './ui/hud.css';
import { buildWorld, WORLD_COLLIDERS, WORLD_MATS } from './three/World';
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
const farmer: FarmerRig = makeFarmer();
farmer.group.position.set(X(SPAWN.x), 0, Z(SPAWN.y));
scene.add(farmer.group);

const hud = new HUD(app);
const controls = new Controls(renderer.domElement);

// Game state for the farming loop.
const backpack = new BackpackSystem(10);
const missions = new MissionSystem();
const progression = new ProgressionSystem();
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

/** Awards XP and celebrates a level-up (gems, fanfare, capacity). */
function gainXp(amount: number): void {
  const res = progression.gain(amount);
  hud.setLevel(progression.level, progression.levelFraction);
  if (res.levelsGained > 0) {
    const gems = ProgressionSystem.gemsPerLevel * res.levelsGained;
    market.addGems(gems);
    floatAt(`⭐ LEVEL ${res.level}! +${gems} 💎`, playerPos.x, playerPos.z, '#ffc93c');
    bursts.spawn(playerPos.x, playerPos.z, 0xffc93c, 16, 1.4);
    Audio.playSuccess();
    applyUpgrades();
  }
}

cropField.onHarvest = (cropId, wx, wz) => {
  const added = backpack.add(cropId, 1);
  if (added <= 0) return false;
  missions.track('harvest', cropId, 1);
  gainXp(1);
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
  gainXp(5);
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
import { AnimalSystem3D, FEED_MAX } from './game/AnimalSystem3D';
const animals = new AnimalSystem3D(scene);
// The real CC0 cow model (Quaternius) replaces the procedural cows
// when it arrives; the game runs either way.
void animals.loadCowModel();
animals.onCollect = (itemId, wx, wz) => {
  const added = backpack.add(itemId, 1);
  if (added <= 0) return false;
  missions.track('collect', itemId, 1);
  gainXp(2);
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
    if (dx * dx + dz * dz < 1.7 * 1.7 && backpack.countOf('corn') > 0 && animals.feedOf(kind) < FEED_MAX) {
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
        if (backpack.countOf('corn') <= 0 || animals.feedOf(kind) >= FEED_MAX) break;
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
let cosmetics: CosmeticsState = { ...DEFAULT_COSMETICS, owned: [...DEFAULT_COSMETICS.owned] };

/** Applies the equipped cosmetics: farmer colours, weather light, road tint. */
function applyCosmetics(): void {
  const f = farmerSkin(cosmetics.farmer);
  if (farmer.mats) {
    farmer.mats.shirt.color.setHex(f.shirt);
    farmer.mats.denim.color.setHex(f.denim);
    farmer.mats.hat.color.setHex(f.hat);
    farmer.mats.hatDark.color.setHex(f.hatDark);
    farmer.mats.band.color.setHex(f.band);
  }
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

let shopTab: 'upgrades' | 'skins' = 'upgrades';

function shopTabsHtml(): string {
  return `<div class="tab-row"><button class="tab-btn ${shopTab === 'upgrades' ? 'on' : ''}" data-shop-tab="upgrades">⬆️ Upgrades</button><button class="tab-btn ${shopTab === 'skins' ? 'on' : ''}" data-shop-tab="skins">🎨 Skins</button></div>`;
}

function wireShopTabs(): void {
  panelBody()
    .querySelectorAll('[data-shop-tab]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        shopTab = btn.getAttribute('data-shop-tab') === 'skins' ? 'skins' : 'upgrades';
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
    : `<div class="shop-row"><div class="shop-info"><div class="shop-name">South Field</div><div class="shop-fx">${SOUTH_FIELD.blurb}</div></div><button class="buy-btn" data-buy="south-field" ${market.coins < SOUTH_FIELD.cost ? 'disabled' : ''}>🪙 ${SOUTH_FIELD.cost}</button></div>`;
  const helperRow = helperHired
    ? '<div class="shop-row"><div class="shop-info"><div class="shop-name">Farm Helper 🧑‍🌾</div><div class="shop-fx">Working your fields: harvests ripe crops and stocks the stall</div></div><button class="buy-btn" disabled>HIRED</button></div>'
    : `<div class="shop-row"><div class="shop-info"><div class="shop-name">Farm Helper 🧑‍🌾</div><div class="shop-fx">Harvests ripe crops and stocks the stall for you, all day</div></div><button class="buy-btn" data-buy="helper" ${market.coins < 300 ? 'disabled' : ''}>🪙 300</button></div>`;
  const churnRow = churnOwned
    ? '<div class="shop-row"><div class="shop-info"><div class="shop-name">Cheese Churn 🧀</div><div class="shop-fx">Built by the stall: stand at it with milk to churn cheese (sells for 42)</div></div><button class="buy-btn" disabled>BUILT</button></div>'
    : `<div class="shop-row"><div class="shop-info"><div class="shop-name">Cheese Churn 🧀</div><div class="shop-fx">Turn 1 milk (14) into 1 cheese (42). Customers will start ordering it</div></div><button class="buy-btn" data-buy="churn" ${market.coins < 400 ? 'disabled' : ''}>🪙 400</button></div>`;
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
          customers.allowCarrot = true;
          Audio.playSuccess();
          refreshObjective();
          renderShop();
          return;
        }
        if (id === 'helper') {
          if (!market.spendCoins(300)) return Audio.playError();
          helperHired = true;
          helper.setActive(true);
          saveDirty = true;
          Audio.playSuccess();
          floatAt('🧑‍🌾 Helper hired!', playerPos.x, playerPos.z, '#b8f7a1');
          renderShop();
          return;
        }
        if (id === 'churn') {
          if (!market.spendCoins(400)) return Audio.playError();
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
  hud.openPanel(
    'Shop',
    shopTabsHtml() +
      '<div class="panel-sub">🧑‍🌾 Farmer outfits</div>' + farmerRows +
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
        if (missions.claim(btn.getAttribute('data-claim')!, market)) {
          Audio.playSuccess();
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
         <button class="watch-btn" id="btn-trade" ${backpack.countOf('corn') < 9 ? 'disabled' : ''}>Trade 9 🌽 → 1 💎 (you have ${backpack.countOf('corn')} 🌽)</button>`
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
      if (backpack.remove('corn', 9) < 9) return Audio.playError();
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
hud.onPillCoins = () => renderEarn('coins');
hud.onPillGems = () => renderEarn('gems');

// Saves and the Playables lifecycle (phase 6).
import {
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
    version: 1,
    savedAt: Date.now(),
    coins: snap.coins,
    gems: snap.gems,
    pendingCash: snap.pendingCash,
    xp: progression.xp,
    feed: animals.feedSnapshot(),
    helperHired,
    churnOwned,
    stock: snap.stock,
    backpack: backpack.snapshot(),
    upgrades: upgrades.snapshot(),
    areaUnlocked: southUnlocked,
    missions: missions.snapshot(),
    cosmetics: { owned: [...cosmetics.owned], farmer: cosmetics.farmer, weather: cosmetics.weather, road: cosmetics.road },
    player: { x: px.x, y: px.y },
    audio: { musicVolume: Audio.settings.musicVolume, sfxVolume: Audio.settings.sfxVolume },
  };
}

function applySave(save: GameSave): void {
  market.restore({ coins: save.coins, gems: save.gems, stock: save.stock, pendingCash: save.pendingCash });
  progression.restore({ xp: save.xp });
  hud.setLevel(progression.level, progression.levelFraction);
  animals.restoreFeed(save.feed);
  helperHired = save.helperHired;
  churnOwned = save.churnOwned;
  cosmetics = { owned: [...save.cosmetics.owned], farmer: save.cosmetics.farmer, weather: save.cosmetics.weather, road: save.cosmetics.road };
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
  if (awayMs < 15 * 60_000) return;
  const hours = Math.min(awayMs / 3_600_000, 4);
  const grant = Math.floor(hours * (12 + progression.level * 3));
  if (grant >= 5) pendingWelcome = grant;
}

// Boot: load first, then arm saving. In the Playables environment
// the cloud save is the only save; standalone uses localStorage.
async function boot(): Promise<void> {
  if (Playables.inPlayablesEnv) {
    const raw = await Playables.loadCloudSave();
    const save = parseSaveString(raw);
    if (save) {
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
      applySave(save);
      queueOfflineEarnings(save);
    }
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

const WORLD_BOUNDS = { minX: X(30), maxX: X(1050), minZ: Z(30), maxZ: Z(1570) };
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

  camTarget.lerp(new THREE.Vector3(playerPos.x, 0, playerPos.z), Math.min(1, rawDt * 5));
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
    }
  }

  farmer.group.rotation.y = facing;
  const swing = moving ? Math.sin(walkPhase) * 0.62 : 0;
  farmer.legL.rotation.x = swing;
  farmer.legR.rotation.x = -swing;
  farmer.armL.rotation.x = -swing * 0.8;
  farmer.armR.rotation.x = swing * 0.8;
  farmer.body.position.y = 0.78 + (moving ? Math.abs(Math.sin(walkPhase)) * 0.07 : Math.sin(t * 2) * 0.015);
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
    missions,
    market,
    customers,
    animals,
    upgrades,
    progression,
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
