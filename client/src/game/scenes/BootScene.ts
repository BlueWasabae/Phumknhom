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
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width / 2, height / 2, 260, 14, 0x1e293b).setStrokeStyle(2, 0xf59e0b);
    const barFill = this.add.rectangle(width / 2 - 126, height / 2, 0, 8, 0xfacc15).setOrigin(0, 0.5);
    const label = this.add
      .text(width / 2, height / 2 - 24, 'Loading ភូមិខ្ញុំ 16×16 Pixel Art...', {
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

    // ---- 1. NINJA ADVENTURE PACK (Chibi Character, Props, Slash VFX, Food, Audio) ----
    this.load.spritesheet('player_boy', `${NA}/Actor/Character/Boy/SpriteSheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('fx_slash', `${NA}/FX/Attack/SlashCurved/SpriteSheet.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image('na_elements', `${NA}/Backgrounds/Tilesets/TilesetElement.png`);
    this.load.image('icon_noodle', `${NA}/Items/Food/Noodle.png`);
    this.load.audio('sfx_levelup', `${NA}/Audio/Jingles/LevelUp1.wav`);

    // ---- 2. SERENE VILLAGE PACK (Native 16x16 Tileset + Animated Campfire) ----
    this.load.image('serene_16', `${SV}/Serene_Village_16x16.png`);
    this.load.spritesheet('sv_campfire_16', `${SV}/Animated stuff/campfire_16x16.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });

    // ---- 3. LEGACY FANTASY PACK (Parallax Cavern, Tiles, Entrance, Rocks, Wild Boar Mob) ----
    this.load.image('lf_sky', `${LF}/Background/Background.png`);
    this.load.image('lf_trees_bg', `${LF}/Trees/Background.png`);
    this.load.image('lf_tiles', `${LF}/Assets/Tiles.png`);
    this.load.image('lf_buildings', `${LF}/Assets/Buildings.png`);
    this.load.image('lf_rocks', `${LF}/Assets/Props-Rocks.png`);
    this.load.spritesheet('boar_idle', `${LF}/Mob/Boar/Idle/Idle-Sheet.png`, {
      frameWidth: 48,
      frameHeight: 32,
    });
    this.load.spritesheet('boar_hit', `${LF}/Mob/Boar/Hit-Vanish/Hit-Sheet.png`, {
      frameWidth: 48,
      frameHeight: 32,
    });

    // ---- 4. CUSTOM KHMER PIXEL-ART SPRITES (Cleaned Transparent PNGs) ----
    this.load.image('khmer_stilt_house', '/assets/khmer/buildings/khmer_stilt_house.png');
    this.load.image('num_pang_cart', '/assets/khmer/buildings/num_pang_cart.png');
    this.load.image('angkor_portal', '/assets/khmer/buildings/angkor_portal.png');
    this.load.image('boss_yeak_thmor', '/assets/khmer/bosses/boss_yeak_thmor.png');
  }

  create(): void {
    this.sliceAtlasSubTextures();
    this.generateUiAndLightTextures();
    this.registerAnimations();

    this.scene.start('OverworldScene', {
      playerState: { ...INITIAL_PLAYER_STATE, weapon: { ...INITIAL_PLAYER_STATE.weapon } },
    });
  }

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
    // Serene Village native 16x16 grid (304x720 = 19x45 tiles)
    this.cropToTexture('serene_16', 'sv_grass', 48, 0, 16, 16);
    this.cropToTexture('serene_16', 'sv_path', 96, 16, 16, 16);
    this.cropToTexture('serene_16', 'sv_plaza_tile', 256, 64, 32, 32);
    this.cropToTexture('serene_16', 'sv_flowers', 0, 48, 48, 48);
    this.cropToTexture('serene_16', 'sv_sign_wood', 112, 208, 16, 16);
    this.cropToTexture('serene_16', 'sv_fence_h', 80, 208, 32, 16);
    this.cropToTexture('serene_16', 'sv_fence_pen', 64, 240, 48, 48);
    this.cropToTexture('serene_16', 'sv_flower_box', 64, 288, 48, 16);
    this.cropToTexture('serene_16', 'sv_tree_green', 144, 192, 32, 48);
    this.cropToTexture('serene_16', 'sv_tree_teal', 208, 192, 32, 48);
    this.cropToTexture('serene_16', 'sv_house_red', 0, 336, 48, 64);
    this.cropToTexture('serene_16', 'sv_house_green', 96, 464, 64, 64);
    this.cropToTexture('serene_16', 'sv_house_blue', 96, 592, 64, 64);

    // Ninja Adventure TilesetElement.png (256x240 = 16x15 tiles)
    this.cropToTexture('na_elements', 'na_bench', 32, 160, 48, 16);
    this.cropToTexture('na_elements', 'na_cart', 32, 48, 32, 32);
    this.cropToTexture('na_elements', 'na_lantern', 96, 48, 16, 32);
    this.cropToTexture('na_elements', 'na_pebbles', 16, 160, 16, 16);

    // Legacy Fantasy High Forest 2.3
    this.cropToTexture('lf_trees_bg', 'lf_parallax_far', 352, 0, 320, 256);
    this.cropToTexture('lf_trees_bg', 'lf_parallax_mid', 0, 0, 320, 256);
    this.cropToTexture('lf_tiles', 'lf_cave_floor', 16, 96, 48, 64);
    this.cropToTexture('lf_tiles', 'lf_moss_top', 16, 0, 48, 32);
    this.cropToTexture('lf_tiles', 'lf_plat_wood', 80, 96, 48, 16);
    this.cropToTexture('lf_tiles', 'lf_plat_stone', 176, 238, 48, 18);
    this.cropToTexture('lf_tiles', 'lf_mushroom', 256, 246, 32, 26);
    this.cropToTexture('lf_tiles', 'lf_chest', 288, 276, 32, 28);
    this.cropToTexture('lf_tiles', 'lf_vine_green', 240, 280, 18, 32);
    this.cropToTexture('lf_tiles', 'lf_vine_purple', 274, 276, 14, 36);
    this.cropToTexture('lf_tiles', 'lf_torch', 242, 314, 12, 18);
    this.cropToTexture('lf_buildings', 'lf_cave_entrance', 272, 208, 128, 160);
    this.cropToTexture('lf_rocks', 'lf_pillar', 0, 166, 60, 90);
    this.cropToTexture('lf_rocks', 'lf_boulder', 64, 32, 64, 48);
  }

  private generateUiAndLightTextures(): void {
    // Crisp Yellow Downward "JOIN" Arrow (compact crisp pixel-style)
    if (!this.textures.exists('join_arrow')) {
      const tex = this.textures.createCanvas('join_arrow', 34, 36);
      if (tex) {
        const ctx = tex.getContext();
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#713f12';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(10, 3);
        ctx.lineTo(24, 3);
        ctx.lineTo(24, 17);
        ctx.lineTo(31, 17);
        ctx.lineTo(17, 33);
        ctx.lineTo(3, 17);
        ctx.lineTo(10, 17);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#451a03';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('JOIN', 17, 15);
        tex.refresh();
      }
    }

    // Soft dark oval ground shadow (reusable for characters, trees, stalls, houses)
    if (!this.textures.exists('soft_shadow')) {
      const tex = this.textures.createCanvas('soft_shadow', 64, 24);
      if (tex) {
        const ctx = tex.getContext();
        const grad = ctx.createRadialGradient(32, 12, 4, 32, 12, 30);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
        grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.22)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(32, 12, 30, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        tex.refresh();
      }
    }

    // Glowing portal vortex overlay
    if (!this.textures.exists('portal_vortex')) {
      const tex = this.textures.createCanvas('portal_vortex', 48, 60);
      if (tex) {
        const ctx = tex.getContext();
        const grad = ctx.createRadialGradient(24, 30, 3, 24, 30, 22);
        grad.addColorStop(0, 'rgba(245, 208, 254, 0.96)');
        grad.addColorStop(0.55, 'rgba(147, 51, 234, 0.72)');
        grad.addColorStop(1, 'rgba(30, 27, 75, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(24, 30, 19, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        tex.refresh();
      }
    }

    // Warm radial flickering torch glow + dust mote dot
    if (!this.textures.exists('torch_glow')) {
      const tex = this.textures.createCanvas('torch_glow', 128, 128);
      if (tex) {
        const ctx = tex.getContext();
        const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
        grad.addColorStop(0, 'rgba(255, 220, 120, 0.55)');
        grad.addColorStop(0.45, 'rgba(249, 115, 22, 0.25)');
        grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
        tex.refresh();
      }
    }

    if (!this.textures.exists('dust_mote')) {
      const tex = this.textures.createCanvas('dust_mote', 6, 6);
      if (tex) {
        const ctx = tex.getContext();
        ctx.fillStyle = 'rgba(254, 243, 199, 0.75)';
        ctx.fillRect(1, 1, 4, 4);
        tex.refresh();
      }
    }

    // Crisp pixel-art fallback for Boss #1: Sdech Kongkaeb (King Frog)
    // Automatically skipped if a custom boss_sdech_kongkaeb.png is loaded.
    if (!this.textures.exists('boss_sdech_kongkaeb')) {
      const tex = this.textures.createCanvas('boss_sdech_kongkaeb', 96, 84);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Back webbed feet
        ctx.fillStyle = '#14532d';
        ctx.fillRect(10, 68, 22, 10);
        ctx.fillRect(64, 68, 22, 10);
        // Chunky haunches
        ctx.fillStyle = '#15803d';
        ctx.fillRect(12, 44, 20, 26);
        ctx.fillRect(64, 44, 20, 26);
        // Main bulbous frog torso
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(18, 28, 60, 44);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(22, 32, 52, 34);
        // Muddy spots & warts
        ctx.fillStyle = '#14532d';
        ctx.fillRect(24, 36, 8, 6);
        ctx.fillRect(62, 38, 10, 6);
        ctx.fillRect(28, 52, 6, 6);
        ctx.fillRect(60, 54, 8, 6);
        // Inflatable cream-gold throat pouch & belly
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(30, 48, 36, 20);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(34, 52, 28, 14);
        // Wide grumpy king mouth
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(24, 44, 48, 4);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(42, 45, 12, 3);
        // Bulging eyes
        ctx.fillStyle = '#15803d';
        ctx.fillRect(22, 16, 18, 16);
        ctx.fillRect(56, 16, 18, 16);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(25, 19, 12, 10);
        ctx.fillRect(59, 19, 12, 10);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(29, 21, 5, 6);
        ctx.fillRect(62, 21, 5, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(30, 21, 2, 2);
        ctx.fillRect(63, 21, 2, 2);
        // Golden Angkor Frog Crown
        ctx.fillStyle = '#facc15';
        ctx.fillRect(34, 14, 28, 8);
        ctx.fillRect(34, 8, 6, 6);
        ctx.fillRect(45, 4, 6, 10);
        ctx.fillRect(56, 8, 6, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(46, 15, 4, 5);
        // Dark crisp pixel outline accents
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 2;
        ctx.strokeRect(18, 28, 60, 44);
        tex.refresh();
      }
    }

    // Glowing Treasure Bag sprite for Boss loot drops
    if (!this.textures.exists('boss_treasure_bag')) {
      const tex = this.textures.createCanvas('boss_treasure_bag', 36, 36);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(8, 12, 20, 20);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(10, 14, 16, 16);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(10, 10, 16, 4);
        ctx.fillRect(15, 16, 6, 8);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(12, 6, 12, 5);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 12, 20, 20);
        tex.refresh();
      }
    }
  }

  private registerAnimations(): void {
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

    if (!this.anims.exists('slash_curved')) {
      this.anims.create({
        key: 'slash_curved',
        frames: [0, 1, 2, 3].map((frame) => ({ key: 'fx_slash', frame })),
        frameRate: 22,
        repeat: 0,
      });
    }

    if (!this.anims.exists('campfire_burn')) {
      this.anims.create({
        key: 'campfire_burn',
        frames: [0, 1, 2, 3].map((frame) => ({ key: 'sv_campfire_16', frame })),
        frameRate: 7,
        repeat: -1,
      });
    }

    if (!this.anims.exists('boar_idle_anim')) {
      this.anims.create({
        key: 'boar_idle_anim',
        frames: [0, 1, 2, 3].map((frame) => ({ key: 'boar_idle', frame })),
        frameRate: 6,
        repeat: -1,
      });
    }

    if (!this.anims.exists('boar_hit_anim')) {
      this.anims.create({
        key: 'boar_hit_anim',
        frames: [0, 1, 2, 3].map((frame) => ({ key: 'boar_hit', frame })),
        frameRate: 14,
        repeat: 0,
      });
    }
  }
}
