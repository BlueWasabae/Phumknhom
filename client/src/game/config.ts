import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { OverworldScene } from './scenes/OverworldScene';
import { KhmerWorldScene } from './scenes/KhmerWorldScene';
import { FarmScene } from './scenes/FarmScene';
import { ClubScene } from './scenes/ClubScene';
import { DungeonBossScene } from './scenes/DungeonBossScene';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || window.innerWidth,
    height: parent.clientHeight || window.innerHeight,
    backgroundColor: '#0f172a',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, OverworldScene, KhmerWorldScene, FarmScene, ClubScene, DungeonBossScene],
  };
}

export function launchPhaserGame(parent: HTMLElement): {
  game: Phaser.Game;
  destroy: () => void;
} {
  const game = new Phaser.Game(createGameConfig(parent));
  return {
    game,
    destroy: () => {
      game.destroy(true);
    },
  };
}
