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
    this.scene.start('Preload');
  }

  private makeGrassTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0x79c25f, 1);
    g.fillRect(0, 0, 128, 128);
    // Deterministic speckles so tiling looks natural but stable.
    for (let i = 0; i < 90; i++) {
      const x = (Math.sin(i * 127.1) * 43758.5453) % 1;
      const y = (Math.sin(i * 311.7) * 12543.1234) % 1;
      const px = Math.abs(x) * 128;
      const py = Math.abs(y) * 128;
      g.fillStyle(i % 2 === 0 ? 0x6db354 : 0x86cd6c, 1);
      g.fillRect(px, py, 5, 2);
    }
    g.generateTexture('grass', 128, 128);
    g.destroy();
  }

  private makeDirtTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xd9a066, 1);
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 40; i++) {
      const px = Math.abs(Math.sin(i * 74.7) * 1000) % 120;
      const py = Math.abs(Math.sin(i * 51.3) * 1000) % 120;
      g.fillStyle(i % 2 === 0 ? 0xc98f52 : 0xe5b478, 1);
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
    // Directional walk frames for the original farmer, 48x64 each:
    // down, up and side (facing left; right is a runtime flip), two
    // frames each with a leg and arm swing. Frame 0 doubles as idle.
    const dirs = ['down', 'up', 'side'] as const;
    dirs.forEach((dir) => {
      [0, 1].forEach((frame) => {
        const g = this.add.graphics();
        this.drawFarmer(g, dir, frame);
        g.generateTexture(`player-${dir}-${frame}`, 48, 64);
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
      const frontLegX = swing ? 15 : 19;
      const backLegX = swing ? 27 : 23;
      g.fillStyle(0x4a3826, 1);
      g.fillRoundedRect(frontLegX, 56, 9, 7, 2);
      g.fillRoundedRect(backLegX, swing ? 53 : 56, 9, 7, 2);
      g.fillStyle(0x3d5a80, 1);
      g.fillRect(frontLegX + 1, 42, 8, 15);
      g.fillRect(backLegX + 1, 42, 8, swing ? 12 : 15);
      // Torso, narrower in profile
      g.fillStyle(0xc94f42, 1);
      g.fillRoundedRect(15, 26, 19, 20, 6);
      g.fillStyle(0x3d5a80, 1);
      g.fillRect(17, 32, 9, 14);
      // One visible arm, swinging
      g.fillStyle(0xc94f42, 1);
      g.fillRoundedRect(swing ? 12 : 17, 28, 7, 13, 3);
      g.fillStyle(0xf2c29b, 1);
      g.fillCircle(swing ? 15 : 20, 44, 4);
      // Head in profile: face toward the left edge, one eye
      g.fillStyle(0xf2c29b, 1);
      g.fillCircle(22, 18, 10);
      g.fillStyle(0x333333, 1);
      g.fillCircle(16, 18, 1.5);
      // Hat brim juts forward
      g.fillStyle(0xe8c766, 1);
      g.fillEllipse(20, 11, 38, 9);
      g.fillStyle(0xdcae45, 1);
      g.fillRoundedRect(12, 1, 20, 10, 4);
      g.fillStyle(0xb5502f, 1);
      g.fillRect(12, 8, 20, 3);
      return;
    }

    // Front (down) and back (up) views share the body plan.
    const leftBootY = swing ? 58 : 56;
    const rightBootY = swing ? 53 : 56;
    g.fillStyle(0x4a3826, 1);
    g.fillRoundedRect(13, leftBootY, 9, 7, 2);
    g.fillRoundedRect(26, rightBootY, 9, 7, 2);
    g.fillStyle(0x3d5a80, 1);
    g.fillRect(14, 42, 8, 15);
    g.fillRect(26, 42, 8, 15);
    g.fillStyle(0xc94f42, 1);
    g.fillRoundedRect(11, 26, 26, 20, 6);
    if (dir === 'down') {
      g.fillStyle(0x3d5a80, 1);
      g.fillRect(18, 32, 12, 14);
      g.fillRect(15, 26, 4, 8);
      g.fillRect(29, 26, 4, 8);
      g.fillStyle(0xf2c14e, 1);
      g.fillCircle(19, 34, 1.6);
      g.fillCircle(29, 34, 1.6);
    } else {
      // Back view: crossed overall straps, no bib
      g.lineStyle(3, 0x3d5a80, 1);
      g.beginPath();
      g.moveTo(15, 27);
      g.lineTo(33, 44);
      g.moveTo(33, 27);
      g.lineTo(15, 44);
      g.strokePath();
    }
    // Arms swing opposite between frames
    g.fillStyle(0xc94f42, 1);
    g.fillRoundedRect(5, swing ? 30 : 28, 7, 13, 3);
    g.fillRoundedRect(36, swing ? 28 : 30, 7, 13, 3);
    g.fillStyle(0xf2c29b, 1);
    g.fillCircle(8, swing ? 46 : 44, 4);
    g.fillCircle(40, swing ? 44 : 46, 4);
    if (dir === 'down') {
      g.fillStyle(0xf2c29b, 1);
      g.fillCircle(24, 18, 10);
      g.fillStyle(0x333333, 1);
      g.fillCircle(20, 18, 1.5);
      g.fillCircle(28, 18, 1.5);
      g.lineStyle(1.4, 0x9a5b3c, 1);
      g.beginPath();
      g.arc(24, 21, 4, 0.15 * Math.PI, 0.85 * Math.PI);
      g.strokePath();
    } else {
      // Back of the head: hair under the hat brim
      g.fillStyle(0x6b4a2b, 1);
      g.fillCircle(24, 19, 10);
      g.fillRect(14, 19, 20, 7);
    }
    g.fillStyle(0xe8c766, 1);
    g.fillEllipse(24, 11, 36, 9);
    g.fillStyle(0xdcae45, 1);
    g.fillRoundedRect(14, 1, 20, 10, 4);
    g.fillStyle(0xb5502f, 1);
    g.fillRect(14, 8, 20, 3);
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
          // Two ripe cobs with husks
          g.fillStyle(0xf2c14e, 1);
          g.fillRoundedRect(26, 18, 8, 15, 4);
          g.fillRoundedRect(10, 24, 8, 14, 4);
          g.fillStyle(0x7ec850, 1);
          g.fillTriangle(30, 33, 26, 24, 34, 26);
          g.fillTriangle(14, 38, 10, 29, 18, 31);
        }
      }
      g.generateTexture(`crop-corn-${stage}`, 44, 44);
      g.destroy();
    };
    [0, 1, 2, 3].forEach(draw);
  }

  private makeCustomerTextures(): void {
    // Original NPC customers, 48x64, three looks: different shirt
    // colours, skin tones and hair. Same proportions as the farmer so
    // the world reads consistently, but no hat and their own palette.
    const variants = [
      { shirt: 0x2e86ab, trousers: 0x5b4636, skin: 0x8d5a3b, hair: 0x222222, bun: true },
      { shirt: 0x7d5ba6, trousers: 0x3d405b, skin: 0xf2c29b, hair: 0x6b4a2b, bun: false },
      { shirt: 0xe8873a, trousers: 0x4a6741, skin: 0xc68642, hair: 0x111111, bun: false },
    ];
    variants.forEach((v, i) => {
      const g = this.add.graphics();
      g.fillStyle(0x4a3826, 1);
      g.fillRoundedRect(13, 56, 9, 7, 2);
      g.fillRoundedRect(26, 56, 9, 7, 2);
      g.fillStyle(v.trousers, 1);
      g.fillRect(14, 42, 8, 15);
      g.fillRect(26, 42, 8, 15);
      g.fillStyle(v.shirt, 1);
      g.fillRoundedRect(11, 26, 26, 20, 6);
      g.fillRoundedRect(5, 28, 7, 13, 3);
      g.fillRoundedRect(36, 28, 7, 13, 3);
      g.fillStyle(v.skin, 1);
      g.fillCircle(8, 44, 4);
      g.fillCircle(40, 44, 4);
      g.fillCircle(24, 18, 10);
      // Hair: cap over the top of the head, plus a bun on variant 0
      g.fillStyle(v.hair, 1);
      g.fillEllipse(24, 11, 21, 10);
      if (v.bun) g.fillCircle(24, 3, 5);
      g.fillStyle(0x333333, 1);
      g.fillCircle(20, 19, 1.5);
      g.fillCircle(28, 19, 1.5);
      g.generateTexture(`customer-${i}`, 48, 64);
      g.destroy();
    });
  }

  private makeBubbleTexture(): void {
    // Speech bubble for orders, 96x66, with a tail at the bottom.
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.96);
    g.fillRoundedRect(2, 2, 92, 50, 12);
    g.fillTriangle(40, 52, 56, 52, 48, 64);
    g.lineStyle(2, 0x000000, 0.12);
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
      g.fillStyle(0x8a5a3b, 1);
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
    // Horizontal segment, 64x40: two posts, two rails.
    const g = this.add.graphics();
    g.fillStyle(0xa9743f, 1);
    g.fillRect(4, 4, 8, 34);
    g.fillRect(52, 4, 8, 34);
    g.fillRect(0, 10, 64, 7);
    g.fillRect(0, 24, 64, 7);
    g.fillStyle(0x8f5e30, 1);
    g.fillRect(4, 4, 8, 4);
    g.fillRect(52, 4, 8, 4);
    g.generateTexture('fence', 64, 40);
    g.destroy();

    // Vertical segment, 40x64: same fence running down the screen.
    const v = this.add.graphics();
    v.fillStyle(0xa9743f, 1);
    v.fillRect(4, 4, 34, 8);
    v.fillRect(4, 52, 34, 8);
    v.fillRect(10, 0, 7, 64);
    v.fillRect(24, 0, 7, 64);
    v.fillStyle(0x8f5e30, 1);
    v.fillRect(4, 4, 4, 8);
    v.fillRect(4, 52, 4, 8);
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
    // Awning: scalloped stripes
    for (let i = 0; i < 8; i++) {
      g.fillStyle(i % 2 === 0 ? 0xd64541 : 0xf7f3e8, 1);
      const x = 4 + i * 28;
      g.fillRect(x, 18, 28, 34);
      g.fillCircle(x + 14, 52, 14);
    }
    g.fillStyle(0x8f3b34, 1);
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
    gem.fillStyle(0xc77dff, 1);
    gem.beginPath();
    gem.moveTo(11, 1);
    gem.lineTo(21, 8);
    gem.lineTo(11, 21);
    gem.lineTo(1, 8);
    gem.closePath();
    gem.fillPath();
    gem.fillStyle(0xe9c6ff, 1);
    gem.fillTriangle(11, 4, 17, 8, 5, 8);
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
