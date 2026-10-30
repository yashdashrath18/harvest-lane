import Phaser from 'phaser';

/**
 * BootScene generates all of the game's textures in code. Every texture
 * is original to this project: no reference game artwork is used
 * anywhere. Code-drawn art keeps the prototype dependency-free; if
 * hand-drawn asset files are commissioned later, they load through
 * PreloadScene and simply replace these keys.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.makeGrassTexture();
    this.makeDirtTexture();
    this.makeSoilTexture();
    this.makePlayerFrames();
    this.makeCropTextures();
    this.makeFenceTextures();
    this.makeBushTexture();
    this.makeTreeTexture();
    this.makeFlowerTexture();
    this.makeStoneTexture();
    this.makeStallTexture();
    this.makeSignTexture();
    this.makeJoystickTextures();
    this.makeRingTexture();
    this.makeCustomerTextures();
    this.makeBubbleTexture();
    this.makeItemIcons();
    this.makeCarrotTextures();
    this.makeAnimalTextures();
    this.makePolishTextures();
    this.makeHudTextures();
    this.scene.start('Preload');
  }

  /** HUD furniture in the reference style: farmer avatar medallion,
   * clipboard for missions, red close button, gold star, cash stack. */
  private makeHudTextures(): void {
    // Avatar: cream medallion with the farmer's face and straw hat.
    const av = this.add.graphics();
    av.fillStyle(0xfff3d6, 1);
    av.fillCircle(32, 32, 30);
    av.lineStyle(4, 0x8a5a2b, 1);
    av.strokeCircle(32, 32, 29);
    av.fillStyle(0xd65347, 1);
    av.fillRoundedRect(16, 44, 32, 16, 7);
    av.fillStyle(0xf6c795, 1);
    av.fillCircle(32, 33, 13);
    av.fillStyle(0x333333, 1);
    av.fillCircle(27, 33, 1.9);
    av.fillCircle(37, 33, 1.9);
    av.lineStyle(1.6, 0x9a5b3c, 1);
    av.beginPath();
    av.arc(32, 36, 5.5, 0.15 * Math.PI, 0.85 * Math.PI);
    av.strokePath();
    av.fillStyle(0xf0d060, 1);
    av.fillEllipse(32, 22, 42, 9);
    av.fillRoundedRect(21, 8, 22, 13, 5);
    av.fillStyle(0xb5502f, 1);
    av.fillRect(21, 17, 22, 4);
    av.generateTexture('avatar', 64, 64);
    av.destroy();

    // Level star badge.
    const star = this.add.graphics();
    star.fillStyle(0xffc93c, 1);
    star.lineStyle(2, 0xd9930d, 1);
    const pts: Phaser.Types.Math.Vector2Like[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 13 : 6;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push({ x: 14 + Math.cos(a) * r, y: 14 + Math.sin(a) * r });
    }
    star.fillPoints(pts, true);
    star.strokePoints(pts, true);
    star.generateTexture('icon-star', 28, 28);
    star.destroy();

    // Clipboard with checkmarks, the missions button.
    const cb = this.add.graphics();
    cb.fillStyle(0x8a5a2b, 1);
    cb.fillRoundedRect(4, 6, 40, 50, 6);
    cb.fillStyle(0xfff6de, 1);
    cb.fillRoundedRect(8, 12, 32, 40, 4);
    cb.fillStyle(0xc9cfd6, 1);
    cb.fillRoundedRect(16, 2, 16, 10, 4);
    cb.lineStyle(3, 0x57a639, 1);
    [22, 32, 42].forEach((y) => {
      cb.beginPath();
      cb.moveTo(13, y);
      cb.lineTo(17, y + 4);
      cb.lineTo(24, y - 4);
      cb.strokePath();
    });
    cb.generateTexture('icon-clipboard', 48, 58);
    cb.destroy();

    // Red round close button with a white cross.
    const close = this.add.graphics();
    close.fillStyle(0xe2483d, 1);
    close.fillCircle(22, 22, 20);
    close.fillStyle(0xc23327, 1);
    close.fillEllipse(22, 30, 34, 18);
    close.fillStyle(0xe2483d, 1);
    close.fillCircle(22, 19, 19);
    close.lineStyle(5, 0xffffff, 1);
    close.beginPath();
    close.moveTo(14, 14);
    close.lineTo(30, 30);
    close.moveTo(30, 14);
    close.lineTo(14, 30);
    close.strokePath();
    close.generateTexture('btn-close', 44, 44);
    close.destroy();

    // Cash stack, the coins pill icon.
    const cash = this.add.graphics();
    cash.fillStyle(0x3f9e4d, 1);
    cash.fillRoundedRect(3, 12, 26, 14, 2);
    cash.fillStyle(0x57c46a, 1);
    cash.fillRoundedRect(1, 7, 26, 14, 2);
    cash.fillStyle(0x2f7d3c, 1);
    cash.fillCircle(14, 14, 5);
    cash.fillStyle(0xa8e6b0, 1);
    cash.fillCircle(14, 14, 3);
    cash.generateTexture('icon-cash', 30, 28);
    cash.destroy();

    // Backpack with an upgrade chevron, the shop button icon.
    const bag = this.add.graphics();
    bag.fillStyle(0x9a6a35, 1);
    bag.fillRoundedRect(8, 14, 32, 30, 8);
    bag.fillStyle(0x7c5225, 1);
    bag.fillRoundedRect(8, 14, 32, 12, { tl: 8, tr: 8, bl: 0, br: 0 });
    bag.fillStyle(0xc98f52, 1);
    bag.fillRoundedRect(17, 24, 14, 12, 4);
    bag.lineStyle(2, 0x5f3d16, 1);
    bag.strokeRoundedRect(17, 24, 14, 12, 4);
    bag.fillStyle(0x8a5a2b, 1);
    bag.fillRect(12, 6, 6, 10);
    bag.fillRect(30, 6, 6, 10);
    bag.fillStyle(0x57b93c, 1);
    bag.fillTriangle(41, 26, 47, 26, 44, 19);
    bag.fillRect(42.5, 26, 3, 8);
    bag.generateTexture('icon-bag', 48, 48);
    bag.destroy();

    // Wooden gear medallion for settings.
    const med = this.add.graphics();
    med.fillStyle(0xa9743f, 1);
    med.fillCircle(26, 26, 24);
    med.lineStyle(3, 0x7c4f24, 1);
    med.strokeCircle(26, 26, 23);
    med.fillStyle(0xfff3d6, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      med.fillRect(26 + Math.cos(a) * 12 - 3, 26 + Math.sin(a) * 12 - 3, 7, 7);
    }
    med.fillCircle(26, 26, 10);
    med.fillStyle(0xa9743f, 1);
    med.fillCircle(26, 26, 4.5);
    med.generateTexture('icon-gear-med', 52, 52);
    med.destroy();
  }

  private makeGrassTexture(): void {
    // Bright, saturated lime grass in the casual-tycoon style.
    const g = this.add.graphics();
    g.fillStyle(0x95d64e, 1);
    g.fillRect(0, 0, 128, 128);
    // Deterministic speckles so tiling looks natural but stable.
    for (let i = 0; i < 90; i++) {
      const x = (Math.sin(i * 127.1) * 43758.5453) % 1;
      const y = (Math.sin(i * 311.7) * 12543.1234) % 1;
      const px = Math.abs(x) * 128;
      const py = Math.abs(y) * 128;
      g.fillStyle(i % 2 === 0 ? 0x84c93f : 0xa8e063, 1);
      g.fillRect(px, py, 5, 2);
    }
    // A few darker blade tufts for texture.
    for (let i = 0; i < 14; i++) {
      const px = Math.abs(Math.sin(i * 57.3) * 1000) % 124;
      const py = Math.abs(Math.sin(i * 83.9) * 1000) % 124;
      g.lineStyle(2, 0x74bb35, 1);
      g.beginPath();
      g.moveTo(px, py + 5);
      g.lineTo(px + 1, py);
      g.moveTo(px + 4, py + 5);
      g.lineTo(px + 5, py + 1);
      g.strokePath();
    }
    g.generateTexture('grass', 128, 128);
    g.destroy();
  }

  private makeDirtTexture(): void {
    // Sandy path, lighter and warmer than the grass around it.
    const g = this.add.graphics();
    g.fillStyle(0xecc987, 1);
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 40; i++) {
      const px = Math.abs(Math.sin(i * 74.7) * 1000) % 120;
      const py = Math.abs(Math.sin(i * 51.3) * 1000) % 120;
      g.fillStyle(i % 2 === 0 ? 0xdfb671 : 0xf5dca6, 1);
      g.fillEllipse(px, py, 10, 6);
    }
    g.generateTexture('dirt', 128, 128);
    g.destroy();
  }

  private makeSoilTexture(): void {
    // Tilled field soil: warm brown with ploughed rows.
    const g = this.add.graphics();
    g.fillStyle(0x9a6a42, 1);
    g.fillRect(0, 0, 128, 128);
    for (let row = 0; row < 4; row++) {
      const y = row * 32;
      g.fillStyle(0x7d5433, 1);
      g.fillRect(0, y + 22, 128, 8);
      g.fillStyle(0xb08256, 1);
      g.fillRect(0, y + 2, 128, 7);
    }
    for (let i = 0; i < 26; i++) {
      const px = Math.abs(Math.sin(i * 91.3) * 1000) % 122;
      const py = Math.abs(Math.sin(i * 47.9) * 1000) % 122;
      g.fillStyle(0x86603c, 1);
      g.fillEllipse(px, py, 7, 4);
    }
    g.generateTexture('soil', 128, 128);
    g.destroy();
  }

  private makePlayerFrames(): void {
    // Directional walk frames for the original farmer, 56x76 each:
    // bigger and rounder than the first pass, with shaded clothing
    // and a wide straw hat, in the casual-tycoon proportion style.
    // Down, up and side (facing left; right is a runtime flip), two
    // frames each with a leg and arm swing. Frame 0 doubles as idle.
    const dirs = ['down', 'up', 'side'] as const;
    dirs.forEach((dir) => {
      [0, 1].forEach((frame) => {
        const g = this.add.graphics();
        this.drawFarmer(g, dir, frame);
        g.generateTexture(`player-${dir}-${frame}`, 56, 76);
        g.destroy();
      });
    });
  }

  private drawFarmer(
    g: Phaser.GameObjects.Graphics,
    dir: 'down' | 'up' | 'side',
    frame: number,
  ): void {
    const swing = frame === 0 ? 0 : 1;
    if (dir === 'side') {
      // Profile view facing left. Legs scissor between frames.
      const frontLegX = swing ? 18 : 23;
      const backLegX = swing ? 32 : 28;
      g.fillStyle(0x5a4030, 1);
      g.fillRoundedRect(frontLegX, 68, 11, 8, 3);
      g.fillRoundedRect(backLegX, swing ? 65 : 68, 11, 8, 3);
      g.fillStyle(0x46689c, 1);
      g.fillRect(frontLegX + 1, 50, 10, 19);
      g.fillRect(backLegX + 1, 50, 10, swing ? 16 : 19);
      // Torso, narrower in profile, with a shaded back half
      g.fillStyle(0xc94f42, 1);
      g.fillRoundedRect(18, 32, 23, 24, 8);
      g.fillStyle(0xa83e33, 1);
      g.fillRoundedRect(32, 32, 9, 24, { tl: 0, tr: 8, bl: 0, br: 8 });
      g.fillStyle(0x46689c, 1);
      g.fillRect(21, 39, 11, 17);
      // One visible arm, swinging
      g.fillStyle(0xc94f42, 1);
      g.fillRoundedRect(swing ? 14 : 20, 34, 9, 16, 4);
      g.fillStyle(0xf6c795, 1);
      g.fillCircle(swing ? 18 : 24, 53, 5);
      // Head in profile: face toward the left edge, one eye
      g.fillStyle(0xf6c795, 1);
      g.fillCircle(27, 22, 12);
      g.fillStyle(0x333333, 1);
      g.fillCircle(20, 22, 1.8);
      g.fillStyle(0xf0a868, 0.7);
      g.fillCircle(19, 27, 3.4);
      // Hat brim juts forward
      g.fillStyle(0xf0d060, 1);
      g.fillEllipse(25, 13, 46, 10);
      g.fillStyle(0xe3ba45, 1);
      g.fillRoundedRect(15, 1, 24, 12, 5);
      g.fillStyle(0xb5502f, 1);
      g.fillRect(15, 9, 24, 4);
      return;
    }

    // Front (down) and back (up) views share the body plan.
    const leftBootY = swing ? 69 : 67;
    const rightBootY = swing ? 64 : 67;
    g.fillStyle(0x5a4030, 1);
    g.fillRoundedRect(15, leftBootY, 11, 8, 3);
    g.fillRoundedRect(31, rightBootY, 11, 8, 3);
    g.fillStyle(0x46689c, 1);
    g.fillRect(16, 50, 10, 18);
    g.fillRect(31, 50, 10, 18);
    g.fillStyle(0x3a5884, 1);
    g.fillRect(21, 50, 5, 18);
    g.fillRect(36, 50, 5, 18);
    // Rounded torso with a shaded right side
    g.fillStyle(0xd65347, 1);
    g.fillRoundedRect(13, 32, 31, 24, 9);
    g.fillStyle(0xb8453b, 1);
    g.fillRoundedRect(35, 32, 9, 24, { tl: 0, tr: 9, bl: 0, br: 9 });
    if (dir === 'down') {
      g.fillStyle(0x46689c, 1);
      g.fillRect(21, 39, 15, 17);
      g.fillRect(17, 32, 5, 10);
      g.fillRect(35, 32, 5, 10);
      g.fillStyle(0xf2c14e, 1);
      g.fillCircle(22, 41, 2);
      g.fillCircle(35, 41, 2);
    } else {
      // Back view: crossed overall straps, no bib
      g.lineStyle(4, 0x46689c, 1);
      g.beginPath();
      g.moveTo(17, 33);
      g.lineTo(40, 54);
      g.moveTo(40, 33);
      g.lineTo(17, 54);
      g.strokePath();
    }
    // Arms swing opposite between frames
    g.fillStyle(0xd65347, 1);
    g.fillRoundedRect(6, swing ? 37 : 34, 9, 16, 4);
    g.fillRoundedRect(42, swing ? 34 : 37, 9, 16, 4);
    g.fillStyle(0xf6c795, 1);
    g.fillCircle(10, swing ? 55 : 52, 5);
    g.fillCircle(46, swing ? 52 : 55, 5);
    if (dir === 'down') {
      g.fillStyle(0xf6c795, 1);
      g.fillCircle(28, 22, 12);
      g.fillStyle(0x333333, 1);
      g.fillCircle(23, 22, 1.8);
      g.fillCircle(33, 22, 1.8);
      g.fillStyle(0xf0a868, 0.7);
      g.fillCircle(19, 27, 3.6);
      g.fillCircle(37, 27, 3.6);
      g.lineStyle(1.6, 0x9a5b3c, 1);
      g.beginPath();
      g.arc(28, 25, 5, 0.15 * Math.PI, 0.85 * Math.PI);
      g.strokePath();
    } else {
      // Back of the head: hair under the hat brim
      g.fillStyle(0x6b4a2b, 1);
      g.fillCircle(28, 23, 12);
      g.fillRect(16, 23, 24, 8);
    }
    g.fillStyle(0xf0d060, 1);
    g.fillEllipse(28, 13, 44, 10);
    g.fillStyle(0xe3ba45, 1);
    g.fillRoundedRect(16, 1, 24, 12, 5);
    g.fillStyle(0xb5502f, 1);
    g.fillRect(16, 9, 24, 4);
  }

  private makeCropTextures(): void {
    // Corn growth stages, 44x44, drawn growing from the bottom centre:
    // sprout, young plant, tall stalk, mature with cobs.
    const draw = (stage: number) => {
      const g = this.add.graphics();
      g.lineStyle(3, 0x3f8438, 1);
      if (stage === 0) {
        g.beginPath();
        g.moveTo(22, 42);
        g.lineTo(22, 34);
        g.strokePath();
        g.fillStyle(0x5fae54, 1);
        g.fillEllipse(17, 32, 10, 5);
        g.fillEllipse(27, 30, 10, 5);
      } else if (stage === 1) {
        g.beginPath();
        g.moveTo(22, 42);
        g.lineTo(22, 22);
        g.strokePath();
        g.fillStyle(0x5fae54, 1);
        g.fillEllipse(14, 26, 14, 6);
        g.fillEllipse(30, 22, 14, 6);
        g.fillEllipse(22, 15, 12, 6);
      } else {
        g.lineStyle(4, 0x3f8438, 1);
        g.beginPath();
        g.moveTo(22, 42);
        g.lineTo(22, 6);
        g.strokePath();
        g.fillStyle(0x4e9a45, 1);
        g.fillEllipse(12, 30, 16, 7);
        g.fillEllipse(32, 26, 16, 7);
        g.fillEllipse(13, 16, 15, 6);
        g.fillEllipse(31, 11, 15, 6);
        if (stage === 3) {
          // Three fat ripe cobs with kernel dots and green husks
          const cob = (x: number, y: number) => {
            g.fillStyle(0xf7b733, 1);
            g.fillRoundedRect(x, y, 10, 17, 5);
            g.fillStyle(0xffd94d, 1);
            g.fillCircle(x + 3, y + 5, 1.6);
            g.fillCircle(x + 7, y + 8, 1.6);
            g.fillCircle(x + 4, y + 12, 1.6);
            g.fillStyle(0x7ec850, 1);
            g.fillTriangle(x + 5, y + 18, x, y + 8, x + 10, y + 10);
          };
          cob(27, 14);
          cob(7, 20);
          cob(18, 24);
        }
      }
      g.generateTexture(`crop-corn-${stage}`, 44, 44);
      g.destroy();
    };
    [0, 1, 2, 3].forEach(draw);
  }

  private makeCustomerTextures(): void {
    // Original NPC customers, 56x76, three looks in the same rounder
    // proportions as the farmer: an orange sun hat with overalls, a
    // wide purple hat (the queue silhouette in every farm game), and
    // a teal cap. Their own palettes and faces, drawn in code.
    const variants = [
      { shirt: 0x3f7fbf, shade: 0x33669e, trousers: 0x46689c, skin: 0x8d5a3b, hat: 0xf29c38, hatShade: 0xd9822a, hair: 0x222222 },
      { shirt: 0xe8873a, shade: 0xc96f27, trousers: 0x5b4636, skin: 0xf6c795, hat: 0x9b7ed9, hatShade: 0x8266bd, hair: 0x6b4a2b },
      { shirt: 0x57a639, shade: 0x47872e, trousers: 0x3d405b, skin: 0xc68642, hat: 0x2e9e8f, hatShade: 0x248277, hair: 0x111111 },
    ];
    variants.forEach((v, i) => {
      const g = this.add.graphics();
      g.fillStyle(0x5a4030, 1);
      g.fillRoundedRect(15, 67, 11, 8, 3);
      g.fillRoundedRect(31, 67, 11, 8, 3);
      g.fillStyle(v.trousers, 1);
      g.fillRect(16, 50, 10, 18);
      g.fillRect(31, 50, 10, 18);
      // Rounded torso with a shaded right side
      g.fillStyle(v.shirt, 1);
      g.fillRoundedRect(13, 32, 31, 24, 9);
      g.fillStyle(v.shade, 1);
      g.fillRoundedRect(35, 32, 9, 24, { tl: 0, tr: 9, bl: 0, br: 9 });
      g.fillStyle(v.shirt, 1);
      g.fillRoundedRect(6, 34, 9, 16, 4);
      g.fillRoundedRect(42, 34, 9, 16, 4);
      g.fillStyle(v.skin, 1);
      g.fillCircle(10, 52, 5);
      g.fillCircle(46, 52, 5);
      g.fillCircle(28, 22, 12);
      // Hair peeking under the hat
      g.fillStyle(v.hair, 1);
      g.fillEllipse(28, 13, 22, 9);
      g.fillStyle(0x333333, 1);
      g.fillCircle(23, 22, 1.8);
      g.fillCircle(33, 22, 1.8);
      g.lineStyle(1.6, 0x9a5b3c, 1);
      g.beginPath();
      g.arc(28, 25, 5, 0.15 * Math.PI, 0.85 * Math.PI);
      g.strokePath();
      // Hat: wide brim and a rounded crown, shaded underneath
      g.fillStyle(v.hatShade, 1);
      g.fillEllipse(28, 14, 46, 11);
      g.fillStyle(v.hat, 1);
      g.fillEllipse(28, 12, 46, 10);
      g.fillRoundedRect(17, 1, 22, 11, 5);
      g.generateTexture(`customer-${i}`, 56, 76);
      g.destroy();
    });
  }

  private makeBubbleTexture(): void {
    // Speech bubble for orders, 96x66, cream with a warm brown
    // outline and a tail at the bottom.
    const g = this.add.graphics();
    g.fillStyle(0xfff6de, 0.98);
    g.fillRoundedRect(2, 2, 92, 50, 12);
    g.fillTriangle(40, 52, 56, 52, 48, 64);
    g.lineStyle(3, 0x8a5a2b, 0.9);
    g.strokeRoundedRect(2, 2, 92, 50, 12);
    g.generateTexture('bubble', 96, 66);
    g.destroy();
  }

  private makeItemIcons(): void {
    // Item icons, 26x26, used in order bubbles and labels.
    const corn = this.add.graphics();
    corn.fillStyle(0xf2c14e, 1);
    corn.fillRoundedRect(8, 3, 10, 18, 5);
    corn.fillStyle(0x7ec850, 1);
    corn.fillTriangle(13, 24, 6, 12, 11, 15);
    corn.fillTriangle(13, 24, 20, 12, 15, 15);
    corn.generateTexture('icon-corn', 26, 26);
    corn.destroy();

    const egg = this.add.graphics();
    egg.fillStyle(0xffffff, 1);
    egg.fillEllipse(13, 14, 16, 20);
    egg.lineStyle(2, 0xd8cfc0, 1);
    egg.strokeEllipse(13, 14, 16, 20);
    egg.generateTexture('icon-egg', 26, 26);
    egg.destroy();

    const milk = this.add.graphics();
    milk.fillStyle(0x9aa0a6, 1);
    milk.fillRoundedRect(6, 8, 14, 15, 2);
    milk.fillStyle(0xffffff, 1);
    milk.fillRect(6, 8, 14, 5);
    milk.fillStyle(0x6f7377, 1);
    milk.fillRect(9, 3, 8, 5);
    milk.generateTexture('icon-milk', 26, 26);
    milk.destroy();

    const carrot = this.add.graphics();
    carrot.fillStyle(0xe8873a, 1);
    carrot.fillTriangle(13, 25, 7, 9, 19, 9);
    carrot.fillStyle(0x4e9a45, 1);
    carrot.fillEllipse(10, 6, 7, 5);
    carrot.fillEllipse(16, 5, 7, 5);
    carrot.generateTexture('icon-carrot', 26, 26);
    carrot.destroy();
  }

  private makeCarrotTextures(): void {
    // Carrot growth stages, 44x44: sprout, leafy tuft, tall leaves,
    // and the ripe stage with orange shoulders at the soil line.
    const draw = (stage: number) => {
      const g = this.add.graphics();
      g.fillStyle(0x4e9a45, 1);
      if (stage === 0) {
        g.fillEllipse(18, 34, 8, 4);
        g.fillEllipse(26, 32, 8, 4);
      } else if (stage === 1) {
        g.fillEllipse(15, 30, 12, 6);
        g.fillEllipse(24, 26, 12, 6);
        g.fillEllipse(29, 31, 10, 5);
      } else {
        g.fillEllipse(13, 24, 15, 7);
        g.fillEllipse(23, 18, 14, 7);
        g.fillEllipse(31, 25, 13, 6);
        g.fillEllipse(22, 28, 12, 6);
        if (stage === 3) {
          g.fillStyle(0xe8873a, 1);
          g.fillEllipse(17, 39, 9, 6);
          g.fillEllipse(27, 39, 9, 6);
        }
      }
      g.generateTexture(`crop-carrot-${stage}`, 44, 44);
      g.destroy();
    };
    [0, 1, 2, 3].forEach(draw);
  }

  private makeAnimalTextures(): void {
    // Chicken, 38x38, two frames: upright and pecking.
    [0, 1].forEach((frame) => {
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.15);
      g.fillEllipse(19, 34, 26, 6);
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(18, 24, 26, 20); // body
      g.fillStyle(0xe9e2d2, 1);
      g.fillEllipse(19, 29, 22, 12); // shaded underside
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(4, 18, 10, 26, 2, 28); // tail
      const headY = frame === 0 ? 12 : 22;
      const headX = frame === 0 ? 29 : 31;
      g.fillCircle(headX, headY, 8); // head
      g.fillStyle(0xe2574c, 1);
      g.fillCircle(headX - 2, headY - 8, 3); // comb
      g.fillCircle(headX + 2, headY - 9, 3);
      g.fillStyle(0xf2a541, 1);
      g.fillTriangle(headX + 7, headY, headX + 13, headY + 2, headX + 7, headY + 4); // beak
      g.fillStyle(0x333333, 1);
      g.fillCircle(headX + 3, headY - 1, 1.4);
      g.lineStyle(2, 0xf2a541, 1);
      g.beginPath();
      g.moveTo(15, 33);
      g.lineTo(15, 36);
      g.moveTo(22, 33);
      g.lineTo(22, 36);
      g.strokePath();
      g.generateTexture(`chicken-${frame}`, 38, 38);
      g.destroy();
    });

    // Cow, 70x52, two frames: head up and grazing.
    [0, 1].forEach((frame) => {
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.16);
      g.fillEllipse(35, 47, 56, 9);
      g.fillStyle(0x8a5a3b, 1);
      g.fillRect(16, 36, 6, 11);
      g.fillRect(48, 36, 6, 11);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(10, 12, 50, 28, 10); // body
      g.fillStyle(0xe8e2d6, 1);
      g.fillRoundedRect(10, 30, 50, 10, { tl: 0, tr: 0, bl: 10, br: 10 }); // shaded belly
      g.fillStyle(0x3a3a3a, 1);
      g.fillEllipse(26, 22, 18, 12); // patches
      g.fillEllipse(48, 32, 14, 10);
      const headY = frame === 0 ? 16 : 32;
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(52, headY - 8, 17, 16, 6); // head
      g.fillStyle(0xf2b8c6, 1);
      g.fillRoundedRect(63, headY + 1, 7, 8, 3); // muzzle
      g.fillStyle(0xd9c9a3, 1);
      g.fillTriangle(54, headY - 8, 58, headY - 13, 60, headY - 7); // horn
      g.fillStyle(0x333333, 1);
      g.fillCircle(59, headY - 1, 1.6);
      g.generateTexture(`cow-${frame}`, 70, 52);
      g.destroy();
    });

    // Egg pickup, 20x16.
    const egg = this.add.graphics();
    egg.fillStyle(0x000000, 0.12);
    egg.fillEllipse(10, 14, 16, 4);
    egg.fillStyle(0xffffff, 1);
    egg.fillEllipse(10, 8, 13, 15);
    egg.lineStyle(1.5, 0xd8cfc0, 1);
    egg.strokeEllipse(10, 8, 13, 15);
    egg.generateTexture('egg', 20, 16);
    egg.destroy();

    // Milk can pickup, 24x26.
    const can = this.add.graphics();
    can.fillStyle(0x000000, 0.14);
    can.fillEllipse(12, 23, 18, 5);
    can.fillStyle(0x9aa0a6, 1);
    can.fillRoundedRect(4, 7, 16, 16, 3);
    can.fillStyle(0xffffff, 1);
    can.fillRect(4, 7, 16, 5);
    can.fillStyle(0x6f7377, 1);
    can.fillRect(8, 2, 8, 5);
    can.generateTexture('milk-can', 24, 26);
    can.destroy();
  }

  private makeRingTexture(): void {
    const g = this.add.graphics();
    g.lineStyle(4, 0xffe066, 0.95);
    g.strokeCircle(27, 27, 24);
    g.generateTexture('highlight-ring', 54, 54);
    g.destroy();
  }

  private makeFenceTextures(): void {
    // Horizontal segment, 64x40: chunky posts with caps, thick rails.
    const g = this.add.graphics();
    g.fillStyle(0xb5793a, 1);
    g.fillRect(3, 6, 10, 34);
    g.fillRect(51, 6, 10, 34);
    g.fillRect(0, 11, 64, 9);
    g.fillRect(0, 26, 64, 9);
    g.fillStyle(0xd09a55, 1);
    g.fillRect(0, 11, 64, 3);
    g.fillRect(0, 26, 64, 3);
    g.fillStyle(0x8f5e30, 1);
    g.fillRect(3, 36, 10, 4);
    g.fillRect(51, 36, 10, 4);
    g.fillStyle(0xd09a55, 1);
    g.fillRect(1, 2, 14, 6);
    g.fillRect(49, 2, 14, 6);
    g.generateTexture('fence', 64, 40);
    g.destroy();

    // Vertical segment, 40x64: same fence running down the screen.
    const v = this.add.graphics();
    v.fillStyle(0xb5793a, 1);
    v.fillRect(6, 3, 34, 10);
    v.fillRect(6, 51, 34, 10);
    v.fillRect(11, 0, 9, 64);
    v.fillRect(26, 0, 9, 64);
    v.fillStyle(0xd09a55, 1);
    v.fillRect(11, 0, 3, 64);
    v.fillRect(26, 0, 3, 64);
    v.fillStyle(0xd09a55, 1);
    v.fillRect(2, 1, 6, 14);
    v.fillRect(2, 49, 6, 14);
    v.generateTexture('fence-v', 40, 64);
    v.destroy();
  }

  private makeBushTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.16);
    g.fillEllipse(32, 40, 52, 10);
    g.fillStyle(0x4e9a45, 1);
    g.fillCircle(16, 26, 13);
    g.fillCircle(32, 18, 16);
    g.fillCircle(46, 27, 12);
    g.fillStyle(0x5fae54, 1);
    g.fillCircle(26, 20, 9);
    g.fillCircle(40, 24, 8);
    g.generateTexture('bush', 64, 44);
    g.destroy();
  }

  private makeTreeTexture(): void {
    // Fruit tree, 88x116: ground shadow, trunk, layered foliage,
    // a few ripe fruit dots. Trunk base is the collision point.
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(44, 108, 62, 13);
    g.fillStyle(0x7a4f2a, 1);
    g.fillRoundedRect(37, 74, 14, 34, 5);
    g.fillStyle(0x65401f, 1);
    g.fillRect(37, 74, 5, 34);
    g.fillStyle(0x3f8438, 1);
    g.fillCircle(24, 52, 22);
    g.fillCircle(64, 52, 22);
    g.fillCircle(44, 30, 27);
    g.fillCircle(44, 58, 24);
    g.fillStyle(0x4e9a45, 1);
    g.fillCircle(32, 40, 14);
    g.fillCircle(56, 34, 13);
    g.fillCircle(48, 56, 12);
    g.fillStyle(0xe2574c, 1);
    g.fillCircle(28, 58, 4);
    g.fillCircle(58, 48, 4);
    g.fillCircle(44, 26, 4);
    g.fillCircle(66, 64, 4);
    g.fillCircle(22, 38, 4);
    g.generateTexture('tree', 88, 116);
    g.destroy();
  }

  private makeFlowerTexture(): void {
    // Small flower tuft, 28x28.
    const g = this.add.graphics();
    g.lineStyle(2, 0x3f8438, 1);
    g.beginPath();
    g.moveTo(14, 27);
    g.lineTo(14, 14);
    g.strokePath();
    g.fillStyle(0x3f8438, 1);
    g.fillEllipse(9, 21, 8, 4);
    const petals = [0xf27ba7, 0xffffff, 0xf2c14e];
    const centers = [
      [14, 9],
      [6, 15],
      [22, 15],
    ];
    centers.forEach(([x, y], i) => {
      g.fillStyle(petals[i], 1);
      g.fillCircle(x, y, 4.4);
      g.fillStyle(0xf6a821, 1);
      g.fillCircle(x, y, 1.7);
    });
    g.generateTexture('flower', 28, 28);
    g.destroy();
  }

  private makeStoneTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.14);
    g.fillEllipse(17, 20, 28, 7);
    g.fillStyle(0x9aa0a6, 1);
    g.fillEllipse(16, 13, 26, 16);
    g.fillStyle(0xb7bcc1, 1);
    g.fillEllipse(12, 10, 13, 8);
    g.generateTexture('stone', 34, 24);
    g.destroy();
  }

  private makeStallTexture(): void {
    // Market stall, 232x180: striped awning on posts, wooden counter,
    // crates of produce on top. Front base is the collision line.
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(116, 168, 210, 18);
    // Posts
    g.fillStyle(0x7a4f2a, 1);
    g.fillRect(14, 62, 10, 100);
    g.fillRect(208, 62, 10, 100);
    // Counter body with plank lines
    g.fillStyle(0xa9743f, 1);
    g.fillRoundedRect(8, 118, 216, 46, 5);
    g.fillStyle(0x8f5e30, 1);
    g.fillRect(8, 132, 216, 3);
    g.fillRect(8, 148, 216, 3);
    // Counter top
    g.fillStyle(0xc98f52, 1);
    g.fillRoundedRect(2, 106, 228, 14, 5);
    // Crates with produce
    const crates: Array<[number, number]> = [
      [36, 78],
      [96, 78],
      [156, 78],
    ];
    crates.forEach(([x, y], ci) => {
      g.fillStyle(0x8a5a2e, 1);
      g.fillRoundedRect(x, y, 44, 30, 3);
      g.fillStyle(0x6f4522, 1);
      g.fillRect(x, y + 12, 44, 3);
      const fruit = ci === 0 ? 0xe8873a : ci === 1 ? 0xe2574c : 0x7ec850;
      g.fillStyle(fruit, 1);
      g.fillCircle(x + 10, y + 2, 6);
      g.fillCircle(x + 22, y - 1, 6);
      g.fillCircle(x + 34, y + 2, 6);
    });
    // Awning: blue and white scalloped stripes, market style
    for (let i = 0; i < 8; i++) {
      g.fillStyle(i % 2 === 0 ? 0x5ea9dd : 0xf7f3e8, 1);
      const x = 4 + i * 28;
      g.fillRect(x, 18, 28, 34);
      g.fillCircle(x + 14, 52, 14);
    }
    g.fillStyle(0x3f7fbf, 1);
    g.fillRect(0, 12, 232, 8);
    g.generateTexture('stall', 232, 180);
    g.destroy();
  }

  private makeSignTexture(): void {
    // Wooden entrance sign board, 250x104. The lettering is a scene
    // Text object so it stays crisp at any scale.
    const g = this.add.graphics();
    g.fillStyle(0x7a4f2a, 1);
    g.fillRect(28, 44, 12, 58);
    g.fillRect(210, 44, 12, 58);
    g.fillStyle(0xa9743f, 1);
    g.fillRoundedRect(4, 6, 242, 52, 10);
    g.lineStyle(3, 0x8f5e30, 1);
    g.strokeRoundedRect(10, 12, 230, 40, 8);
    g.generateTexture('sign-board', 250, 104);
    g.destroy();
  }

  private makeJoystickTextures(): void {
    const base = this.add.graphics();
    base.fillStyle(0xffffff, 0.14);
    base.fillCircle(60, 60, 56);
    base.lineStyle(3, 0xffffff, 0.45);
    base.strokeCircle(60, 60, 56);
    base.generateTexture('joy-base', 120, 120);
    base.destroy();

    const knob = this.add.graphics();
    knob.fillStyle(0xffffff, 0.85);
    knob.fillCircle(28, 28, 26);
    knob.lineStyle(3, 0x000000, 0.18);
    knob.strokeCircle(28, 28, 26);
    knob.generateTexture('joy-knob', 56, 56);
    knob.destroy();
  }

  /** Coins, sparkle dots, reaction emotes and the settings gear. */
  private makePolishTextures(): void {
    const coin = this.add.graphics();
    coin.fillStyle(0xf5c542, 1);
    coin.fillCircle(11, 11, 10);
    coin.lineStyle(2, 0xb8860b, 1);
    coin.strokeCircle(11, 11, 9);
    coin.fillStyle(0xffe082, 1);
    coin.fillCircle(11, 11, 5);
    coin.generateTexture('coin', 22, 22);
    coin.destroy();

    const gem = this.add.graphics();
    gem.fillStyle(0x2fa8f0, 1);
    gem.beginPath();
    gem.moveTo(11, 1);
    gem.lineTo(21, 8);
    gem.lineTo(11, 21);
    gem.lineTo(1, 8);
    gem.closePath();
    gem.fillPath();
    gem.fillStyle(0x9fdcff, 1);
    gem.fillTriangle(11, 4, 17, 8, 5, 8);
    gem.fillStyle(0x1d7fc4, 1);
    gem.fillTriangle(11, 21, 17, 8, 5, 8);
    gem.generateTexture('icon-gem', 22, 22);
    gem.destroy();

    const dot = (key: string, color: number) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillCircle(5, 5, 5);
      g.generateTexture(key, 10, 10);
      g.destroy();
    };
    dot('dot-green', 0x8be36b);
    dot('dot-yellow', 0xffe082);
    dot('dot-gold', 0xf5c542);
    dot('dot-purple', 0xc77dff);

    const emote = (key: string, happy: boolean) => {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(17, 17, 16);
      g.lineStyle(2, 0xcccccc, 1);
      g.strokeCircle(17, 17, 15);
      g.fillStyle(happy ? 0xffc93c : 0x9db2c8, 1);
      g.fillCircle(17, 18, 11);
      g.fillStyle(0x333333, 1);
      g.fillCircle(13, 15, 1.8);
      g.fillCircle(21, 15, 1.8);
      g.lineStyle(2, 0x333333, 1);
      g.beginPath();
      if (happy) g.arc(17, 19, 6, 0.15 * Math.PI, 0.85 * Math.PI, false);
      else g.arc(17, 26, 6, 1.15 * Math.PI, 1.85 * Math.PI, false);
      g.strokePath();
      g.generateTexture(key, 34, 34);
      g.destroy();
    };
    emote('emote-happy', true);
    emote('emote-sad', false);

    const gear = this.add.graphics();
    gear.fillStyle(0xffffff, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      gear.fillRect(17 + Math.cos(a) * 13 - 3, 17 + Math.sin(a) * 13 - 3, 7, 7);
    }
    gear.fillCircle(17, 17, 11);
    gear.fillStyle(0x2b2135, 1);
    gear.fillCircle(17, 17, 5);
    gear.generateTexture('icon-gear', 34, 34);
    gear.destroy();
  }
}
