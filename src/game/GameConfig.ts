import Phaser from 'phaser';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './GameConstants';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#79c25f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  scene: [BootScene, PreloadScene, MainMenuScene, GameScene, UIScene],
};

export const WORLD_BOUNDS = { width: WORLD_WIDTH, height: WORLD_HEIGHT };
