import Phaser from 'phaser';
import { GameConfig } from './game/GameConfig';
import { Audio } from './systems/AudioSystem';
import { Playables } from './platform/YouTubePlayablesAdapter';

window.addEventListener('load', () => {
  // The single entry point. Standalone browser mode only for now; the
  // YouTube Playables adapter will wrap this in Phase 8, and the game
  // must keep booting when that SDK is absent.
  const game = new Phaser.Game(GameConfig);
  // Playables lifecycle: the first frame is rendering (boot and menu
  // follow immediately). gameReady fires from the main menu once it
  // is interactable. No-ops outside the Playables environment.
  Playables.firstFrameReady();
  // QA hooks: let automated smoke tests inspect scene state. They
  // expose no controls a player does not already have. The release
  // build (npm run build:release) strips them out entirely; normal
  // and preview builds keep them so QA can verify what ships.
  if (import.meta.env.MODE !== 'release') {
    (window as unknown as { harvestLaneGame: Phaser.Game }).harvestLaneGame = game;
    (window as unknown as { harvestLaneAudio: typeof Audio }).harvestLaneAudio = Audio;
  }
});
