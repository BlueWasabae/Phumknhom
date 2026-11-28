import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { OverworldScene } from './scenes/OverworldScene';
import { KhmerWorldScene } from './scenes/KhmerWorldScene';
import { FarmScene } from './scenes/FarmScene';
import { ClubScene } from './scenes/ClubScene';
import { CavernExploreScene } from './scenes/CavernExploreScene';
import { HouseInteriorScene } from './scenes/HouseInteriorScene';
import { PagodaTowerScene } from './scenes/PagodaTowerScene';
import { FestivalRaceScene } from './scenes/FestivalRaceScene';
import { DungeonBossScene } from './scenes/DungeonBossScene';
import { BossRushScene } from './scenes/BossRushScene';
import { WorldBossScene } from './scenes/WorldBossScene';
import { PearlDiveScene } from './scenes/PearlDiveScene';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: Math.max(320, parent.clientWidth || window.innerWidth || 1280),
    height: Math.max(240, parent.clientHeight || window.innerHeight || 720),
    backgroundColor: '#0f172a',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    render: {
      preserveDrawingBuffer: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    input: {
      mouse: {
        preventDefaultDown: false,
        preventDefaultUp: false,
        preventDefaultMove: false,
      },
      touch: {
        capture: false,
      },
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [
      BootScene,
      OverworldScene,
      KhmerWorldScene,
      FarmScene,
      ClubScene,
      CavernExploreScene,
      HouseInteriorScene,
      PagodaTowerScene,
      FestivalRaceScene,
      DungeonBossScene,
      BossRushScene,
      WorldBossScene,
      PearlDiveScene,
    ],
  };
}

export function launchPhaserGame(parent: HTMLElement): {
  game: Phaser.Game;
  destroy: () => void;
} {
  const game = new Phaser.Game(createGameConfig(parent));

  const isFormField = (target: EventTarget | null): boolean => {
    const el = target as HTMLElement | null;
    if (!el || typeof el.tagName !== 'string') return false;
    const tag = el.tagName.toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(el.isContentEditable);
  };

  const syncKeyboardForTyping = () => {
    const typing = isFormField(document.activeElement);
    const kb = game.input?.keyboard;
    if (kb) {
      kb.enabled = !typing;
      if (typing) {
        kb.clearCaptures();
      }
    }
    // Also pause/resume scene-level keyboard plugins cleanly while typing in any HTML input
    for (const sc of game.scene?.getScenes(true) ?? []) {
      if (sc.input?.keyboard) {
        sc.input.keyboard.enabled = !typing;
        if (typing) {
          sc.input.keyboard.clearCaptures();
          sc.input.keyboard.resetKeys();
        }
      }
    }
  };

  window.addEventListener('focusin', syncKeyboardForTyping, true);
  window.addEventListener('focusout', syncKeyboardForTyping, true);

  return {
    game,
    destroy: () => {
      window.removeEventListener('focusin', syncKeyboardForTyping, true);
      window.removeEventListener('focusout', syncKeyboardForTyping, true);
      game.destroy(true);
    },
  };
}
