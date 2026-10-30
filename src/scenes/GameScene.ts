import Phaser from 'phaser';
import { EventBus, GameEvents } from '../game/EventBus';
import {
  PLAYER_START_X,
  PLAYER_START_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../game/GameConstants';
import { Player } from '../entities/Player';
import { Crop } from '../entities/Crop';
import { CropSystem, type FieldRect } from '../systems/CropSystem';
import { BackpackSystem } from '../systems/BackpackSystem';
import { MarketSystem } from '../systems/MarketSystem';
import { CustomerSystem } from '../systems/CustomerSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { SOUTH_FIELD } from '../data/UpgradeData';
import { MissionSystem } from '../systems/MissionSystem';
import { AnimalSystem, type PenRect } from '../systems/AnimalSystem';
import { CARROT } from '../data/CropData';
import { ITEM_NAMES } from '../data/ItemData';
import { Audio } from '../systems/AudioSystem';
import {
  SAVE_VERSION,
  loadLocalSave,
  parseSaveString,
  serializeSave,
  storeLocalSave,
  type GameSave,
} from '../systems/SaveSystem';
import { Playables } from '../platform/YouTubePlayablesAdapter';

const CHICKEN_PEN: PenRect = { x: 620, y: 616, w: 240, h: 220 };
const COW_PEN: PenRect = { x: 628, y: 996, w: 368, h: 152 };
const DEPOSIT_ITEMS = ['corn', 'carrot', 'egg', 'milk'];

const STALL_FRONT = { x: 840, y: 1412 };
const DEPOSIT_RANGE = 86;
const DEPOSIT_INTERVAL_MS = 160;

const HARVEST_RANGE = 62;
const BACKPACK_CAPACITY = 10;

// The planted areas, matching the soil fields drawn in buildFields.
const FIELDS: FieldRect[] = [
  { x: 84, y: 168, w: 368, h: 308 },
  { x: 84, y: 540, w: 368, h: 268 },
  { x: 628, y: 168, w: 368, h: 392 },
];

/**
 * Phase 2 farm world: a complete, original farm environment.
 *
 * Layout: an entrance with a sign at the south gate, paths crossing at
 * the centre, two tilled crop fields west, a larger cornfield zone
 * north-east, and a market stall on a dirt apron south-east. Trees,
 * bushes, flowers and stones decorate the grass. Fences, the stall
 * counter and tree trunks are solid; fields and paths are walkable.
 * Crop growth, stall stock and customers are later phases; this phase
 * is the world they will live in.
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private wasMoving = false;

  // Phase 3 and 4 systems, exposed for QA inspection.
  cropSystem!: CropSystem;
  backpack = new BackpackSystem(BACKPACK_CAPACITY);
  market = new MarketSystem();
  customerSystem!: CustomerSystem;
  upgrades = new UpgradeSystem();
  areaUnlocked = false;
  missions = new MissionSystem();
  animalSystem!: AnimalSystem;
  private lockedFences!: Phaser.Physics.Arcade.StaticGroup;
  private lockedLabel!: Phaser.GameObjects.Text;
  private penFences!: Phaser.Physics.Arcade.StaticGroup;
  private lastFullBagNote = 0;
  private growthHint!: Phaser.GameObjects.Text;
  private lastAmbientAt = 0;
  private saveTimer = 0;
  private appliedSaveAt = 0;
  private platformPaused = false;
  private highlight!: Phaser.GameObjects.Image;
  private nearbyCrop: Crop | null = null;
  private pendingHarvest: Crop | null = null;
  private lastCropTick = 0;
  private depositTimer = 0;
  private serveTimer = 0;
  private stockLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const solids: Phaser.GameObjects.Rectangle[] = [];

    this.buildGround();
    this.buildFields();
    solids.push(...this.buildStall());
    solids.push(...this.buildTrees());
    const fences = this.buildFences();
    this.buildDecor();
    this.buildEntranceSign();
    this.buildLockedArea();
    this.buildPens();

    this.cropSystem = new CropSystem(this, FIELDS, this.time.now);
    this.highlight = this.add
      .image(0, 0, 'highlight-ring')
      .setVisible(false)
      .setDepth(4);
    this.growthHint = this.add
      .text(0, 0, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(1400);

    // Audio starts on the first tap or click (browser gesture rule).
    this.input.once('pointerdown', () => Audio.ensure());
    // The HUD asks for the objective once it exists to receive it.
    EventBus.on(GameEvents.ObjectiveRequest, () => this.emitObjective());

    this.playerShadow = this.add.ellipse(0, 0, 34, 12, 0x000000, 0.22);
    this.player = new Player(this, PLAYER_START_X, PLAYER_START_Y);
    this.physics.add.collider(this.player, fences);
    this.physics.add.collider(this.player, this.lockedFences);
    this.physics.add.collider(this.player, this.penFences);
    solids.forEach((solid) => this.physics.add.collider(this.player, solid));
    this.applyUpgradeEffects();
    this.animalSystem = new AnimalSystem(this, CHICKEN_PEN, COW_PEN, this.time.now);

    // Mission panel requests over the EventBus.
    EventBus.on(GameEvents.MissionsRequestState, () => this.emitMissionsState());
    EventBus.on(GameEvents.MissionClaim, (missionId: string) => {
      if (this.claimMission(missionId)) this.saveNow();
      this.emitMissionsState();
    });

    // Shop requests arrive over the EventBus from the HUD.
    EventBus.on(GameEvents.ShopRequestState, () => this.emitShopState());
    EventBus.on(GameEvents.ShopBuyUpgrade, (trackId: string) => {
      if (this.buyUpgrade(trackId)) {
        Audio.playUpgrade();
        this.saveNow();
      }
      this.emitShopState();
    });
    EventBus.on(GameEvents.ShopBuyArea, () => {
      if (this.unlockSouthField()) {
        Audio.playUpgrade();
        this.saveNow();
      }
      this.emitShopState();
    });

    // Tapping a crop walks the player to it and harvests on arrival.
    this.player.onTapWorld = (worldX, worldY) => {
      const crop = this.cropSystem.cropAt(worldX, worldY);
      if (!crop) return false;
      this.pendingHarvest = crop;
      this.player.movement.setTapTarget(crop.x, crop.y + 36);
      return true;
    };

    this.input.keyboard?.on('keydown-E', () => this.harvestNearest());
    this.input.keyboard?.on('keydown-SPACE', () => this.harvestNearest());
    EventBus.on(GameEvents.HarvestPressed, () => this.harvestNearest());

    // Market: stock label over the stall, customers, and serve feedback.
    this.stockLabel = this.add
      .text(STALL_FRONT.x, 1168, 'Corn 0 · Carrot 0 · Egg 0 · Milk 0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.35)',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(1400);
    EventBus.on(GameEvents.StockChanged, () => {
      this.stockLabel.setText(
        `Corn ${this.market.stockOf('corn')} · Carrot ${this.market.stockOf('carrot')} · Egg ${this.market.stockOf('egg')} · Milk ${this.market.stockOf('milk')}`,
      );
    });
    this.customerSystem = new CustomerSystem(this, this.market, this.time.now);
    this.customerSystem.onServed = (customer, earned) => {
      this.floatingText(customer.x, customer.y - 116, `+${earned} coins`, '#ffd94d');
      Audio.playCoin();
      this.coinFly(customer.x, customer.y - 40);
      this.trackMission('serve', undefined, 1);
      this.trackMission('sell', customer.order.itemId, customer.order.quantity);
    };

    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.startFollow(this.player, true, 0.12, 0.12);

    this.scene.launch('UI');
    this.setupPersistence();
  }

  /**
   * Save and platform wiring. Standalone mode: the local save applies
   * immediately, autosaves run on an interval and when the tab hides.
   * Playables mode: progress lives only in the cloud save (per the
   * integration requirements); when it arrives and is newer than what
   * is in play, it applies. Platform pause saves, then freezes the
   * scene; platform resume only undoes a platform pause, never a
   * panel pause.
   */
  private setupPersistence(): void {
    // Platform audio state sits above the in-game sliders.
    const audioEnabled = Playables.isAudioEnabled();
    if (audioEnabled !== null) Audio.setPlatformMuted(!audioEnabled);
    Playables.onAudioEnabledChange((enabled) => Audio.setPlatformMuted(!enabled));

    Playables.onPauseResume({
      onPause: () => {
        this.saveNow();
        Audio.suspend();
        if (!this.scene.isPaused('Game')) {
          this.platformPaused = true;
          this.scene.pause('Game');
        }
      },
      onResume: () => {
        Audio.resume();
        if (this.platformPaused) {
          this.platformPaused = false;
          this.scene.resume('Game');
        }
      },
    });

    if (Playables.inPlayablesEnv) {
      void Playables.loadCloudSave().then((serialized) => {
        const cloud = parseSaveString(serialized);
        if (cloud && cloud.savedAt > this.appliedSaveAt) this.applySave(cloud);
      });
    } else {
      const local = loadLocalSave();
      if (local) this.applySave(local);
      const onHide = () => {
        if (document.hidden) this.saveNow();
      };
      document.addEventListener('visibilitychange', onHide);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        document.removeEventListener('visibilitychange', onHide);
      });
    }
  }

  /** Builds the current save object from every owning system. */
  collectSave(): GameSave {
    const market = this.market.snapshot();
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      coins: market.coins,
      gems: market.gems,
      stock: market.stock,
      backpack: this.backpack.snapshot(),
      upgrades: this.upgrades.snapshot(),
      areaUnlocked: this.areaUnlocked,
      missions: this.missions.snapshot(),
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
      audio: {
        musicVolume: Audio.settings.musicVolume,
        sfxVolume: Audio.settings.sfxVolume,
      },
    };
  }

  /** Applies a validated save to the live game. */
  applySave(save: GameSave): void {
    this.appliedSaveAt = save.savedAt;
    this.upgrades.restore(save.upgrades);
    this.applyUpgradeEffects();
    this.market.restore({
      coins: save.coins,
      gems: save.gems,
      stock: save.stock,
    });
    this.backpack.restore(save.backpack);
    this.missions.restore(save.missions);
    if (save.areaUnlocked && !this.areaUnlocked) this.applyUnlockedArea();
    const px = Phaser.Math.Clamp(save.player.x, 40, WORLD_WIDTH - 40);
    const py = Phaser.Math.Clamp(save.player.y, 60, WORLD_HEIGHT - 40);
    this.player.setPosition(px, py);
    (this.player.body as Phaser.Physics.Arcade.Body | null)?.reset(px, py);
    this.player.movement.clearTapTarget();
    Audio.setMusicVolume(save.audio.musicVolume);
    Audio.setSfxVolume(save.audio.sfxVolume);
    this.emitObjective();
    // The HUD may still be booting; refresh it once it can listen.
    this.time.delayedCall(80, () => {
      EventBus.emit(GameEvents.CoinsChanged, this.market.coins);
      EventBus.emit(GameEvents.GemsChanged, this.market.gems);
      EventBus.emit(GameEvents.BackpackChanged, this.backpack.total, this.backpack.capacity);
      this.emitObjective();
    });
  }

  /** Writes the current state to the active backend. */
  saveNow(): void {
    const save = this.collectSave();
    if (Playables.inPlayablesEnv) {
      const serialized = serializeSave(save);
      if (serialized) void Playables.saveCloudSave(serialized);
    } else {
      storeLocalSave(save);
    }
  }

  private buildGround(): void {
    this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'grass')
      .setOrigin(0, 0)
      .setDepth(-10);
    // Main paths: vertical entrance road and horizontal cross path.
    this.add.tileSprite(486, 0, 108, WORLD_HEIGHT, 'dirt').setOrigin(0, 0).setDepth(-9);
    this.add.tileSprite(0, 856, WORLD_WIDTH, 108, 'dirt').setOrigin(0, 0).setDepth(-9);
    // Dirt apron in front of the market stall.
    this.add.tileSprite(660, 1150, 360, 310, 'dirt').setOrigin(0, 0).setDepth(-9);
  }

  private buildFields(): void {
    FIELDS.forEach((rect) => this.drawFieldVisual(rect));
  }

  /** Soil and border for one field. Also used when an area unlocks. */
  private drawFieldVisual(rect: FieldRect): void {
    this.add.tileSprite(rect.x, rect.y, rect.w, rect.h, 'soil').setOrigin(0, 0).setDepth(-8);
    const border = this.add.graphics().setDepth(-7);
    border.lineStyle(6, 0x7a4f2a, 1);
    border.strokeRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
  }

  /** The fenced South Field: solid fences and a lock label. */
  private buildLockedArea(): void {
    const rect = SOUTH_FIELD.rect;
    this.lockedFences = this.physics.add.staticGroup();
    const add = (x: number, y: number, key: string) => {
      const fence = this.lockedFences.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
      fence.setDepth(y + 20);
      fence.refreshBody();
    };
    for (let x = rect.x + 32; x <= rect.x + rect.w - 32; x += 64) {
      add(x, rect.y, 'fence');
      add(x, rect.y + rect.h, 'fence');
    }
    for (let y = rect.y + 52; y <= rect.y + rect.h - 12; y += 64) {
      add(rect.x + 14, y, 'fence-v');
      add(rect.x + rect.w - 14, y, 'fence-v');
    }
    this.lockedLabel = this.add
      .text(rect.x + rect.w / 2, rect.y + rect.h / 2, `${SOUTH_FIELD.name}\nLocked: ${SOUTH_FIELD.cost} coins`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(rect.y + rect.h / 2);
    // Tapping the sign opens the shop, where the unlock is bought.
    this.lockedLabel.setInteractive({ useHandCursor: true });
    this.lockedLabel.on(Phaser.Input.Events.POINTER_DOWN, () => {
      EventBus.emit(GameEvents.OpenShop);
    });
  }

  /** Fenced animal pens, each with a gate gap on the south side. */
  private buildPens(): void {
    this.penFences = this.physics.add.staticGroup();
    const pen = (rect: PenRect, gateX: number) => {
      const add = (x: number, y: number, key: string) => {
        const fence = this.penFences.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
        fence.setDepth(y + 20);
        fence.refreshBody();
      };
      for (let x = rect.x + 32; x <= rect.x + rect.w - 32; x += 64) {
        add(x, rect.y, 'fence');
        if (Math.abs(x - gateX) > 40) add(x, rect.y + rect.h, 'fence'); // south gate gap
      }
      for (let y = rect.y + 52; y <= rect.y + rect.h - 12; y += 64) {
        add(rect.x + 14, y, 'fence-v');
        add(rect.x + rect.w - 14, y, 'fence-v');
      }
    };
    pen(CHICKEN_PEN, 748);
    pen(COW_PEN, 812);
  }

  /** Claims a completed mission. Returns true when it paid out. */
  claimMission(missionId: string): boolean {
    const row = this.missions.describe().find((r) => r.id === missionId);
    const claimed = this.missions.claim(missionId, this.market);
    if (claimed && row) {
      this.floatingText(this.player.x, this.player.y - 56, `Claimed ${row.rewardText}`, '#ffd94d');
      Audio.playSuccess();
      this.burst(this.player.x, this.player.y - 30, [
        row.rewardKind === 'gems' ? 'dot-purple' : 'dot-gold',
        'dot-yellow',
      ]);
      this.emitObjective();
    }
    return claimed;
  }

  private emitMissionsState(): void {
    EventBus.emit(GameEvents.MissionsState, {
      rows: this.missions.describe(),
      coins: this.market.coins,
      gems: this.market.gems,
    });
  }

  /**
   * Tracks a gameplay event, then notices if it completed a mission:
   * the player hears the success jingle once per completion and the
   * HUD objective moves on to the next mission.
   */
  private trackMission(kind: 'harvest' | 'sell' | 'serve' | 'collect' | 'area', itemId: string | undefined, amount: number): void {
    const completedBefore = new Set(
      this.missions.describe().filter((r) => r.complete && !r.claimed).map((r) => r.id),
    );
    this.missions.track(kind, itemId, amount);
    const newlyDone = this.missions
      .describe()
      .filter((r) => r.complete && !r.claimed && !completedBefore.has(r.id));
    if (newlyDone.length > 0) {
      Audio.playSuccess();
      this.floatingText(
        this.player.x,
        this.player.y - 84,
        `Mission complete: ${newlyDone[0].title}`,
        '#ffd94d',
      );
    }
    this.emitObjective();
  }

  private emitObjective(): void {
    const rows = this.missions.describe();
    const claimable = rows.find((r) => r.complete && !r.claimed);
    const active = rows.find((r) => !r.complete && !r.claimed);
    const text = claimable
      ? `Objective complete: claim ${claimable.rewardText} in TASKS`
      : active
        ? `Objective: ${active.title} (${active.progress}/${active.target})`
        : 'All missions complete. Nice farming!';
    EventBus.emit(GameEvents.ObjectiveUpdated, text);
  }

  /** A small burst of coloured dots, for harvests and rewards. */
  private burst(x: number, y: number, textures: string[]): void {
    for (let i = 0; i < 7; i++) {
      const dot = this.add
        .image(x, y, textures[i % textures.length])
        .setDepth(1500)
        .setScale(0.8 + Math.random() * 0.7);
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 26;
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - 14,
        alpha: 0,
        duration: 420 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  /** Coins fly from the stall to the HUD coin counter on a sale. */
  private coinFly(fromX: number, fromY: number): void {
    const cam = this.cameras.main;
    const targetX = cam.scrollX + 492;
    const targetY = cam.scrollY + 18;
    for (let i = 0; i < 4; i++) {
      const coin = this.add.image(fromX, fromY, 'coin').setDepth(1600);
      this.tweens.add({
        targets: coin,
        x: targetX,
        y: targetY,
        scale: 0.55,
        delay: i * 70,
        duration: 520,
        ease: 'Quad.easeInOut',
        onComplete: () => coin.destroy(),
      });
    }
  }

  /** Pushes owned upgrade levels into the live systems. */
  private applyUpgradeEffects(): void {
    this.backpack.setCapacity(this.upgrades.backpackCapacity());
    this.market.priceMultiplier = this.upgrades.priceMultiplier();
    this.cropSystem.timeScale = this.upgrades.growthFactor();
    if (this.player) this.player.speedMultiplier = this.upgrades.speedMultiplier();
  }

  /** Buys one upgrade level. Returns true when the purchase applied. */
  buyUpgrade(trackId: string): boolean {
    const bought = this.upgrades.buy(trackId, this.market);
    if (bought) this.applyUpgradeEffects();
    return bought;
  }

  /** Unlocks the South Field for its coin cost. */
  unlockSouthField(): boolean {
    if (this.areaUnlocked) return false;
    if (!this.market.spendCoins(SOUTH_FIELD.cost)) return false;
    this.applyUnlockedArea();
    this.trackMission('area', undefined, 1);
    this.floatingText(
      SOUTH_FIELD.rect.x + SOUTH_FIELD.rect.w / 2,
      SOUTH_FIELD.rect.y + 40,
      `${SOUTH_FIELD.name} unlocked`,
      '#ffd94d',
    );
    return true;
  }

  /**
   * The world changes of the unlock, shared by the purchase path and
   * by save loading. No cost, no mission event, no fanfare here.
   */
  private applyUnlockedArea(): void {
    this.areaUnlocked = true;
    this.lockedFences.clear(true, true);
    this.lockedLabel.destroy();
    this.drawFieldVisual(SOUTH_FIELD.rect);
    // The South Field is the carrot field: the second crop, planted on
    // unlock, and carrot orders join the pattern from here.
    this.cropSystem.addField(SOUTH_FIELD.rect, this.time.now, CARROT);
    this.customerSystem.allowCarrot = true;
  }

  private emitShopState(): void {
    EventBus.emit(GameEvents.ShopState, {
      coins: this.market.coins,
      gems: this.market.gems,
      rows: this.upgrades.describe(),
      area: {
        name: SOUTH_FIELD.name,
        blurb: SOUTH_FIELD.blurb,
        cost: SOUTH_FIELD.cost,
        unlocked: this.areaUnlocked,
      },
    });
  }

  /** Harvests the ready crop currently highlighted in range, if any. */
  private harvestNearest(): void {
    const crop =
      this.nearbyCrop ??
      this.cropSystem.nearestReady(this.player.x, this.player.y, HARVEST_RANGE);
    if (crop) this.tryHarvest(crop);
  }

  private tryHarvest(crop: Crop): void {
    if (!crop.ready) return;
    const added = this.backpack.add(crop.definition.id, crop.definition.yieldAmount);
    if (added === 0) {
      // Honest capacity feedback: the crop stays ready, nothing is lost.
      this.floatingText(this.player.x, this.player.y - 52, 'Backpack full', '#ff9d8a');
      Audio.playError();
      EventBus.emit(GameEvents.BackpackChanged, this.backpack.total, this.backpack.capacity);
      return;
    }
    crop.startRegrowth(this.time.now);
    Audio.playHarvest();
    this.burst(crop.x, crop.y - 6, ['dot-green', 'dot-yellow']);
    this.trackMission('harvest', crop.definition.id, added);
    this.floatingText(crop.x, crop.y - 30, `+${added} ${crop.definition.name}`, '#fff3a0');
    this.tweens.add({
      targets: crop,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 90,
      yoyo: true,
    });
    if (this.pendingHarvest === crop) this.pendingHarvest = null;
  }

  private floatingText(x: number, y: number, message: string, color: string): void {
    const text = this.add
      .text(x, y, message, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(950);
    this.tweens.add({
      targets: text,
      y: y - 42,
      alpha: 0,
      duration: 900,
      onComplete: () => text.destroy(),
    });
  }

  private buildStall(): Phaser.GameObjects.Rectangle[] {
    const stall = this.add.image(840, 1290, 'stall');
    stall.setDepth(1290 + 90);
    // The counter front is solid; the awning overhang is not.
    const counter = this.add.rectangle(840, 1356, 224, 46, 0x000000, 0);
    this.physics.add.existing(counter, true);
    return [counter];
  }

  private buildTrees(): Phaser.GameObjects.Rectangle[] {
    const positions: Array<[number, number]> = [
      [980, 1500],
      [950, 730],
      [300, 108],
      [700, 990],
      [140, 1450],
    ];
    return positions.map(([x, y]) => {
      const tree = this.add.image(x, y, 'tree');
      tree.setDepth(y + 58);
      const trunk = this.add.rectangle(x, y + 48, 26, 18, 0x000000, 0);
      this.physics.add.existing(trunk, true);
      return trunk;
    });
  }

  private buildFences(): Phaser.Physics.Arcade.StaticGroup {
    const fences = this.physics.add.staticGroup();
    const add = (x: number, y: number, key: string) => {
      const fence = fences.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
      fence.setDepth(y + 20);
      fence.refreshBody();
    };
    // Perimeter, inset from the world edge, with a gate gap at the
    // south where the entrance road leaves the farm.
    for (let x = 52; x <= 1028; x += 64) add(x, 28, 'fence');
    for (let x = 52; x <= 1028; x += 64) {
      if (x >= 460 && x <= 620) continue; // entrance gate gap
      add(x, 1572, 'fence');
    }
    for (let y = 92; y <= 1544; y += 64) {
      add(28, y, 'fence-v');
      add(1052, y, 'fence-v');
    }
    return fences;
  }

  private buildDecor(): void {
    const flat = (x: number, y: number, key: string) =>
      this.add.image(x, y, key).setDepth(-6);
    flat(200, 506, 'flower');
    flat(900, 640, 'flower');
    flat(900, 820, 'flower');
    flat(1010, 780, 'flower');
    flat(760, 1520, 'flower');
    flat(1020, 620, 'flower');
    flat(96, 1006, 'flower');
    flat(470, 626, 'stone');
    flat(880, 640, 'stone');
    flat(240, 1520, 'stone');
    flat(1016, 1206, 'stone');

    const bushes: Array<[number, number]> = [
      [612, 612],
      [905, 590],
      [1006, 316],
      [640, 1490],
    ];
    bushes.forEach(([x, y]) => {
      const bush = this.add.image(x, y, 'bush');
      bush.setDepth(y + 22);
    });
  }

  private buildEntranceSign(): void {
    const sign = this.add.image(372, 1506, 'sign-board');
    sign.setDepth(1506 + 52);
    const label = this.add
      .text(372, 1486, 'HARVEST LANE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#fff3d6',
      })
      .setOrigin(0.5);
    label.setDepth(1506 + 53);
  }

  update(time: number, delta: number): void {
    const moving = this.player.updatePlayer();
    this.customerSystem.update(time, delta);
    // Autosave: progress is never more than a few seconds from safe.
    this.saveTimer += delta;
    if (this.saveTimer >= 5000) {
      this.saveTimer = 0;
      this.saveNow();
    }
    this.animalSystem.update(
      time,
      delta,
      this.player.x,
      this.player.y,
      this.backpack,
      (itemId, x, y) => {
        this.floatingText(x, y - 18, `+1 ${ITEM_NAMES[itemId] ?? itemId}`, '#fff3a0');
        Audio.playPickup();
        this.trackMission('collect', itemId, 1);
      },
      () => {
        if (time - this.lastFullBagNote > 2500) {
          this.lastFullBagNote = time;
          this.floatingText(this.player.x, this.player.y - 52, 'Backpack full', '#ff9d8a');
        }
      },
    );

    // Standing at the stall front moves backpack produce onto the
    // stall, one unit at a time, like the genre's stocking loop.
    this.depositTimer += delta;
    if (this.depositTimer >= DEPOSIT_INTERVAL_MS) {
      this.depositTimer = 0;
      const nearStall =
        Phaser.Math.Distance.Between(this.player.x, this.player.y, STALL_FRONT.x, STALL_FRONT.y) <=
        DEPOSIT_RANGE;
      if (nearStall) {
        const itemId = DEPOSIT_ITEMS.find((id) => this.backpack.countOf(id) > 0);
        if (itemId) {
          this.backpack.remove(itemId, 1);
          this.market.addStock(itemId, 1);
          this.floatingText(STALL_FRONT.x, 1310, '+1', '#ffffff');
        }
      }
    }

    // Customers are served from stock while they wait at the front.
    this.serveTimer += delta;
    if (this.serveTimer >= 300) {
      this.serveTimer = 0;
      this.customerSystem.tryServeFront();
    }
    // Depth sort by feet position so the player passes convincingly in
    // front of and behind fences, trees and the stall.
    this.player.setDepth(this.player.y + 32);
    this.playerShadow.setPosition(this.player.x, this.player.y + 31);
    this.playerShadow.setDepth(this.player.depth - 1);
    if (moving !== this.wasMoving) {
      this.wasMoving = moving;
      EventBus.emit(moving ? GameEvents.PlayerMoved : GameEvents.PlayerStopped);
    }

    // Arriving at a tapped crop harvests it.
    if (this.pendingHarvest) {
      const crop = this.pendingHarvest;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, crop.x, crop.y);
      if (dist <= HARVEST_RANGE && crop.ready) {
        this.tryHarvest(crop);
        this.pendingHarvest = null;
      } else if (!moving && dist > HARVEST_RANGE) {
        this.pendingHarvest = null; // blocked or walked away
      }
    }

    // Growth and proximity highlight on a throttled tick.
    if (time - this.lastCropTick >= 200) {
      this.lastCropTick = time;
      this.cropSystem.update(time);
      // Ready crops breathe gently so ripe fields feel alive. Only
      // ready crops are scaled here, so the harvest pop tween (which
      // runs on a just-harvested, not-ready crop) never fights it.
      this.cropSystem.crops.forEach((crop) => {
        if (crop.ready) crop.setScale(1 + 0.05 * Math.sin(time / 300 + crop.x * 0.05));
        else if (crop.scaleX !== 1) crop.setScale(1);
      });
      const nearby = this.cropSystem.nearestReady(this.player.x, this.player.y, HARVEST_RANGE);
      if (nearby !== this.nearbyCrop) {
        this.nearbyCrop = nearby;
        EventBus.emit(GameEvents.CropNearbyChanged, nearby !== null);
      }
      if (nearby) {
        this.highlight.setPosition(nearby.x, nearby.y).setVisible(true);
        this.growthHint.setVisible(false);
      } else {
        this.highlight.setVisible(false);
        // Nearest growing crop shows its progress instead, so the
        // player can see at a glance how long is left.
        let best: Crop | null = null;
        let bestDist = HARVEST_RANGE + 14;
        this.cropSystem.crops.forEach((crop) => {
          if (crop.ready) return;
          const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, crop.x, crop.y);
          if (d < bestDist) {
            bestDist = d;
            best = crop;
          }
        });
        if (best) {
          const growing: Crop = best;
          this.growthHint
            .setText(`${Math.floor(growing.progress01(time) * 100)}%`)
            .setPosition(growing.x, growing.y - 34)
            .setVisible(true);
        } else {
          this.growthHint.setVisible(false);
        }
      }
    }

    // Occasional soft animal sounds when the player is near a pen.
    if (time - this.lastAmbientAt >= 3000) {
      this.lastAmbientAt = time;
      const kind = this.animalSystem.nearestKind(this.player.x, this.player.y, 430);
      if (kind === 'chicken' && Math.random() < 0.55) Audio.playCluck();
      else if (kind === 'cow' && Math.random() < 0.4) Audio.playMoo();
    }
  }
}
