import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../game/GameConstants';

/**
 * Loading gate between Boot and the menu. Phase 1 ships no external
 * art (placeholder textures are generated in BootScene), so this scene
 * mainly establishes the loading UI and error handling that real
 * asset loads will use from Phase 2 onward.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const barWidth = DESIGN_WIDTH * 0.6;
    const barX = (DESIGN_WIDTH - barWidth) / 2;
    const barY = DESIGN_HEIGHT / 2;

    const frame = this.add.rectangle(barX, barY, barWidth, 18).setOrigin(0, 0.5);
    frame.setStrokeStyle(2, 0xffffff);
    const bar = this.add.rectangle(barX + 2, barY, 1, 12, 0xffffff).setOrigin(0, 0.5);
    this.add
      .text(DESIGN_WIDTH / 2, barY - 36, 'Loading Harvest Lane', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.width = Math.max(1, (barWidth - 4) * value);
    });
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      // A missing optional asset must never hard-block the game. Log it
      // and continue; release QA checks these logs.
      console.error(`[HarvestLane] Asset failed to load: ${file.key} (${file.url})`);
    });
  }

  create(): void {
    this.scene.start('MainMenu');
  }
}
