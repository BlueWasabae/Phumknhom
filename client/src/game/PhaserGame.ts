import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { OverworldScene } from './scenes/OverworldScene';
import { DungeonBossScene } from './scenes/DungeonBossScene';

export function createPhaserGame(parent: HTMLElement): {
  game: Phaser.Game;
  destroy: () => void;
} {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || window.innerWidth,
    height: parent.clientHeight || window.innerHeight,
    backgroundColor: '#0f172a',
    pixelArt: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, OverworldScene, DungeonBossScene],
  });

  return {
    game,
    destroy: () => {
      game.destroy(true);
    },
  };
}
