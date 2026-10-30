import Phaser from 'phaser';
import { EventBus, GameEvents } from '../game/EventBus';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../game/GameConstants';
import { UIStyle } from '../ui/UIStyle';
import { Audio } from '../systems/AudioSystem';

/**
 * Heads-up display: title, backpack counter, coin counter, a controls
 * hint, and the harvest action button. Every number shown is driven by
 * real system events; panels for missions and upgrades arrive with
 * their systems in later phases.
 */
interface ShopRow {
  id: string;
  name: string;
  blurb: string;
  level: number;
  maxLevel: number;
  nextCost: number | null;
  effectNow: string;
  effectNext: string | null;
}

interface ShopState {
  coins: number;
  gems: number;
  rows: ShopRow[];
  area: { name: string; blurb: string; cost: number; unlocked: boolean };
}

interface MissionRow {
  id: string;
  title: string;
  progress: number;
  target: number;
  complete: boolean;
  claimed: boolean;
  rewardText: string;
}

interface MissionsState {
  rows: MissionRow[];
  coins: number;
  gems: number;
}

export class UIScene extends Phaser.Scene {
  private bagText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private gemsText!: Phaser.GameObjects.Text;
  private harvestButton!: Phaser.GameObjects.Container;
  private shopPanel: Phaser.GameObjects.Container | null = null;
  private shopContent: Phaser.GameObjects.Container | null = null;
  private missionsPanel: Phaser.GameObjects.Container | null = null;
  private missionsContent: Phaser.GameObjects.Container | null = null;
  private settingsPanel: Phaser.GameObjects.Container | null = null;
  private bagFill!: Phaser.GameObjects.Rectangle;
  private objectiveText!: Phaser.GameObjects.Text;
  private activeSlider: 'music' | 'sfx' | null = null;
  private sliderKnobs: Record<'music' | 'sfx', Phaser.GameObjects.Arc | null> = {
    music: null,
    sfx: null,
  };
  private sliderApply: Record<'music' | 'sfx', ((localX: number) => void) | null> = {
    music: null,
    sfx: null,
  };

  constructor() {
    super('UI');
  }

  create(): void {
    const bar = this.add.rectangle(0, 0, DESIGN_WIDTH, 56, 0x000000, 0.28).setOrigin(0, 0);
    bar.setScrollFactor(0);

    this.add
      .text(16, 16, 'HARVEST LANE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setScrollFactor(0);

    this.bagText = this.add
      .text(DESIGN_WIDTH / 2, 20, 'Bag 0/10', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.coinsText = this.add
      .text(DESIGN_WIDTH - 40, 7, 'Coins 0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#ffd94d',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.gemsText = this.add
      .text(DESIGN_WIDTH - 40, 29, 'Gems 0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#d8a7ff',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    // Currency icons at the right edge, clear of the counters.
    this.add.image(DESIGN_WIDTH - 20, 16, 'coin').setScrollFactor(0);
    this.add.image(DESIGN_WIDTH - 20, 36, 'icon-gem').setScrollFactor(0).setScale(0.8);

    // Backpack fill bar under the bag counter: fills green to orange
    // to red as the bag fills, so capacity is visible at a glance.
    this.add
      .rectangle(DESIGN_WIDTH / 2, 46, 124, 10, 0x000000, 0.35)
      .setScrollFactor(0);
    this.bagFill = this.add
      .rectangle(DESIGN_WIDTH / 2 - 60, 46, 120, 7, 0x7ec850, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.bagFill.setScale(0.001, 1);

    // Objective pill: the current mission, always visible.
    this.objectiveText = this.add
      .text(16, 64, 'Objective: ...', {
        fontFamily: UIStyle.FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: 'rgba(43,33,53,0.75)',
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0);

    // Settings gear, top-right under the bar.
    const gearButton = this.add
      .container(DESIGN_WIDTH - 34, 88, [
        this.add.circle(0, 0, 24, UIStyle.PANEL_BG, 0.85).setStrokeStyle(2, 0xffffff, 0.6),
        this.add.image(0, 0, 'icon-gear'),
      ])
      .setScrollFactor(0);
    gearButton.setInteractive(
      new Phaser.Geom.Circle(0, 0, 24),
      Phaser.Geom.Circle.Contains,
    );
    gearButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.pressFeedback(gearButton);
      this.openSettings();
    });

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 28, 'Drag to steer, tap to walk, or use WASD', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.28)',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Harvest action button (bottom-right). Dim when no ready crop is
    // in range, fully lit when there is. The joystick ignores presses
    // in this zone, and the button emits over the EventBus.
    const buttonCircle = this.add.circle(0, 0, 46, 0xe8873a, 1);
    buttonCircle.setStrokeStyle(3, 0xffffff, 0.8);
    const buttonLabel = this.add
      .text(0, 0, 'HARVEST', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.harvestButton = this.add
      .container(DESIGN_WIDTH - 66, DESIGN_HEIGHT - 158, [buttonCircle, buttonLabel])
      .setScrollFactor(0)
      .setAlpha(0.4);
    this.harvestButton.setInteractive(
      new Phaser.Geom.Circle(0, 0, 46),
      Phaser.Geom.Circle.Contains,
    );
    this.harvestButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.pressFeedback(this.harvestButton);
      EventBus.emit(GameEvents.HarvestPressed);
    });

    // Shop button (bottom-left), mirroring the harvest button.
    const shopCircle = this.add.circle(0, 0, 46, 0x2e86ab, 1);
    shopCircle.setStrokeStyle(3, 0xffffff, 0.8);
    const shopLabel = this.add
      .text(0, 0, 'SHOP', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const shopButton = this.add
      .container(66, DESIGN_HEIGHT - 158, [shopCircle, shopLabel])
      .setScrollFactor(0);
    shopButton.setInteractive(
      new Phaser.Geom.Circle(0, 0, 46),
      Phaser.Geom.Circle.Contains,
    );
    shopButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.pressFeedback(shopButton);
      Audio.playClick();
      this.openShop();
    });

    // Missions button, stacked above the shop button.
    const tasksCircle = this.add.circle(0, 0, 46, 0x7d5ba6, 1);
    tasksCircle.setStrokeStyle(3, 0xffffff, 0.8);
    const tasksLabel = this.add
      .text(0, 0, 'TASKS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const tasksButton = this.add
      .container(66, DESIGN_HEIGHT - 264, [tasksCircle, tasksLabel])
      .setScrollFactor(0);
    tasksButton.setInteractive(
      new Phaser.Geom.Circle(0, 0, 46),
      Phaser.Geom.Circle.Contains,
    );
    tasksButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.pressFeedback(tasksButton);
      Audio.playClick();
      this.openMissions();
    });

    EventBus.on(GameEvents.BackpackChanged, (count: number, capacity: number) => {
      this.bagText.setText(`Bag ${count}/${capacity}`);
      this.bagText.setColor(count >= capacity ? '#ff9d8a' : '#ffffff');
      const frac = capacity > 0 ? count / capacity : 0;
      this.bagFill.setScale(Math.max(0.001, frac), 1);
      this.bagFill.setFillStyle(frac >= 1 ? 0xe2574c : frac >= 0.7 ? 0xf2c14e : 0x7ec850, 1);
    });
    EventBus.on(GameEvents.CoinsChanged, (coins: number) => {
      this.coinsText.setText(`Coins ${coins}`);
      this.pulse(this.coinsText);
    });
    EventBus.on(GameEvents.GemsChanged, (gems: number) => {
      this.gemsText.setText(`Gems ${gems}`);
      this.pulse(this.gemsText);
    });
    EventBus.on(GameEvents.ObjectiveUpdated, (text: string) => {
      this.objectiveText.setText(text);
    });
    EventBus.emit(GameEvents.ObjectiveRequest);
    EventBus.on(GameEvents.OpenShop, () => this.openShop());
    EventBus.on(GameEvents.CropNearbyChanged, (nearby: boolean) => {
      this.harvestButton.setAlpha(nearby ? 1 : 0.4);
    });
    EventBus.on(GameEvents.ShopState, (state: ShopState) => {
      if (this.shopPanel) this.renderShop(state);
    });
    EventBus.on(GameEvents.MissionsState, (state: MissionsState) => {
      if (this.missionsPanel) this.renderMissions(state);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.removeAllListeners();
    });

    // Slider dragging continues outside the slider's own zone.
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (!this.activeSlider || !this.settingsPanel) return;
      const apply = this.sliderApply[this.activeSlider];
      if (!apply) return;
      const local = this.settingsPanel
        .getLocalTransformMatrix()
        .invert()
        .transformPoint(pointer.x, pointer.y) as { x: number; y: number };
      apply(local.x);
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.activeSlider = null;
    });
  }

  /** Quick squash-and-recover so every button visibly responds. */
  private pressFeedback(target: Phaser.GameObjects.Container): void {
    this.tweens.add({
      targets: target,
      scaleX: 0.92,
      scaleY: 0.92,
      duration: 70,
      yoyo: true,
    });
  }

  private pulse(text: Phaser.GameObjects.Text): void {
    this.tweens.add({ targets: text, scale: 1.18, duration: 90, yoyo: true });
  }

  /** Panels grow and fade in instead of popping. */
  private animatePanelIn(panel: Phaser.GameObjects.Container): void {
    panel.setScale(0.92).setAlpha(0);
    this.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      duration: 160,
      ease: 'Quad.easeOut',
    });
  }

  private openShop(): void {
    if (this.shopPanel || this.missionsPanel || this.settingsPanel) return;
    const bg = this.add.rectangle(0, 0, 500, 720, 0x22301d, 0.98);
    bg.setStrokeStyle(3, 0xffffff, 0.35);
    const title = this.add
      .text(0, -330, 'UPGRADES', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);
    const close = this.add
      .text(224, -336, 'X', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    close.on(Phaser.Input.Events.POINTER_DOWN, () => this.closeShop());
    this.shopContent = this.add.container(0, 0, []);
    this.shopPanel = this.add
      .container(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, [bg, title, close, this.shopContent])
      .setScrollFactor(0)
      .setDepth(500);
    this.animatePanelIn(this.shopPanel);
    // The game world pauses behind the shop; purchases still apply
    // because they travel over the EventBus, not the update loop.
    this.scene.pause('Game');
    EventBus.emit(GameEvents.ShopRequestState);
  }

  private closeShop(): void {
    this.shopPanel?.destroy();
    this.shopPanel = null;
    this.shopContent = null;
    this.scene.resume('Game');
  }

  private renderShop(state: ShopState): void {
    if (!this.shopContent) return;
    this.shopContent.removeAll(true);
    const add = (obj: Phaser.GameObjects.GameObject) => {
      this.shopContent?.add(obj);
      return obj;
    };
    const text = (
      x: number,
      y: number,
      value: string,
      size: number,
      color: string,
      bold = false,
    ) =>
      add(
        this.add.text(x, y, value, {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${size}px`,
          fontStyle: bold ? 'bold' : 'normal',
          color,
        }),
      );

    text(-232, -282, `Coins ${state.coins}   Gems ${state.gems}`, 18, '#ffd94d', true);

    state.rows.forEach((row, i) => {
      const y = -238 + i * 104;
      text(-232, y, `${row.name}  Lv ${row.level}/${row.maxLevel}`, 20, '#ffffff', true);
      text(
        -232,
        y + 28,
        row.effectNext ? `${row.effectNow}  ->  ${row.effectNext}` : row.effectNow,
        16,
        '#b9d99a',
      );
      text(-232, y + 54, row.blurb, 14, '#9aa88f');
      this.shopBuyButton(150, y + 26, row.nextCost, state.coins, () => {
        EventBus.emit(GameEvents.ShopBuyUpgrade, row.id);
      }, add);
    });

    const areaY = -238 + state.rows.length * 104 + 14;
    text(-232, areaY, 'AREAS', 18, '#ffd94d', true);
    text(-232, areaY + 30, `${state.area.name}${state.area.unlocked ? '  (unlocked)' : ''}`, 20, '#ffffff', true);
    text(-232, areaY + 58, state.area.blurb, 14, '#9aa88f');
    if (!state.area.unlocked) {
      this.shopBuyButton(150, areaY + 42, state.area.cost, state.coins, () => {
        EventBus.emit(GameEvents.ShopBuyArea);
      }, add);
    }
  }

  private openMissions(): void {
    if (this.missionsPanel || this.shopPanel || this.settingsPanel) return;
    const bg = this.add.rectangle(0, 0, 500, 700, 0x2b2135, 0.98);
    bg.setStrokeStyle(3, 0xffffff, 0.35);
    const title = this.add
      .text(0, -318, 'MISSIONS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);
    const close = this.add
      .text(224, -324, 'X', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    close.on(Phaser.Input.Events.POINTER_DOWN, () => this.closeMissions());
    this.missionsContent = this.add.container(0, 0, []);
    this.missionsPanel = this.add
      .container(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, [bg, title, close, this.missionsContent])
      .setScrollFactor(0)
      .setDepth(500);
    this.animatePanelIn(this.missionsPanel);
    this.scene.pause('Game');
    EventBus.emit(GameEvents.MissionsRequestState);
  }

  private closeMissions(): void {
    this.missionsPanel?.destroy();
    this.missionsPanel = null;
    this.missionsContent = null;
    this.scene.resume('Game');
  }

  private renderMissions(state: MissionsState): void {
    if (!this.missionsContent) return;
    this.missionsContent.removeAll(true);
    const add = (obj: Phaser.GameObjects.GameObject) => {
      this.missionsContent?.add(obj);
      return obj;
    };
    state.rows.forEach((row, i) => {
      const y = -262 + i * 96;
      add(
        this.add.text(-232, y, row.title, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: row.claimed ? '#8f9a8a' : '#ffffff',
        }),
      );
      add(
        this.add.text(-232, y + 30, `Progress ${row.progress}/${row.target}   Reward: ${row.rewardText}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '15px',
          color: '#c9b8e8',
        }),
      );
      const label = row.claimed ? 'DONE' : row.complete ? 'CLAIM' : `${row.progress}/${row.target}`;
      const rect = this.add.rectangle(
        150,
        y + 22,
        128,
        46,
        row.claimed ? 0x555555 : row.complete ? 0x57a639 : 0x777777,
        1,
      );
      const btnText = this.add
        .text(150, y + 22, label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      add(rect);
      add(btnText);
      if (row.complete && !row.claimed) {
        rect.setInteractive({ useHandCursor: true });
        rect.on(Phaser.Input.Events.POINTER_DOWN, () => {
          Audio.playClick();
          EventBus.emit(GameEvents.MissionClaim, row.id);
        });
      }
    });
  }

  private shopBuyButton(
    x: number,
    y: number,
    cost: number | null,
    coins: number,
    onBuy: () => void,
    add: (obj: Phaser.GameObjects.GameObject) => void,
  ): void {
    const maxed = cost === null;
    const affordable = !maxed && coins >= (cost ?? 0);
    const rect = this.add.rectangle(x, y, 128, 46, maxed ? 0x555555 : affordable ? 0x57a639 : 0x777777, 1);
    const label = this.add
      .text(x, y, maxed ? 'MAX' : `${cost} coins`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    add(rect);
    add(label);
    if (affordable) {
      rect.setInteractive({ useHandCursor: true });
      rect.on(Phaser.Input.Events.POINTER_DOWN, () => {
        Audio.playClick();
        onBuy();
      });
    }
  }

  // Settings panel: independent music and sound volume sliders.
  // Both apply live to the AudioSystem and persist via its settings,
  // so the acceptance rule "sound controls work and persist" holds.

  private openSettings(): void {
    if (this.settingsPanel || this.shopPanel || this.missionsPanel) return;
    Audio.ensure();
    const bg = this.add.rectangle(0, 0, 460, 400, UIStyle.PANEL_BG, UIStyle.PANEL_ALPHA);
    bg.setStrokeStyle(3, 0xffffff, 0.35);
    const title = this.add
      .text(0, -172, 'SETTINGS', {
        fontFamily: UIStyle.FONT,
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);
    const close = this.add
      .text(196, -178, 'X', {
        fontFamily: UIStyle.FONT,
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    close.on(Phaser.Input.Events.POINTER_DOWN, () => this.closeSettings());
    const musicLabel = this.add.text(-190, -96, 'Music', {
      fontFamily: UIStyle.FONT,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    const sfxLabel = this.add.text(-190, -8, 'Sound effects', {
      fontFamily: UIStyle.FONT,
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    const note = this.add
      .text(0, 108, 'Progress and volumes save automatically.', {
        fontFamily: UIStyle.FONT,
        fontSize: '15px',
        color: UIStyle.TEXT_DIM,
        align: 'center',
      })
      .setOrigin(0.5, 0);
    this.settingsPanel = this.add
      .container(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, [bg, title, close, musicLabel, sfxLabel, note])
      .setScrollFactor(0)
      .setDepth(500);
    this.sliderKnobs.music = this.makeSlider(this.settingsPanel, -52, Audio.settings.musicVolume, 'music');
    this.sliderKnobs.sfx = this.makeSlider(this.settingsPanel, 36, Audio.settings.sfxVolume, 'sfx');
    this.animatePanelIn(this.settingsPanel);
    this.scene.pause('Game');
  }

  private closeSettings(): void {
    this.settingsPanel?.destroy();
    this.settingsPanel = null;
    this.sliderKnobs = { music: null, sfx: null };
    this.sliderApply = { music: null, sfx: null };
    this.activeSlider = null;
    this.scene.resume('Game');
  }

  private makeSlider(
    panel: Phaser.GameObjects.Container,
    y: number,
    value: number,
    kind: 'music' | 'sfx',
  ): Phaser.GameObjects.Arc {
    const track = this.add.rectangle(30, y, 300, 14, 0x55496b, 1);
    const fill = this.add
      .rectangle(-120, y, 300, 14, kind === 'music' ? 0xc77dff : 0x57a639, 1)
      .setOrigin(0, 0.5)
      .setScale(Math.max(0.001, value), 1);
    fill.setName(`fill-${kind}`);
    const knob = this.add.circle(-120 + value * 300, y, 15, 0xffffff, 1);
    knob.setStrokeStyle(2, 0x000000, 0.25);
    panel.add([track, fill, knob]);
    const zone = this.add
      .zone(30, y, 340, 48)
      .setInteractive({ useHandCursor: true });
    panel.add(zone);
    const apply = (localX: number) => {
      const v = Phaser.Math.Clamp((localX + 120) / 300, 0, 1);
      knob.setX(-120 + v * 300);
      fill.setScale(Math.max(0.001, v), 1);
      if (kind === 'music') Audio.setMusicVolume(v);
      else Audio.setSfxVolume(v);
    };
    this.sliderApply[kind] = apply;
    zone.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.activeSlider = kind;
      const local = panel.getLocalTransformMatrix().invert().transformPoint(pointer.x, pointer.y) as { x: number; y: number };
      apply(local.x);
    });
    return knob;
  }
}
