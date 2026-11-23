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

    // ---- 4. CUSTOM KHMER PIXEL-ART SPRITES (Cleaned Transparent PNGs + Optional Manifest) ----
    this.load.image('khmer_stilt_house', '/assets/khmer/buildings/khmer_stilt_house.png');
    this.load.image('num_pang_cart', '/assets/khmer/buildings/num_pang_cart.png');
    this.load.image('angkor_portal', '/assets/khmer/buildings/angkor_portal.png');
    this.load.image('boss_yeak_thmor', '/assets/khmer/bosses/boss_yeak_thmor.png');
    this.load.json('khmer_manifest', '/assets/khmer/manifest.json');
  }

  create(): void {
    const manifest = this.cache.json.get('khmer_manifest') as Record<string, string> | undefined;
    const extraEntries = manifest
      ? Object.entries(manifest).filter(([key]) => !this.textures.exists(key))
      : [];

    if (extraEntries.length > 0) {
      for (const [key, url] of extraEntries) {
        this.load.image(key, url);
      }
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.finalizeBoot();
      });
      this.load.start();
      return;
    }

    this.finalizeBoot();
  }

  private finalizeBoot(): void {
    this.sliceAtlasSubTextures();
    this.generateUiAndLightTextures();
    this.registerAnimations();

    const tabSuffix = Math.floor(10 + Math.random() * 89);
    this.scene.start('OverworldScene', {
      playerState: {
        ...INITIAL_PLAYER_STATE,
        name: `PhumHero_${tabSuffix}`,
        weapon: { ...INITIAL_PLAYER_STATE.weapon },
      },
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

    // Phase 8 Fallback Pixel-Art Sprites (Zero console 404s!)
    if (!this.textures.exists('ancient_pagoda')) {
      const tex = this.textures.createCanvas('ancient_pagoda', 96, 88);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Stone base steps
        ctx.fillStyle = '#78716c';
        ctx.fillRect(8, 74, 80, 10);
        ctx.fillStyle = '#a8a29e';
        ctx.fillRect(14, 66, 68, 8);
        // Temple pillars & doorway
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(20, 42, 56, 24);
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(20, 42, 6, 24);
        ctx.fillRect(70, 42, 6, 24);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(40, 48, 16, 18);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(46, 52, 4, 8);
        // Tier 1 golden Khmer roof
        ctx.fillStyle = '#b45309';
        ctx.fillRect(10, 34, 76, 10);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(14, 30, 68, 6);
        // Tier 2 roof
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(22, 22, 52, 8);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(26, 18, 44, 5);
        // Golden spire (Chofa)
        ctx.fillStyle = '#fde047';
        ctx.fillRect(44, 4, 8, 14);
        ctx.fillRect(46, 0, 4, 6);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 42, 56, 24);
        tex.refresh();
      }
    }

    if (!this.textures.exists('lucky_wheel_kiosk')) {
      const tex = this.textures.createCanvas('lucky_wheel_kiosk', 56, 60);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Wooden stand
        ctx.fillStyle = '#78350f';
        ctx.fillRect(12, 46, 32, 12);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(24, 34, 8, 14);
        // Colorful prize wheel
        const cols = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ec4899', '#a855f7'];
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = cols[i];
          ctx.beginPath();
          ctx.moveTo(28, 22);
          ctx.arc(28, 22, 18, (i * Math.PI) / 3, ((i + 1) * Math.PI) / 3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(28, 22, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(28, 22, 5, 0, Math.PI * 2);
        ctx.fill();
        // Top gold pointer
        ctx.fillStyle = '#facc15';
        ctx.fillRect(25, 0, 6, 7);
        tex.refresh();
      }
    }

    if (!this.textures.exists('market_board')) {
      const tex = this.textures.createCanvas('market_board', 56, 52);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(10, 32, 6, 18);
        ctx.fillRect(40, 32, 6, 18);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(4, 10, 48, 26);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(8, 14, 16, 18);
        ctx.fillRect(28, 14, 20, 12);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(4, 4, 48, 6);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(14, 16, 4, 4);
        ctx.fillRect(36, 16, 4, 4);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 10, 48, 26);
        tex.refresh();
      }
    }

    if (!this.textures.exists('fishing_pier')) {
      const tex = this.textures.createCanvas('fishing_pier', 72, 48);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Wooden planks
        ctx.fillStyle = '#92400e';
        ctx.fillRect(8, 12, 56, 26);
        ctx.fillStyle = '#b45309';
        for (let x = 10; x < 62; x += 8) {
          ctx.fillRect(x, 14, 6, 22);
        }
        // Dock posts
        ctx.fillStyle = '#451a03';
        ctx.fillRect(8, 8, 6, 36);
        ctx.fillRect(58, 8, 6, 36);
        // Hanging lantern + fishing rod silhouette
        ctx.fillStyle = '#facc15';
        ctx.fillRect(56, 4, 8, 8);
        tex.refresh();
      }
    }

    // ==================== PHASE 9 PIXEL-ART BOSS & KHMER TREE FALLBACKS ====================
    // Boss #2: Arp Prey Chrov (FloaterRig — Floating Head + Bioluminescent Entrails)
    if (!this.textures.exists('boss_arp_prey_chrov')) {
      const tex = this.textures.createCanvas('boss_arp_prey_chrov', 76, 92);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Glowing green/crimson spectral organ trails below head
        ctx.fillStyle = '#059669';
        ctx.fillRect(28, 46, 20, 20);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(32, 48, 12, 16);
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(24, 54, 6, 22);
        ctx.fillRect(46, 54, 6, 20);
        ctx.fillRect(35, 62, 6, 24);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(36, 66, 4, 14);
        // Flowing wild dark hair
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(14, 12, 48, 36);
        ctx.fillRect(10, 22, 8, 28);
        ctx.fillRect(58, 22, 8, 28);
        // Pale eerie face
        ctx.fillStyle = '#d1fae5';
        ctx.fillRect(22, 18, 32, 26);
        ctx.fillStyle = '#a7f3d0';
        ctx.fillRect(24, 20, 28, 22);
        // Glowing crimson-emerald eyes
        ctx.fillStyle = '#022c22';
        ctx.fillRect(26, 26, 8, 6);
        ctx.fillRect(42, 26, 8, 6);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(28, 27, 4, 4);
        ctx.fillRect(44, 27, 4, 4);
        // Fanged grimace
        ctx.fillStyle = '#4c0519';
        ctx.fillRect(28, 36, 20, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(30, 36, 3, 3);
        ctx.fillRect(43, 36, 3, 3);
        // Bioluminescent spark dots
        ctx.fillStyle = '#6ee7b7';
        ctx.fillRect(18, 62, 4, 4);
        ctx.fillRect(54, 68, 4, 4);
        ctx.fillRect(34, 86, 4, 4);
        tex.refresh();
      }
    }

    // Boss #6: Neak Reach (MultiSegmentWormRig — Shadow Naga Head, Segment, Tail)
    if (!this.textures.exists('boss_neak_reach_head')) {
      const tex = this.textures.createCanvas('boss_neak_reach_head', 76, 68);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Flared Angkorian cobra hood
        ctx.fillStyle = '#4c1d95';
        ctx.fillRect(12, 10, 52, 46);
        ctx.fillStyle = '#7e22ce';
        ctx.fillRect(16, 14, 44, 38);
        // Golden Khmer crown flame spires
        ctx.fillStyle = '#facc15';
        ctx.fillRect(26, 4, 24, 10);
        ctx.fillRect(34, 0, 8, 8);
        ctx.fillRect(18, 8, 6, 8);
        ctx.fillRect(52, 8, 6, 8);
        // Serpent snout & scales
        ctx.fillStyle = '#3b0764';
        ctx.fillRect(22, 22, 32, 32);
        ctx.fillStyle = '#6b21a8';
        ctx.fillRect(24, 24, 28, 24);
        // Glowing venom-green eyes
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(26, 28, 8, 6);
        ctx.fillRect(42, 28, 8, 6);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(29, 29, 3, 3);
        ctx.fillRect(45, 29, 3, 3);
        // Venomous fangs & jaw
        ctx.fillStyle = '#14532d';
        ctx.fillRect(26, 42, 24, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(28, 42, 4, 6);
        ctx.fillRect(44, 42, 4, 6);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(35, 48, 6, 8);
        tex.refresh();
      }
    }

    if (!this.textures.exists('boss_neak_reach_seg')) {
      const tex = this.textures.createCanvas('boss_neak_reach_seg', 44, 44);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#3b0764';
        ctx.fillRect(6, 6, 32, 32);
        ctx.fillStyle = '#6b21a8';
        ctx.fillRect(9, 9, 26, 26);
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(14, 12, 16, 12);
        // Golden Angkor dorsal spine & emerald venom core
        ctx.fillStyle = '#facc15';
        ctx.fillRect(18, 2, 8, 7);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(19, 19, 6, 6);
        tex.refresh();
      }
    }

    if (!this.textures.exists('boss_neak_reach_tail')) {
      const tex = this.textures.createCanvas('boss_neak_reach_tail', 36, 28);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#4c1d95';
        ctx.fillRect(4, 6, 24, 16);
        ctx.fillStyle = '#7e22ce';
        ctx.fillRect(8, 8, 18, 12);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(24, 10, 10, 8);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(12, 3, 6, 5);
        tex.refresh();
      }
    }

    // Iconic Cambodian Sugar Palm Tree (Thnot) Fallback
    if (!this.textures.exists('sugar_palm_tree')) {
      const tex = this.textures.createCanvas('sugar_palm_tree', 48, 76);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Slender ringed trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(21, 28, 6, 46);
        ctx.fillStyle = '#92400e';
        for (let y = 32; y < 70; y += 6) {
          ctx.fillRect(21, y, 6, 2);
        }
        // Radiating palm fan canopy
        ctx.fillStyle = '#15803d';
        ctx.fillRect(8, 14, 32, 16);
        ctx.fillRect(14, 6, 20, 22);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(4, 18, 12, 8);
        ctx.fillRect(32, 18, 12, 8);
        ctx.fillRect(16, 4, 16, 12);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(18, 8, 12, 6);
        // Dark brown hanging sugar palm fruit clusters
        ctx.fillStyle = '#451a03';
        ctx.fillRect(18, 26, 5, 5);
        ctx.fillRect(25, 26, 5, 5);
        tex.refresh();
      }
    }

    // Golden Durian Tree Fallback
    if (!this.textures.exists('golden_durian_tree')) {
      const tex = this.textures.createCanvas('golden_durian_tree', 52, 68);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#713f12';
        ctx.fillRect(22, 36, 8, 30);
        ctx.fillStyle = '#3f6212';
        ctx.fillRect(8, 12, 36, 28);
        ctx.fillStyle = '#65a30d';
        ctx.fillRect(12, 8, 28, 24);
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(16, 12, 20, 12);
        // Glowing golden durians!
        ctx.fillStyle = '#facc15';
        ctx.fillRect(14, 24, 6, 7);
        ctx.fillRect(32, 22, 6, 7);
        ctx.fillRect(23, 16, 6, 7);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(16, 26, 2, 2);
        ctx.fillRect(34, 24, 2, 2);
        tex.refresh();
      }
    }

    // ==================== EXPANSION PIXEL-ART LANDMARK SPRITES (ZERO 404s!) ====================
    if (!this.textures.exists('bus_stop_sign')) {
      const tex = this.textures.createCanvas('bus_stop_sign', 36, 48);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#475569';
        ctx.fillRect(16, 16, 4, 30);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(6, 4, 24, 16);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(10, 8, 16, 8);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(12, 10, 4, 4);
        ctx.fillRect(20, 10, 4, 4);
        tex.refresh();
      }
    }

    if (!this.textures.exists('village_bus')) {
      const tex = this.textures.createCanvas('village_bus', 80, 42);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Cute Pixel-Art GREEN Village Bus with Khmer gold trim
        ctx.fillStyle = '#14532d';
        ctx.fillRect(10, 4, 58, 4); // roof rack
        ctx.fillStyle = '#15803d';
        ctx.fillRect(4, 8, 72, 24); // main green hull
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(6, 10, 68, 12); // upper bright green body
        ctx.fillStyle = '#facc15';
        ctx.fillRect(4, 21, 72, 5); // Khmer gold racing stripe
        // Cozy passenger windows
        ctx.fillStyle = '#e0f2fe';
        for (let wx = 10; wx <= 56; wx += 14) {
          ctx.fillRect(wx, 12, 10, 8);
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(wx, 17, 10, 3);
          ctx.fillStyle = '#e0f2fe';
        }
        // Front windshield & glowing headlights
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(72, 24, 4, 5);
        // Dark pixel bumper + chunky tires with gold hubcaps
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(2, 29, 76, 3);
        ctx.fillRect(14, 30, 12, 10);
        ctx.fillRect(54, 30, 12, 10);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(18, 33, 4, 4);
        ctx.fillRect(58, 33, 4, 4);
        tex.refresh();
      }
    }

    if (!this.textures.exists('golden_shrine')) {
      const tex = this.textures.createCanvas('golden_shrine', 46, 58);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Stepped sandstone + gold base
        ctx.fillStyle = '#78350f';
        ctx.fillRect(5, 46, 36, 10);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(9, 40, 28, 7);
        // Golden lotus shrine pillars & alcove
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(12, 22, 22, 18);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(15, 24, 16, 14);
        // Glowing blessing orb inside alcove
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20, 28, 6, 6);
        // Tiered Angkor golden crown spire
        ctx.fillStyle = '#d97706';
        ctx.fillRect(9, 17, 28, 6);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(14, 11, 18, 6);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(19, 5, 8, 6);
        ctx.fillRect(21, 1, 4, 4);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(12, 22, 22, 18);
        tex.refresh();
      }
    }

    if (!this.textures.exists('atm_kiosk')) {
      const tex = this.textures.createCanvas('atm_kiosk', 34, 44);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(5, 6, 24, 36);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(9, 12, 16, 11);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(9, 27, 16, 4);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(11, 34, 12, 5);
        tex.refresh();
      }
    }

    if (!this.textures.exists('blacksmith_anvil')) {
      const tex = this.textures.createCanvas('blacksmith_anvil', 44, 36);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(10, 22, 24, 12);
        ctx.fillStyle = '#334155';
        ctx.fillRect(6, 12, 32, 10);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(8, 10, 26, 4);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(16, 6, 12, 4);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(19, 4, 6, 3);
        tex.refresh();
      }
    }

    if (!this.textures.exists('club_building')) {
      const tex = this.textures.createCanvas('club_building', 84, 72);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#3b0764';
        ctx.fillRect(8, 22, 68, 46);
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(6, 14, 72, 10);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(16, 17, 52, 4);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(32, 44, 20, 24);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(14, 32, 14, 12);
        ctx.fillRect(56, 32, 14, 12);
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 22, 68, 46);
        tex.refresh();
      }
    }

    if (!this.textures.exists('pylon_shrine')) {
      const tex = this.textures.createCanvas('pylon_shrine', 44, 56);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#78716c';
        ctx.fillRect(8, 42, 28, 12);
        ctx.fillStyle = '#a8a29e';
        ctx.fillRect(12, 36, 20, 6);
        // Floating Angkor Pylon Crystal
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(16, 10, 12, 20);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(18, 6, 8, 26);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(20, 12, 4, 12);
        tex.refresh();
      }
    }

    if (!this.textures.exists('npc_blacksmith')) {
      const tex = this.textures.createCanvas('npc_blacksmith', 34, 44);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Boots & leather apron
        ctx.fillStyle = '#2b1b17';
        ctx.fillRect(9, 24, 16, 18);
        ctx.fillStyle = '#5c3317';
        ctx.fillRect(10, 24, 14, 14);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(11, 25, 12, 10);
        // Muscular arms + skin head
        ctx.fillStyle = '#2b1b17';
        ctx.fillRect(9, 8, 16, 15);
        ctx.fillStyle = '#d99a6c';
        ctx.fillRect(10, 9, 14, 13);
        ctx.fillRect(6, 22, 4, 9);
        ctx.fillRect(24, 20, 4, 9);
        // Red Krama blacksmith bandana & expressive eyes
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(9, 9, 16, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(11, 9, 3, 2);
        ctx.fillRect(17, 9, 3, 2);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(13, 15, 2, 3);
        ctx.fillRect(19, 15, 2, 3);
        // Iron Blacksmith Hammer in right hand
        ctx.fillStyle = '#78350f';
        ctx.fillRect(26, 12, 3, 14);
        ctx.fillStyle = '#475569';
        ctx.fillRect(22, 9, 10, 5);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(23, 10, 8, 2);
        tex.refresh();
      }
    }

    if (!this.textures.exists('shimmer_spring')) {
      const tex = this.textures.createCanvas('shimmer_spring', 64, 42);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Carved Angkor sandstone spring rim
        ctx.fillStyle = '#57534e';
        ctx.beginPath();
        ctx.ellipse(32, 24, 30, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a8a29e';
        ctx.beginPath();
        ctx.ellipse(32, 22, 26, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Iridescent rainbow Apsara Shimmer liquid
        const grad = ctx.createLinearGradient(10, 14, 54, 30);
        grad.addColorStop(0, '#c084fc');
        grad.addColorStop(0.35, '#38bdf8');
        grad.addColorStop(0.7, '#f472b6');
        grad.addColorStop(1, '#fde047');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(32, 22, 22, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        // Sparkle pixels
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(22, 19, 3, 2);
        ctx.fillRect(36, 23, 3, 2);
        ctx.fillRect(30, 16, 2, 2);
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
