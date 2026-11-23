import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE } from '@shared/types';

const NA = '/assets/packs/ninja-adventure/Ninja Adventure - Asset Pack';
const SV = '/assets/packs/serene-village/SERENE_VILLAGE_REVAMPED';
const LF = '/assets/packs/legacy-fantasy/Legacy-Fantasy - High Forest 2.3';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Loading bar
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width / 2, height / 2, 260, 14, 0x1e293b).setStrokeStyle(2, 0xf59e0b);
    const barFill = this.add.rectangle(width / 2 - 126, height / 2, 0, 8, 0xfacc15).setOrigin(0, 0.5);
    const label = this.add
      .text(width / 2, height / 2 - 24, 'Loading ភូមិខ្ញុំ Pixel Art Packs...', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '14px',
        color: '#fef3c7',
      })
      .setOrigin(0.5);

    this.load.on('progress', (p: number) => {
      barFill.width = 252 * p;
    });
    this.load.once('complete', () => {
      barBg.destroy();
      barFill.destroy();
      label.destroy();
    });

    // ---- 1. NINJA ADVENTURE PACK (Chibi Character, Slime, Slash VFX, Audio) ----
    this.load.spritesheet('player_boy', `${NA}/Actor/Character/Boy/SpriteSheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('slime_monster', `${NA}/Actor/Monster/Slime/Slime.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('fx_slash', `${NA}/FX/Attack/SlashCurved/SpriteSheet.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image('icon_noodle', `${NA}/Items/Food/Noodle.png`);
    this.load.image('icon_sword', `${NA}/Items/Weapons/BigSword/Sprite.png`);
    this.load.audio('sfx_levelup', `${NA}/Audio/Jingles/LevelUp1.wav`);

    // ---- 2. SERENE VILLAGE PACK (Stardew Grass/Paths, Houses, Trees, Campfire) ----
    this.load.image('serene_atlas', `${SV}/Serene_Village_32x32.png`);
    this.load.spritesheet('sv_campfire', `${SV}/Animated stuff/campfire_32x32.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });

    // ---- 3. LEGACY FANTASY PACK (Parallax Cave/Forest, Platforms, Cave Entrance, Rocks) ----
    this.load.image('lf_sky', `${LF}/Background/Background.png`);
    this.load.image('lf_trees_bg', `${LF}/Trees/Background.png`);
    this.load.image('lf_tiles', `${LF}/Assets/Tiles.png`);
    this.load.image('lf_buildings', `${LF}/Assets/Buildings.png`);
    this.load.image('lf_rocks', `${LF}/Assets/Props-Rocks.png`);
  }

  create(): void {
    this.sliceAtlasSubTextures();
    this.generateUiMarkers();
    this.registerAnimations();

    this.scene.start('OverworldScene', {
      playerState: { ...INITIAL_PLAYER_STATE, weapon: { ...INITIAL_PLAYER_STATE.weapon } },
    });
  }

  /**
   * Slices clean sub-textures out of the loaded Serene Village & Legacy Fantasy sheets
   * so Phaser tileSprites & Y-sorted prop images render crisp pixel art without bleeding.
   */
  private cropToTexture(srcKey: string, dstKey: string, sx: number, sy: number, sw: number, sh: number): void {
    if (this.textures.exists(dstKey) || !this.textures.exists(srcKey)) return;
    const srcImg = this.textures.get(srcKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const canvasTex = this.textures.createCanvas(dstKey, sw, sh);
    if (!canvasTex) return;
    const ctx = canvasTex.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(srcImg, sx, sy, sw, sh, 0, 0, sw, sh);
    canvasTex.refresh();
  }

  private sliceAtlasSubTextures(): void {
    // Serene Village 32x32 grid (608x1440)
    this.cropToTexture('serene_atlas', 'sv_grass', 96, 0, 32, 32);
    this.cropToTexture('serene_atlas', 'sv_path', 192, 32, 32, 32);
    this.cropToTexture('serene_atlas', 'sv_plaza_sand', 512, 128, 64, 64);
    this.cropToTexture('serene_atlas', 'sv_flowers', 0, 96, 96, 96);
    this.cropToTexture('serene_atlas', 'sv_sign_wood', 224, 416, 32, 32);
    this.cropToTexture('serene_atlas', 'sv_fence_pen', 128, 480, 96, 96);
    this.cropToTexture('serene_atlas', 'sv_flower_box', 128, 576, 96, 32);
    this.cropToTexture('serene_atlas', 'sv_tree_green', 288, 384, 64, 96);
    this.cropToTexture('serene_atlas', 'sv_tree_teal', 416, 384, 64, 96);
    this.cropToTexture('serene_atlas', 'sv_house_red', 0, 672, 96, 128);
    this.cropToTexture('serene_atlas', 'sv_house_green', 192, 928, 128, 128);
    this.cropToTexture('serene_atlas', 'sv_house_blue', 192, 1184, 128, 128);

    // Legacy Fantasy High Forest 2.3 (400x400 Tiles/Buildings, 896x256 Trees BG, 288x336 Rocks)
    this.cropToTexture('lf_trees_bg', 'lf_parallax_far', 352, 0, 320, 256);
    this.cropToTexture('lf_trees_bg', 'lf_parallax_mid', 0, 0, 320, 256);
    this.cropToTexture('lf_tiles', 'lf_cave_floor', 16, 96, 48, 64);
    this.cropToTexture('lf_tiles', 'lf_moss_top', 16, 0, 48, 32);
    this.cropToTexture('lf_tiles', 'lf_plat_wood', 80, 96, 48, 16);
    this.cropToTexture('lf_tiles', 'lf_plat_stone', 176, 238, 48, 18);
    this.cropToTexture('lf_tiles', 'lf_mushroom', 256, 246, 32, 26);
    this.cropToTexture('lf_tiles', 'lf_chest', 288, 276, 32, 28);
    this.cropToTexture('lf_buildings', 'lf_cave_entrance', 272, 208, 128, 160);
    this.cropToTexture('lf_rocks', 'lf_pillar', 0, 166, 60, 90);
    this.cropToTexture('lf_rocks', 'lf_boulder', 64, 32, 64, 48);
  }

  private generateUiMarkers(): void {
    // Crisp Yellow Downward "JOIN" Arrow marker (Avatar World signature)
    if (!this.textures.exists('join_arrow')) {
      const tex = this.textures.createCanvas('join_arrow', 48, 52);
      if (tex) {
        const ctx = tex.getContext();
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#713f12';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(14, 4);
        ctx.lineTo(34, 4);
        ctx.lineTo(34, 24);
        ctx.lineTo(44, 24);
        ctx.lineTo(24, 48);
        ctx.lineTo(4, 24);
        ctx.lineTo(14, 24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#451a03';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('JOIN', 24, 21);
        tex.refresh();
      }
    }

    // Soft radial ground shadow under chibi characters & mobs
    if (!this.textures.exists('soft_shadow')) {
      const tex = this.textures.createCanvas('soft_shadow', 36, 14);
      if (tex) {
        const ctx = tex.getContext();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
        ctx.beginPath();
        ctx.ellipse(18, 7, 15, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        tex.refresh();
      }
    }

    // Glowing portal vortex overlay placed inside cave doorway
    if (!this.textures.exists('portal_vortex')) {
      const tex = this.textures.createCanvas('portal_vortex', 64, 80);
      if (tex) {
        const ctx = tex.getContext();
        const grad = ctx.createRadialGradient(32, 42, 4, 32, 42, 30);
        grad.addColorStop(0, 'rgba(245, 208, 254, 0.95)');
        grad.addColorStop(0.55, 'rgba(147, 51, 234, 0.72)');
        grad.addColorStop(1, 'rgba(30, 27, 75, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(32, 42, 26, 36, 0, 0, Math.PI * 2);
        ctx.fill();
        tex.refresh();
      }
    }
  }

  private registerAnimations(): void {
    // Ninja Adventure Boy 4-dir animations (cols: 0=Down, 1=Up, 2=Left, 3=Right)
    const walkDirs: Array<[string, number[]]> = [
      ['boy_walk_down', [0, 4, 8, 12]],
      ['boy_walk_up', [1, 5, 9, 13]],
      ['boy_walk_left', [2, 6, 10, 14]],
      ['boy_walk_right', [3, 7, 11, 15]],
    ];
    for (const [key, frames] of walkDirs) {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: frames.map((frame) => ({ key: 'player_boy', frame })),
          frameRate: 9,
          repeat: -1,
        });
      }
    }

    // Slime idle bounce animation
    if (!this.anims.exists('slime_bounce')) {
      this.anims.create({
        key: 'slime_bounce',
        frames: [0, 4, 8, 12].map((frame) => ({ key: 'slime_monster', frame })),
        frameRate: 6,
        repeat: -1,
      });
    }

    // Sword slash curved VFX
    if (!this.anims.exists('slash_curved')) {
      this.anims.create({
        key: 'slash_curved',
        frames: [0, 1, 2, 3].map((frame) => ({ key: 'fx_slash', frame })),
        frameRate: 20,
        repeat: 0,
      });
    }

    // Serene Village animated campfire
    if (!this.anims.exists('campfire_burn')) {
      this.anims.create({
        key: 'campfire_burn',
        frames: [0, 1, 2, 3].map((frame) => ({ key: 'sv_campfire', frame })),
        frameRate: 7,
        repeat: -1,
      });
    }
  }
}
