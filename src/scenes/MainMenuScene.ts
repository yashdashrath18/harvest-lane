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
      .text(DESIGN_WIDTH / 2, 296, 'HARVEST LANE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#3d6b2f',
        strokeThickness: 10,
      })
      .setOrigin(0.5);

    this.add
      .text(DESIGN_WIDTH / 2, 356, 'Grow it. Harvest it. Sell it.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#5b3a1e',
        backgroundColor: '#fdf3da',
        padding: { x: 14, y: 7 },
      })
      .setOrigin(0.5);

    const button = this.add
      .rectangle(DESIGN_WIDTH / 2, 470, 250, 76, 0x57b93c)
      .setStrokeStyle(4, 0x3d8a28)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(DESIGN_WIDTH / 2, 470, 'TAP TO PLAY', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#3d8a28',
        strokeThickness: 4,
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
