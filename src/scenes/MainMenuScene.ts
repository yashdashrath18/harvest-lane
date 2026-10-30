import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../game/GameConstants';
import { Playables } from '../platform/YouTubePlayablesAdapter';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    // The menu is interactable: the Playables lifecycle point where
    // gameReady may be called. No-op in standalone mode.
    Playables.gameReady();
    this.add
      .tileSprite(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 'grass')
      .setOrigin(0, 0);

    this.add
      .text(DESIGN_WIDTH / 2, 300, 'HARVEST LANE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#3d6b2f',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(DESIGN_WIDTH / 2, 356, 'Farm. Harvest. Sell. Grow.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#fff8d6',
      })
      .setOrigin(0.5);

    const button = this.add
      .rectangle(DESIGN_WIDTH / 2, 470, 240, 72, 0xf2a541)
      .setStrokeStyle(4, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(DESIGN_WIDTH / 2, 470, 'TAP TO PLAY', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const startGame = (): void => {
      this.scene.start('Game');
    };
    button.on(Phaser.Input.Events.POINTER_DOWN, startGame);
    label.setInteractive({ useHandCursor: true });
    label.on(Phaser.Input.Events.POINTER_DOWN, startGame);
  }
}
