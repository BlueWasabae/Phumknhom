import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE } from '@shared/types';

const NA = '/assets/packs/ninja-adventure/Ninja Adventure - Asset Pack';
const SV = '/assets/packs/serene-village/SERENE_VILLAGE_REVAMPED';
const LF = '/assets/packs/legacy-fantasy/Legacy-Fantasy - High Forest 2.3';

/**
 * Verified 16x16 4-directional Ninja Adventure character sprite sheets (64x112 = 4 cols x 7 rows):
 * Col 0=down, 1=up, 2=left, 3=right | Rows 0-3=walk, Row 4=attack, Row 5=jump
 */
export const HERO_CHARACTER_SHEETS = [
  'char_boy',
  'char_fighter',
  'char_hunter',
  'char_monk',
  'char_ninja',
  'char_sultan',
  'char_knight',
  'char_princess',
  'char_master',
] as const;

export type HeroCharacterKey = (typeof HERO_CHARACTER_SHEETS)[number];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width / 2, height / 2, 260, 14, 0x1e293b).setStrokeStyle(2, 0xf59e0b);
    const barFill = this.add.rectangle(width / 2 - 126, height / 2, 0, 8, 0xfacc15).setOrigin(0, 0.5);
    const label = this.add
      .text(width / 2, height / 2 - 24, 'Loading ភូមិខ្ញុំ Real Pixel-Art Sprites...', {
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

    // ---- 1. NINJA ADVENTURE: VERIFIED 16x16 CHIBI CHARACTER SPRITESHEETS (64x112) ----
    const charPaths: Record<HeroCharacterKey, string> = {
      char_boy: `${NA}/Actor/Character/Boy/SpriteSheet.png`,
      char_fighter: `${NA}/Actor/Character/FighterRed/SpriteSheet.png`,
      char_hunter: `${NA}/Actor/Character/Hunter/SpriteSheet.png`,
      char_monk: `${NA}/Actor/Character/Monk/SpriteSheet.png`,
      char_ninja: `${NA}/Actor/Character/NinjaDark/SpriteSheet.png`,
      char_sultan: `${NA}/Actor/Character/Sultan/SpriteSheet.png`,
      char_knight: `${NA}/Actor/Character/KnightGold/SpriteSheet.png`,
      char_princess: `${NA}/Actor/Character/Princess/SpriteSheet.png`,
      char_master: `${NA}/Actor/Character/Master/SpriteSheet.png`,
    };
    for (const [key, url] of Object.entries(charPaths)) {
      this.load.spritesheet(key, url, { frameWidth: 16, frameHeight: 16 });
    }
    // Keep player_boy alias for legacy Arcade physics body reference
    this.load.spritesheet('player_boy', `${NA}/Actor/Character/Boy/SpriteSheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });

    // ---- 2. NINJA ADVENTURE: VERIFIED REAL WEAPONS (SpriteInHand / Sprite) ----
    this.load.image('wp_axe', `${NA}/Items/Weapons/Axe/SpriteInHand.png`);
    this.load.image('wp_bigsword', `${NA}/Items/Weapons/BigSword/SpriteInHand.png`);
    this.load.image('wp_sword2', `${NA}/Items/Weapons/Sword2/SpriteInHand.png`);
    this.load.image('wp_bow', `${NA}/Items/Weapons/Bow/Sprite.png`);
    this.load.image('wp_bow2', `${NA}/Items/Weapons/Bow2/Sprite.png`);
    this.load.image('wp_book', `${NA}/Items/Weapons/Book/SpriteInHand.png`);
    this.load.image('wp_whip', `${NA}/Items/Weapons/Whip/SpriteInHand.png`);
    this.load.image('wp_lance2', `${NA}/Items/Weapons/Lance2/SpriteInHand.png`);
    this.load.image('wp_sai', `${NA}/Items/Weapons/Sai/SpriteInHand.png`);
    this.load.image('wp_club', `${NA}/Items/Weapons/Club/SpriteInHand.png`);

    // ---- 3. NINJA ADVENTURE: VERIFIED REAL PETS & SPIRIT COMPANIONS ----
    this.load.spritesheet('pet_cat_white', `${NA}/Actor/Animal/CatWhite/SpriteSheet.png`, {
      frameWidth: 17,
      frameHeight: 15,
    });
    this.load.spritesheet('pet_frog', `${NA}/Actor/Animal/Frog/SpriteSheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('pet_lioncub', `${NA}/Actor/Animal/LionCub/SpriteSheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('pet_dog', `${NA}/Actor/Animal/DogYellow/SpriteSheet.png`, {
      frameWidth: 21,
      frameHeight: 17,
    });
    this.load.spritesheet('pet_spirit', `${NA}/Actor/Monster/Spirit/SpriteSheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('pet_lantern', `${NA}/Actor/Monster/LanternRed/SpriteSheet.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });

    // ---- 4. NINJA ADVENTURE: VERIFIED REAL BOSS SPRITES ----
    this.load.spritesheet('boss_giant_frog_idle', `${NA}/Actor/Boss/GiantFrog/Idle40x40.png`, {
      frameWidth: 40,
      frameHeight: 40,
    });
    this.load.spritesheet('boss_giant_spirit_idle', `${NA}/Actor/Boss/GiantSpirit/Idle.png`, {
      frameWidth: 50,
      frameHeight: 50,
    });
    this.load.image('boss_dragon_head', `${NA}/Actor/Boss/DragonGreen/Head.png`);
    this.load.image('boss_dragon_body', `${NA}/Actor/Boss/DragonGreen/Body1.png`);
    this.load.image('boss_dragon_tail', `${NA}/Actor/Boss/DragonGreen/BodyEnd.png`);

    // ---- 5. NINJA ADVENTURE: VERIFIED TILESETS, FX, TREASURE & AUDIO ----
    this.load.spritesheet('fx_slash', `${NA}/FX/Attack/SlashCurved/SpriteSheet.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('na_water_purple', `${NA}/Backgrounds/Animated/Water Ripples/SpriteSheetPurple.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image('na_elements', `${NA}/Backgrounds/Tilesets/TilesetElement.png`);
    this.load.image('na_houses', `${NA}/Backgrounds/Tilesets/TilesetHouse.png`);
    this.load.image('na_nature', `${NA}/Backgrounds/Tilesets/TilesetNature.png`);
    this.load.image('na_chest', `${NA}/Items/Treasure/BigTreasureChest.png`);
    this.load.image('na_heart', `${NA}/Items/Potion/Heart.png`);
    this.load.image('icon_noodle', `${NA}/Items/Food/Noodle.png`);
    this.load.audio('sfx_levelup', `${NA}/Audio/Jingles/LevelUp1.wav`);

    // ---- 6. SERENE VILLAGE PACK (Native 16x16 Tileset + Animated Campfires) ----
    this.load.image('serene_16', `${SV}/Serene_Village_16x16.png`);
    this.load.spritesheet('sv_campfire_16', `${SV}/Animated stuff/campfire_16x16.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('sv_campfire_32', `${SV}/Animated stuff/campfire_32x32.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });

    // ---- 7. LEGACY FANTASY PACK (Parallax Cavern, Tiles, Entrance, Rocks, Wild Boar Mob) ----
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

    // ---- 8. CUSTOM KHMER PIXEL-ART SPRITES (Verified on Disk + Optional Manifest) ----
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
    this.generateLightAndUiOverlays();
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

  private cropToTexture(
    srcKey: string,
    dstKey: string,
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ): void {
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
    // 1. Textured 48x48 Serene Village Meadow Grass (NO flat solid green square!)
    if (!this.textures.exists('sv_grass') && this.textures.exists('serene_16')) {
      const svImg = this.textures.get('serene_16').getSourceImage() as HTMLImageElement;
      const naNature = this.textures.exists('na_nature')
        ? (this.textures.get('na_nature').getSourceImage() as HTMLImageElement)
        : null;
      const tex = this.textures.createCanvas('sv_grass', 48, 48);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Fill 3x3 base Serene Village grass tiles
        for (let gy = 0; gy < 48; gy += 16) {
          for (let gx = 0; gx < 48; gx += 16) {
            ctx.drawImage(svImg, 48, 0, 16, 16, gx, gy, 16, 16);
          }
        }
        // Layer authentic pixel-art grass tufts & clover from Serene Village & Ninja Adventure
        ctx.drawImage(svImg, 0, 48, 16, 16, 4, 4, 16, 16);
        ctx.drawImage(svImg, 16, 64, 16, 16, 26, 24, 16, 16);
        if (naNature) {
          ctx.globalAlpha = 0.65;
          ctx.drawImage(naNature, 48, 160, 16, 16, 28, 2, 12, 12);
          ctx.drawImage(naNature, 64, 160, 16, 16, 6, 30, 12, 12);
          ctx.globalAlpha = 1;
        }
        tex.refresh();
      }
    }

    // 2. Serene Village Dirt Path (matching inner sandy-dirt tile, zero mismatched grass corners!)
    this.cropToTexture('serene_16', 'sv_path', 256, 64, 32, 32);
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
    // Real Serene Village wooden dock / pier!
    this.cropToTexture('serene_16', 'fishing_pier', 160, 48, 32, 48);

    // 3. Real Ninja Adventure TilesetHouse & TilesetElement props (replacing ALL procedural buildings/props!)
    // Red-roofed Ancient Pagoda (used if custom khmer/buildings/ancient_pagoda.png is not in manifest)
    this.cropToTexture('na_houses', 'ancient_pagoda', 192, 0, 64, 48);
    // Blue-roofed Fashion Boutique (used if custom fashion_boutique.png is not in manifest)
    this.cropToTexture('na_houses', 'fashion_boutique', 256, 0, 48, 48);
    // Phum Night Club / Tavern building
    this.cropToTexture('na_houses', 'club_building', 304, 0, 64, 48);
    // Real Market Stall with awning (replaces blocky market_board!)
    this.cropToTexture('na_houses', 'market_board', 256, 256, 48, 32);
    // Real Lucky Wheel / Fortune Stall with goods awning
    this.cropToTexture('na_houses', 'lucky_wheel_kiosk', 304, 256, 48, 32);
    // Real Stone Blacksmith Forge Kiln & Anvil
    this.cropToTexture('na_houses', 'blacksmith_anvil', 496, 192, 32, 48);
    // Real Carved Stone Guardian Shrine (for Green Park Pylon Shrine & Dungeon Angkor Ward Statue!)
    this.cropToTexture('na_houses', 'pylon_shrine', 48, 240, 32, 32);
    this.cropToTexture('na_houses', 'angkor_ward_statue', 80, 240, 32, 32);
    // Real Golden Torii / Blessing Shrine Gate for Green Park Golden Blessing Shrine!
    this.cropToTexture('na_houses', 'golden_shrine', 0, 80, 48, 32);
    // Real Stone Bank / ATM Kiosk Vault house
    this.cropToTexture('na_houses', 'atm_kiosk', 368, 0, 48, 48);
    // Real Wooden Notice Signpost for Express Bus Stop
    this.cropToTexture('na_elements', 'bus_stop_sign', 96, 48, 16, 32);

    // Ninja Adventure Nature Trees (real tropical/golden trees if custom Khmer trees absent!)
    this.cropToTexture('na_nature', 'sugar_palm_tree', 48, 288, 48, 48);
    this.cropToTexture('na_nature', 'golden_durian_tree', 144, 288, 48, 48);

    // Ninja Adventure TilesetElement props
    this.cropToTexture('na_elements', 'na_bench', 32, 160, 48, 16);
    this.cropToTexture('na_elements', 'na_cart', 32, 48, 32, 32);
    this.cropToTexture('na_elements', 'na_lantern', 96, 48, 16, 32);
    this.cropToTexture('na_elements', 'na_pebbles', 16, 160, 16, 16);

    // Boss Treasure Bag -> real Ninja Adventure BigTreasureChest!
    this.cropToTexture('na_chest', 'boss_treasure_bag', 0, 0, 16, 14);

    // Real Boss Sprite Aliases (ZERO procedural boss rectangles!)
    // Boss #1: Sdech Kongkaeb -> uses real GiantFrog frame if custom khmer PNG not present
    this.cropToTexture('boss_giant_frog_idle', 'boss_sdech_kongkaeb', 0, 0, 40, 40);
    // Boss #2: Arp Prey Chrov -> uses real GiantSpirit frame
    this.cropToTexture('boss_giant_spirit_idle', 'boss_arp_prey_chrov', 0, 0, 50, 50);
    // Boss #6: Neak Reach -> uses real DragonGreen Head / Body / Tail!
    this.cropToTexture('boss_dragon_head', 'boss_neak_reach_head', 0, 0, 44, 46);
    this.cropToTexture('boss_dragon_body', 'boss_neak_reach_seg', 0, 0, 31, 27);
    this.cropToTexture('boss_dragon_tail', 'boss_neak_reach_tail', 0, 0, 29, 40);

    // Legacy Fantasy High Forest 2.3 (Cavern Dungeon parallax & tiles)
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

  private generateLightAndUiOverlays(): void {
    // Crisp Yellow Downward "JOIN" Arrow UI indicator
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

    // Soft radial ground shadow
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

    // Glowing portal vortex additive light
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

    // Warm radial flickering torch/campfire additive light
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

    // Cute pixel-art Green Village Bus (unique vehicle not in medieval packs)
    if (!this.textures.exists('village_bus')) {
      const tex = this.textures.createCanvas('village_bus', 80, 42);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#14532d';
        ctx.fillRect(10, 4, 58, 4);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(4, 8, 72, 24);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(6, 10, 68, 12);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(4, 21, 72, 5);
        ctx.fillStyle = '#e0f2fe';
        for (let wx = 10; wx <= 56; wx += 14) {
          ctx.fillRect(wx, 12, 10, 8);
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(wx, 17, 10, 3);
          ctx.fillStyle = '#e0f2fe';
        }
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(72, 24, 4, 5);
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
  }

  private registerAnimations(): void {
    // Register 4-directional walk animations for ALL 9 verified Ninja Adventure character sheets!
    const dirs: Array<[string, number[]]> = [
      ['down', [0, 4, 8, 12]],
      ['up', [1, 5, 9, 13]],
      ['left', [2, 6, 10, 14]],
      ['right', [3, 7, 11, 15]],
    ];
    for (const key of HERO_CHARACTER_SHEETS) {
      for (const [d, frames] of dirs) {
        const animKey = `${key}_walk_${d}`;
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: frames.map((frame) => ({ key, frame })),
            frameRate: 9,
            repeat: -1,
          });
        }
      }
    }

    // Legacy boy_walk_* aliases
    for (const [d, frames] of dirs) {
      const k = `boy_walk_${d}`;
      if (!this.anims.exists(k)) {
        this.anims.create({
          key: k,
          frames: frames.map((frame) => ({ key: 'player_boy', frame })),
          frameRate: 9,
          repeat: -1,
        });
      }
    }

    // Real Boss idle animations (GiantFrog 5 frames, GiantSpirit 5 frames)
    if (!this.anims.exists('boss_frog_idle')) {
      this.anims.create({
        key: 'boss_frog_idle',
        frames: [0, 1, 2, 3, 4].map((frame) => ({ key: 'boss_giant_frog_idle', frame })),
        frameRate: 7,
        repeat: -1,
      });
    }
    if (!this.anims.exists('boss_spirit_idle')) {
      this.anims.create({
        key: 'boss_spirit_idle',
        frames: [0, 1, 2, 3, 4].map((frame) => ({ key: 'boss_giant_spirit_idle', frame })),
        frameRate: 7,
        repeat: -1,
      });
    }

    // Real Pet animations
    const petAnims: Array<[string, string, number[], number]> = [
      ['pet_cat_idle', 'pet_cat_white', [0, 1], 4],
      ['pet_frog_idle', 'pet_frog', [0, 1], 5],
      ['pet_lioncub_idle', 'pet_lioncub', [0, 1], 5],
      ['pet_dog_idle', 'pet_dog', [0, 1], 5],
      ['pet_spirit_idle', 'pet_spirit', [0, 4, 8, 12], 7],
      ['pet_lantern_idle', 'pet_lantern', [0, 4, 8, 12], 7],
    ];
    for (const [animKey, texKey, frames, frameRate] of petAnims) {
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: frames.map((frame) => ({ key: texKey, frame })),
          frameRate,
          repeat: -1,
        });
      }
    }

    // Real Campfires, Shimmer Water Ripples & Slash FX
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
    if (!this.anims.exists('campfire_burn_32')) {
      this.anims.create({
        key: 'campfire_burn_32',
        frames: [0, 1, 2, 3].map((frame) => ({ key: 'sv_campfire_32', frame })),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists('shimmer_ripple')) {
      this.anims.create({
        key: 'shimmer_ripple',
        frames: [0, 1, 2, 3].map((frame) => ({ key: 'na_water_purple', frame })),
        frameRate: 5,
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
