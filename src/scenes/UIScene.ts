import Phaser from 'phaser';
import { EventBus, GameEvents } from '../game/EventBus';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../game/GameConstants';
import { UIStyle } from '../ui/UIStyle';
import { Audio } from '../systems/AudioSystem';

/**
 * Heads-up display in the casual tycoon layout: farmer avatar and
 * round medallion buttons down the left edge, currency pills at the
 * top right, a wide objective card at the top centre, the missions
 * clipboard on the right edge, and the harvest button bottom-right.
 * Panels are cream cards with wood borders and blue ribbon headers.
 * Every number shown is driven by real system events.
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
  private objectiveIcon!: Phaser.GameObjects.Image;
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
    // Avatar medallion, top-left, with a star badge.
    this.add.image(42, 42, 'avatar').setScrollFactor(0);
    this.add.image(70, 66, 'icon-star').setScrollFactor(0);

    // Medallion buttons down the left edge: settings, then shop.
    const medallion = (
      y: number,
      icon: string,
      label: string,
      onTap: () => void,
    ): Phaser.GameObjects.Container => {
      const c = this.add
        .container(42, y, [
          this.add.image(0, 0, icon),
          this.add
            .text(0, 34, label, {
              fontFamily: UIStyle.FONT,
              fontSize: '12px',
              fontStyle: 'bold',
              color: '#ffffff',
              stroke: '#3a2a18',
              strokeThickness: 4,
            })
            .setOrigin(0.5, 0),
        ])
        .setScrollFactor(0);
      c.setInteractive(
        new Phaser.Geom.Circle(0, 4, 30),
        Phaser.Geom.Circle.Contains,
      );
      c.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.pressFeedback(c);
        Audio.playClick();
        onTap();
      });
      return c;
    };
    medallion(122, 'icon-gear-med', 'SETTINGS', () => this.openSettings());
    medallion(196, 'icon-bag', 'SHOP', () => this.openShop());

    // Currency pills, top-right: icon, amount, and a plus button
    // that opens the panel where that currency is used or earned.
    const pill = (
      y: number,
      icon: string,
      text: Phaser.GameObjects.Text,
      onPlus: () => void,
    ): void => {
      const g = this.add.graphics().setScrollFactor(0);
      g.fillStyle(UIStyle.PILL_BG, 0.55);
      g.fillRoundedRect(DESIGN_WIDTH - 140, y - 18, 130, 36, 18);
      this.add
        .image(DESIGN_WIDTH - 122, y, icon)
        .setScrollFactor(0)
        .setScale(icon === 'icon-cash' ? 0.9 : 1.1);
      text.setPosition(DESIGN_WIDTH - 44, y).setOrigin(1, 0.5).setScrollFactor(0);
      const plus = this.add
        .container(DESIGN_WIDTH - 26, y, [
          this.add.circle(0, 0, 12, UIStyle.BTN_GO, 1).setStrokeStyle(2, 0xffffff, 0.9),
          this.add
            .text(0, -1, '+', {
              fontFamily: UIStyle.FONT,
              fontSize: '17px',
              fontStyle: 'bold',
              color: '#ffffff',
            })
            .setOrigin(0.5),
        ])
        .setScrollFactor(0);
      plus.setInteractive(
        new Phaser.Geom.Circle(0, 0, 14),
        Phaser.Geom.Circle.Contains,
      );
      plus.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.pressFeedback(plus);
        Audio.playClick();
        onPlus();
      });
    };
    this.coinsText = this.add.text(0, 0, '0', {
      fontFamily: UIStyle.FONT,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    this.gemsText = this.add.text(0, 0, '0', {
      fontFamily: UIStyle.FONT,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    pill(26, 'icon-cash', this.coinsText, () => this.openShop());
    pill(70, 'icon-gem', this.gemsText, () => this.openMissions());

    // Objective card, top centre: cream card, item icon chip, and
    // the current mission text.
    const cardW = 248;
    const cardX = DESIGN_WIDTH / 2 - cardW / 2;
    const card = this.add.graphics().setScrollFactor(0);
    card.fillStyle(UIStyle.PANEL_BG, 1);
    card.fillRoundedRect(cardX, 8, cardW, 64, 14);
    card.lineStyle(4, UIStyle.PANEL_STROKE, 1);
    card.strokeRoundedRect(cardX, 8, cardW, 64, 14);
    card.fillStyle(UIStyle.PANEL_INNER, 1);
    card.fillRoundedRect(cardX + 8, 16, 48, 48, 10);
    this.objectiveIcon = this.add
      .image(cardX + 32, 40, 'icon-corn')
      .setScrollFactor(0)
      .setScale(1.5);
    this.add
      .image(cardX + 32, 62, 'icon-star')
      .setScrollFactor(0)
      .setScale(0.62);
    this.objectiveText = this.add
      .text(cardX + 66, 40, '...', {
        fontFamily: UIStyle.FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: UIStyle.TEXT,
        wordWrap: { width: cardW - 76 },
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    // Missions clipboard, right edge.
    const missionsBtn = this.add
      .container(DESIGN_WIDTH - 42, 158, [
        this.add.image(0, 0, 'icon-clipboard'),
        this.add
          .text(0, 32, 'MISSION', {
            fontFamily: UIStyle.FONT,
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#3a2a18',
            strokeThickness: 4,
          })
          .setOrigin(0.5, 0),
      ])
      .setScrollFactor(0);
    missionsBtn.setInteractive(
      new Phaser.Geom.Rectangle(-30, -34, 60, 84),
      Phaser.Geom.Rectangle.Contains,
    );
    missionsBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.pressFeedback(missionsBtn);
      Audio.playClick();
      this.openMissions();
    });

    // Backpack pill, bottom-left: icon, count, and a fill bar.
    const bagG = this.add.graphics().setScrollFactor(0);
    bagG.fillStyle(UIStyle.PILL_BG, 0.55);
    bagG.fillRoundedRect(10, DESIGN_HEIGHT - 58, 158, 44, 14);
    this.add
      .image(34, DESIGN_HEIGHT - 36, 'icon-bag')
      .setScrollFactor(0)
      .setScale(0.72);
    this.bagText = this.add
      .text(58, DESIGN_HEIGHT - 45, '0/10', {
        fontFamily: UIStyle.FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setScrollFactor(0);
    this.add
      .rectangle(58, DESIGN_HEIGHT - 24, 100, 8, 0x000000, 0.4)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.bagFill = this.add
      .rectangle(59, DESIGN_HEIGHT - 24, 98, 6, 0x7ec850, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.bagFill.setScale(0.001, 1);

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 84, 'Drag to steer, tap to walk, or use WASD', {
        fontFamily: UIStyle.FONT,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: 'rgba(58,42,24,0.5)',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Harvest action button (bottom-right). Dim when no ready crop
    // is in range, fully lit when there is.
    const buttonCircle = this.add.circle(0, 0, 46, UIStyle.BTN_GO, 1);
    buttonCircle.setStrokeStyle(3, 0xffffff, 0.85);
    const buttonLabel = this.add
      .text(0, 0, 'HARVEST', {
        fontFamily: UIStyle.FONT,
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

    EventBus.on(GameEvents.BackpackChanged, (count: number, capacity: number) => {
      this.bagText.setText(`${count}/${capacity}`);
      this.bagText.setColor(count >= capacity ? '#ffb3a3' : '#ffffff');
      const frac = capacity > 0 ? count / capacity : 0;
      this.bagFill.setScale(Math.max(0.001, frac), 1);
      this.bagFill.setFillStyle(frac >= 1 ? 0xe2574c : frac >= 0.7 ? 0xf2c14e : 0x7ec850, 1);
    });
    EventBus.on(GameEvents.CoinsChanged, (coins: number) => {
      this.coinsText.setText(`${coins}`);
      this.pulse(this.coinsText);
    });
    EventBus.on(GameEvents.GemsChanged, (gems: number) => {
      this.gemsText.setText(`${gems}`);
      this.pulse(this.gemsText);
    });
    EventBus.on(GameEvents.ObjectiveUpdated, (text: string) => {
      this.objectiveText.setText(text.replace('Objective: ', ''));
      const lower = text.toLowerCase();
      const icon = lower.includes('carrot')
        ? 'icon-carrot'
        : lower.includes('egg')
          ? 'icon-egg'
          : lower.includes('milk')
            ? 'icon-milk'
            : lower.includes('area') || lower.includes('south')
              ? 'icon-star'
              : 'icon-corn';
      this.objectiveIcon.setTexture(icon);
      this.objectiveIcon.setScale(icon === 'icon-star' ? 1.1 : 1.5);
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

  /**
   * The shared panel shell: dim backdrop, cream card with a thick
   * wood border, a blue ribbon header with the title, and a red
   * round close button. Returns the panel and its close button.
   */
  private makePanel(
    width: number,
    height: number,
    title: string,
  ): { panel: Phaser.GameObjects.Container; close: Phaser.GameObjects.Image } {
    const parts: Phaser.GameObjects.GameObject[] = [];
    const dim = this.add
      .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0x1d2b1a, 0.45)
      .setInteractive();
    parts.push(dim);
    const g = this.add.graphics();
    g.fillStyle(UIStyle.PANEL_STROKE, 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 20);
    g.fillStyle(UIStyle.PANEL_BG, 1);
    g.fillRoundedRect(-width / 2 + 9, -height / 2 + 9, width - 18, height - 18, 14);
    // Ribbon: darker folds tucked behind a blue banner.
    const ribbonW = Math.min(330, width * 0.68);
    const ribbonY = -height / 2 - 8;
    g.fillStyle(UIStyle.RIBBON_DARK, 1);
    g.fillTriangle(-ribbonW / 2 - 16, ribbonY + 16, -ribbonW / 2 + 12, ribbonY + 16, -ribbonW / 2 + 12, ribbonY + 42);
    g.fillTriangle(ribbonW / 2 + 16, ribbonY + 16, ribbonW / 2 - 12, ribbonY + 16, ribbonW / 2 - 12, ribbonY + 42);
    g.fillStyle(UIStyle.RIBBON, 1);
    g.fillRoundedRect(-ribbonW / 2, ribbonY, ribbonW, 46, 12);
    parts.push(g);
    const titleText = this.add
      .text(0, ribbonY + 23, title, {
        fontFamily: UIStyle.FONT,
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1f5fb4',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    parts.push(titleText);
    const close = this.add
      .image(width / 2 - 4, -height / 2 + 4, 'btn-close')
      .setInteractive({ useHandCursor: true });
    parts.push(close);
    const panel = this.add
      .container(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, parts)
      .setScrollFactor(0)
      .setDepth(500);
    return { panel, close };
  }

  private openShop(): void {
    if (this.shopPanel || this.missionsPanel || this.settingsPanel) return;
    const { panel, close } = this.makePanel(500, 720, 'UPGRADES');
    close.on(Phaser.Input.Events.POINTER_DOWN, () => this.closeShop());
    this.shopContent = this.add.container(0, 0, []);
    panel.add(this.shopContent);
    this.shopPanel = panel;
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
          fontFamily: UIStyle.FONT,
          fontSize: `${size}px`,
          fontStyle: bold ? 'bold' : 'normal',
          color,
        }),
      );

    text(-232, -282, `Coins ${state.coins}   Gems ${state.gems}`, 18, UIStyle.GOLD_TEXT, true);

    state.rows.forEach((row, i) => {
      const y = -238 + i * 104;
      text(-232, y, `${row.name}  Lv ${row.level}/${row.maxLevel}`, 20, UIStyle.TEXT, true);
      text(
        -232,
        y + 28,
        row.effectNext ? `${row.effectNow}  ->  ${row.effectNext}` : row.effectNow,
        16,
        '#47872e',
      );
      text(-232, y + 54, row.blurb, 14, UIStyle.TEXT_MUTED);
      this.shopBuyButton(150, y + 26, row.nextCost, state.coins, () => {
        EventBus.emit(GameEvents.ShopBuyUpgrade, row.id);
      }, add);
    });

    const areaY = -238 + state.rows.length * 104 + 14;
    text(-232, areaY, 'AREAS', 18, UIStyle.GOLD_TEXT, true);
    text(-232, areaY + 30, `${state.area.name}${state.area.unlocked ? '  (unlocked)' : ''}`, 20, UIStyle.TEXT, true);
    text(-232, areaY + 58, state.area.blurb, 14, UIStyle.TEXT_MUTED);
    if (!state.area.unlocked) {
      this.shopBuyButton(150, areaY + 42, state.area.cost, state.coins, () => {
        EventBus.emit(GameEvents.ShopBuyArea);
      }, add);
    }
  }

  private openMissions(): void {
    if (this.missionsPanel || this.shopPanel || this.settingsPanel) return;
    const { panel, close } = this.makePanel(500, 700, 'MISSIONS');
    close.on(Phaser.Input.Events.POINTER_DOWN, () => this.closeMissions());
    this.missionsContent = this.add.container(0, 0, []);
    panel.add(this.missionsContent);
    this.missionsPanel = panel;
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
          fontFamily: UIStyle.FONT,
          fontSize: '20px',
          fontStyle: 'bold',
          color: row.claimed ? UIStyle.TEXT_MUTED : UIStyle.TEXT,
        }),
      );
      // Progress bar with the count inside, reference style.
      const barBg = this.add.rectangle(-232, y + 34, 300, 18, 0x5b4632, 1).setOrigin(0, 0);
      const frac = row.target > 0 ? Math.min(1, row.progress / row.target) : 0;
      const barFill = this.add
        .rectangle(-231, y + 35, 298, 16, row.claimed ? 0x9c8b6d : 0x57b93c, 1)
        .setOrigin(0, 0)
        .setScale(Math.max(0.001, frac), 1);
      const barText = this.add
        .text(-82, y + 43, `${row.progress} / ${row.target}`, {
          fontFamily: UIStyle.FONT,
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      add(barBg);
      add(barFill);
      add(barText);
      add(
        this.add.text(-232, y + 60, `Reward: ${row.rewardText}`, {
          fontFamily: UIStyle.FONT,
          fontSize: '14px',
          color: UIStyle.TEXT_DIM,
        }),
      );
      const label = row.claimed ? 'DONE' : row.complete ? 'CLAIM' : `${row.progress}/${row.target}`;
      const rect = this.add.rectangle(
        150,
        y + 26,
        128,
        46,
        row.claimed ? UIStyle.BTN_DONE : row.complete ? UIStyle.BTN_GO : UIStyle.BTN_OFF,
        1,
      );
      rect.setStrokeStyle(2, row.complete && !row.claimed ? UIStyle.BTN_GO_DARK : 0x8a6a44, 1);
      const btnText = this.add
        .text(150, y + 26, label, {
          fontFamily: UIStyle.FONT,
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
    const rect = this.add.rectangle(x, y, 128, 46, maxed ? UIStyle.BTN_DONE : affordable ? UIStyle.BTN_GO : UIStyle.BTN_OFF, 1);
    rect.setStrokeStyle(2, affordable ? UIStyle.BTN_GO_DARK : 0x8a6a44, 1);
    const label = this.add
      .text(x, y, maxed ? 'MAX' : `${cost} coins`, {
        fontFamily: UIStyle.FONT,
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
    const { panel, close } = this.makePanel(460, 400, 'SETTINGS');
    close.on(Phaser.Input.Events.POINTER_DOWN, () => this.closeSettings());
    const musicLabel = this.add.text(-190, -96, 'Music', {
      fontFamily: UIStyle.FONT,
      fontSize: '20px',
      fontStyle: 'bold',
      color: UIStyle.TEXT,
    });
    const sfxLabel = this.add.text(-190, -8, 'Sound effects', {
      fontFamily: UIStyle.FONT,
      fontSize: '20px',
      fontStyle: 'bold',
      color: UIStyle.TEXT,
    });
    const note = this.add
      .text(0, 108, 'Progress and volumes save automatically.', {
        fontFamily: UIStyle.FONT,
        fontSize: '15px',
        color: UIStyle.TEXT_DIM,
        align: 'center',
      })
      .setOrigin(0.5, 0);
    panel.add([musicLabel, sfxLabel, note]);
    this.settingsPanel = panel;
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
    const track = this.add.rectangle(30, y, 300, 14, 0xd8c49a, 1);
    track.setStrokeStyle(2, 0xbf9d5f, 1);
    const fill = this.add
      .rectangle(-120, y, 300, 14, UIStyle.BTN_GO, 1)
      .setOrigin(0, 0.5)
      .setScale(Math.max(0.001, value), 1);
    fill.setName(`fill-${kind}`);
    const knob = this.add.circle(-120 + value * 300, y, 15, 0xffffff, 1);
    knob.setStrokeStyle(3, 0x8a5a2b, 0.8);
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
