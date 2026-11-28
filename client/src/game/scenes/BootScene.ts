import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE } from '@shared/types';

const NA = '/assets/packs/ninja-adventure/Ninja Adventure - Asset Pack';
const SV = '/assets/packs/serene-village/SERENE_VILLAGE_REVAMPED';
const LF = '/assets/packs/legacy-fantasy/Legacy-Fantasy - High Forest 2.3';

export class BootScene extends Phaser.Scene {
  private bootFinalized = false;
  private failsafeTimerId: number | null = null;

  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.bootFinalized = false;
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Update 3.0 — Spinning Golden Lotus Loader & Live % Progress Bar
    const lotusContainer = this.add.container(cx, cy - 58);
    const lotusHalo = this.add
      .circle(0, 0, 26, 0xfacc15, 0.22)
      .setStrokeStyle(2, 0xfde047, 0.75);
    lotusContainer.add(lotusHalo);
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI * 2 * i) / 8;
      const petal = this.add
        .ellipse(Math.cos(ang) * 14, Math.sin(ang) * 14, 14, 7, i % 2 === 0 ? 0xfacc15 : 0xf59e0b, 0.95)
        .setRotation(ang)
        .setStrokeStyle(1, 0xfef9c3, 0.85);
      lotusContainer.add(petal);
    }
    const lotusCore = this.add.circle(0, 0, 6, 0xfef9c3, 1).setStrokeStyle(1.5, 0xb45309);
    lotusContainer.add(lotusCore);
    const lotusSpin = this.tweens.add({
      targets: lotusContainer,
      angle: 360,
      duration: 2400,
      repeat: -1,
    });

    const barBg = this.add.rectangle(cx, cy + 8, 280, 16, 0x1e293b).setStrokeStyle(2, 0xf59e0b);
    const barFill = this.add.rectangle(cx - 136, cy + 8, 0, 10, 0xfacc15).setOrigin(0, 0.5);
    const label = this.add
      .text(cx, cy - 16, 'Loading ភូមិខ្ញុំ... 0%', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fef3c7',
      })
      .setOrigin(0.5);

    const cleanupLoaderUi = () => {
      lotusSpin.stop();
      if (lotusContainer.active) lotusContainer.destroy();
      if (barBg.active) barBg.destroy();
      if (barFill.active) barFill.destroy();
      if (label.active) label.destroy();
    };

    const clearFailsafe = () => {
      if (this.failsafeTimerId !== null && typeof window !== 'undefined') {
        window.clearTimeout(this.failsafeTimerId);
        this.failsafeTimerId = null;
      }
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, clearFailsafe);
    this.events.once(Phaser.Scenes.Events.DESTROY, clearFailsafe);

    // 5-second hard failsafe so the game NEVER freezes at ~95% even if an asset stalls on slow CDN/network
    if (typeof window !== 'undefined') {
      this.failsafeTimerId = window.setTimeout(() => {
        if (!this.bootFinalized && this.sys && this.scene?.isActive('BootScene')) {
          console.warn('[BootScene] 5s loader failsafe triggered — transitioning cleanly to OverworldScene.');
          cleanupLoaderUi();
          this.finalizeBoot();
        }
      }, 5000);
    }

    // Graceful fallback texture guard so a missing or slow PNG never renders a green/black broken box!
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn('[BootScene] Asset fallback generated for:', file.key, file.url);
      if (file.type === 'image' || file.type === 'spritesheet') {
        if (!this.textures.exists(file.key)) {
          const fb = this.textures.createCanvas(file.key, 32, 32);
          if (fb) {
            const ctx = fb.getContext();
            ctx.clearRect(0, 0, 32, 32);
            ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
            ctx.beginPath();
            ctx.arc(16, 16, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
            ctx.lineWidth = 2;
            ctx.stroke();
            fb.refresh();
          }
        }
      }
    });
    this.load.on('progress', (p: number) => {
      const pct = Math.max(0, Math.min(100, Math.round(p * 100)));
      if (barFill.active) barFill.width = 272 * p;
      if (label.active) label.setText(`Loading ភូមិខ្ញុំ... ${pct}%`);
    });
    this.load.once('complete', () => {
      cleanupLoaderUi();
    });

    // ---- 1. VILLAGE NPC SPRITE (Master Somnang Blacksmith — players use 10-layer Human Chibi PaperDoll!) ----
    this.load.spritesheet('char_master', `${NA}/Actor/Character/Master/SpriteSheet.png`, {
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
    this.load.image('na_floor', `${NA}/Backgrounds/Tilesets/TilesetFloor.png`);
    this.load.image('na_houses', `${NA}/Backgrounds/Tilesets/TilesetHouse.png`);
    this.load.image('na_nature', `${NA}/Backgrounds/Tilesets/TilesetNature.png`);
    this.load.image('na_water', `${NA}/Backgrounds/Tilesets/TilesetWater.png`);
    this.load.image('na_desert', `${NA}/Backgrounds/Tilesets/TilesetDesert.png`);
    this.load.image('na_abandoned', `${NA}/Backgrounds/Tilesets/TilesetVillageAbandoned.png`);
    this.load.image('na_boat', `${NA}/Backgrounds/Vehicles/Boat.png`);
    this.load.spritesheet('na_wf_top', `${NA}/Backgrounds/Animated/Waterfall/TopSheet16x16.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('na_wf_mid', `${NA}/Backgrounds/Animated/Waterfall/MiddleSheet16x16.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('na_wf_bot', `${NA}/Backgrounds/Animated/Waterfall/BottomSheet16x16.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('na_ripples', `${NA}/Backgrounds/Animated/Water Ripples/SpriteSheet16x16.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('na_flag_red', `${NA}/Backgrounds/Animated/Flag/FlagRed16x16.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.spritesheet('na_flag_yellow', `${NA}/Backgrounds/Animated/Flag/FlagYellow16x16.png`, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image('na_chest', `${NA}/Items/Treasure/BigTreasureChest.png`);
    this.load.image('na_anvil', `${NA}/Items/Tool/Anvil.png`);
    this.load.image('na_gold_coin', `${NA}/Items/Treasure/GoldCoin.png`);
    this.load.spritesheet('na_wheel_prop', `${NA}/Backgrounds/Animated/MillPropeller/MillPropeller_A_64x64.png`, {
      frameWidth: 64,
      frameHeight: 64,
    });
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

    // ---- 9. UPDATE 2.3: HIGH-DETAIL 4-FRAME ANIMATED PNG WINGS (48x48) & PETS (32x32) ----
    for (const wingKey of [
      'wings_bamboo_leaf_glider',
      'wings_golden_apsara_feathers',
      'wings_storm_crystal',
      'wings_celestial_naga_dragon',
      'wings_solar_angkor_seraph',
      'wings_void_phantom_butterfly',
    ]) {
      this.load.spritesheet(wingKey, `/assets/khmer/wings/${wingKey}.png`, {
        frameWidth: 48,
        frameHeight: 48,
      });
    }
    for (const petKey of [
      'pet_village_puppy',
      'pet_baby_water_buffalo',
      'pet_mini_golden_naga',
      'pet_celestial_lotus_kitsune',
      'pet_baby_angkor_singha',
    ]) {
      this.load.spritesheet(petKey, `/assets/khmer/pets/${petKey}.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
    }

    // ---- 10. HIGH-DETAIL CREATIVE PIXEL-ART MOUNT SPRITES (Transparent PNGs) ----
    for (const mountKey of [
      'mount_celestial_garuda',
      'mount_golden_cloud',
      'mount_royal_elephant',
      'mount_shadow_singha',
      'mount_spirit_dragon',
      'mount_bamboo_hoverboard',
    ]) {
      this.load.image(`mount_png_${mountKey}`, `/assets/khmer/mounts/${mountKey}.png`);
    }
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    try {
      const manifest = this.cache.json.get('khmer_manifest') as Record<string, string> | undefined;
      const extraEntries =
        manifest && typeof manifest === 'object'
          ? Object.entries(manifest).filter(
              ([key, url]) => typeof url === 'string' && !this.textures.exists(key)
            )
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
    } catch (err) {
      console.error('[BootScene] create() error — forcing transition to OverworldScene:', err);
      this.finalizeBoot();
    }
  }

  private finalizeBoot(): void {
    if (this.bootFinalized) return;
    this.bootFinalized = true;
    if (this.failsafeTimerId !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.failsafeTimerId);
      this.failsafeTimerId = null;
    }

    try {
      this.sliceAtlasSubTextures();
    } catch (err) {
      console.error('[BootScene] sliceAtlasSubTextures error:', err);
    }
    try {
      this.generateLightAndUiOverlays();
    } catch (err) {
      console.error('[BootScene] generateLightAndUiOverlays error:', err);
    }
    try {
      this.registerAnimations();
    } catch (err) {
      console.error('[BootScene] registerAnimations error:', err);
    }

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
    const srcTex = this.textures.get(srcKey);
    if (!srcTex || srcTex.key === '__MISSING') return;
    const srcImg = srcTex.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null;
    if (!srcImg) return;
    const imgW = 'naturalWidth' in srcImg ? srcImg.naturalWidth : srcImg.width;
    const imgH = 'naturalHeight' in srcImg ? srcImg.naturalHeight : srcImg.height;
    if (!imgW || !imgH) return;
    const canvasTex = this.textures.createCanvas(dstKey, sw, sh);
    if (!canvasTex) return;
    const ctx = canvasTex.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(srcImg, sx, sy, sw, sh, 0, 0, sw, sh);
    canvasTex.refresh();
  }

  private sliceAtlasSubTextures(): void {
    // 1. Clean Lush 64x64 Serene Village Meadow Grass (NO flat solid green, NO white noise speckles!)
    if (!this.textures.exists('sv_grass') && this.textures.exists('serene_16')) {
      const svImg = this.textures.get('serene_16').getSourceImage() as HTMLImageElement;
      const naNature = this.textures.exists('na_nature')
        ? (this.textures.get('na_nature').getSourceImage() as HTMLImageElement)
        : null;
      const tex = this.textures.createCanvas('sv_grass', 64, 64);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        // Fill 4x4 base Serene Village grass tiles
        for (let gy = 0; gy < 64; gy += 16) {
          for (let gx = 0; gx < 64; gx += 16) {
            ctx.drawImage(svImg, 48, 0, 16, 16, gx, gy, 16, 16);
          }
        }
        // Subtle green pixel-art grass blades & clover (pure lush greens — zero white static)
        if (naNature) {
          ctx.globalAlpha = 0.55;
          ctx.drawImage(naNature, 48, 160, 16, 16, 6, 8, 12, 12);
          ctx.drawImage(naNature, 96, 160, 16, 16, 38, 28, 12, 12);
          ctx.drawImage(naNature, 32, 176, 16, 16, 18, 46, 11, 11);
          ctx.globalAlpha = 1;
        }
        tex.refresh();
      }
    }

    // 2. Clean Interior Dirt Road (Serene Village pure sand-dirt interior — ZERO green edges/nubs!)
    if (!this.textures.exists('sv_path') && this.textures.exists('serene_16')) {
      const svImg = this.textures.get('serene_16').getSourceImage() as HTMLImageElement;
      const tex = this.textures.createCanvas('sv_path', 32, 32);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        for (let py = 0; py < 32; py += 16) {
          for (let px = 0; px < 32; px += 16) {
            ctx.drawImage(svImg, 272, 64, 16, 16, px, py, 16, 16);
          }
        }
        // Subtle warm sandstone grain specks so the road feels organic and hand-pixelled
        ctx.fillStyle = '#d4b262';
        ctx.fillRect(5, 6, 2, 1);
        ctx.fillRect(21, 14, 2, 1);
        ctx.fillRect(11, 25, 2, 1);
        ctx.fillStyle = '#f3e39a';
        ctx.fillRect(18, 4, 2, 1);
        ctx.fillRect(4, 21, 2, 1);
        ctx.fillRect(26, 27, 2, 1);
        tex.refresh();
      }
    }
    // Clean interior stone courtyard tile (verified ZERO green/edge pixels!)
    this.cropToTexture('na_floor', 'sv_plaza_tile', 200, 248, 16, 16);
    // Real colorful pixel-art meadow flowers (sunflowers, clover, red tulips from TilesetNature!)
    this.cropToTexture('na_nature', 'sv_flowers', 0, 176, 64, 16);
    // Real pixel-art bordered village pond from Serene Village!
    this.cropToTexture('serene_16', 'sv_pond', 176, 0, 48, 48);
    // Real pixel-art flower cluster blossoms from Serene Village!
    this.cropToTexture('serene_16', 'sv_blossoms', 32, 192, 64, 16);
    // Real pixel-art crates & produce goods to sit under Market / Lucky Wheel awnings!
    this.cropToTexture('na_houses', 'market_goods_a', 256, 224, 48, 24);
    this.cropToTexture('na_houses', 'market_goods_b', 304, 224, 48, 24);
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

    // Interconnected Khmer World Gateway & Cultural Landmark Props (100% Cohesive Ninja Adventure Tilesets!)
    this.cropToTexture('na_houses', 'angkor_arch_gate', 464, 320, 64, 48);
    this.cropToTexture('na_water', 'na_water_tile', 16, 16, 16, 16);
    this.cropToTexture('na_water', 'na_boardwalk_tile', 64, 192, 32, 32);
    this.cropToTexture('na_desert', 'na_palm_tree', 160, 144, 32, 48);
    this.cropToTexture('na_desert', 'na_singha_statue', 0, 144, 32, 48);
    this.cropToTexture('na_desert', 'na_lion_fountain', 0, 96, 32, 48);
    this.cropToTexture('na_desert', 'na_coastal_stall_a', 32, 160, 32, 32);
    this.cropToTexture('na_desert', 'na_coastal_stall_b', 64, 160, 32, 32);
    this.cropToTexture('na_desert', 'na_stone_well', 0, 48, 32, 32);
    this.cropToTexture('na_abandoned', 'na_ruin_wall', 0, 0, 64, 48);
    this.cropToTexture('na_abandoned', 'na_ruin_statue', 0, 48, 32, 48);
    this.cropToTexture('na_abandoned', 'na_ruin_pillar', 32, 48, 16, 48);
    this.cropToTexture('na_abandoned', 'na_ruin_frog', 144, 80, 32, 32);
    this.cropToTexture('na_abandoned', 'na_ruin_sanctuary', 256, 80, 64, 80);

    // Coastal sandy ground tile (clean 32x32 golden beach sand)
    if (!this.textures.exists('coastal_sand_tile') && this.textures.exists('na_floor')) {
      this.cropToTexture('na_floor', 'coastal_sand_tile', 16, 16, 32, 32);
    }
    // Rice paddy golden-green meadow tile (Battambang Rice Bowl)
    if (!this.textures.exists('rice_paddy_tile') && this.textures.exists('serene_16')) {
      const svImg = this.textures.get('serene_16').getSourceImage() as HTMLImageElement;
      const tex = this.textures.createCanvas('rice_paddy_tile', 64, 64);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        for (let gy = 0; gy < 64; gy += 16) {
          for (let gx = 0; gx < 64; gx += 16) {
            ctx.drawImage(svImg, 48, 0, 16, 16, gx, gy, 16, 16);
          }
        }
        // Subtle sunlit golden rice stalks woven into Battambang paddy grass
        ctx.fillStyle = 'rgba(250, 204, 21, 0.24)';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#ca8a04';
        for (const [rx, ry] of [[8, 10], [24, 14], [42, 8], [14, 38], [36, 44], [52, 32]]) {
          ctx.fillRect(rx, ry, 2, 5);
          ctx.fillRect(rx + 3, ry + 1, 2, 4);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(rx, ry, 2, 2);
          ctx.fillStyle = '#ca8a04';
        }
        tex.refresh();
      }
    }

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
    // Transparent 16x16 Arcade Physics hitbox anchor for Human Chibi Player
    if (!this.textures.exists('player_collider')) {
      const tex = this.textures.createCanvas('player_collider', 16, 16);
      if (tex) {
        tex.refresh();
      }
    }

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

    // Cohesive 16-bit Pixel-Art Khmer Express Coach Bus (matching #2b1b17 1px outlines & warm village palette!)
    if (!this.textures.exists('village_bus')) {
      const tex = this.textures.createCanvas('village_bus', 68, 38);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        const O = '#2b1b17';
        // Luggage rack on top
        ctx.fillStyle = O;
        ctx.fillRect(14, 2, 38, 5);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(15, 3, 12, 3);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(29, 3, 10, 3);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(41, 3, 10, 3);
        // Main coach body outline
        ctx.fillStyle = O;
        ctx.fillRect(4, 6, 60, 24);
        ctx.fillRect(6, 5, 56, 2);
        // Roof highlight (warm cream-ivory like Khmer heritage coaches)
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(6, 7, 56, 4);
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(6, 10, 56, 2);
        // Upper green body band
        ctx.fillStyle = '#15803d';
        ctx.fillRect(5, 12, 58, 10);
        // Shaded lower teal-emerald skirt
        ctx.fillStyle = '#166534';
        ctx.fillRect(5, 22, 58, 7);
        // Royal Khmer gold accent stripe
        ctx.fillStyle = '#facc15';
        ctx.fillRect(5, 20, 58, 3);
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(5, 22, 58, 1);
        // Crisp outlined windows with sky reflection
        for (let wx = 9; wx <= 49; wx += 11) {
          ctx.fillStyle = O;
          ctx.fillRect(wx, 11, 9, 8);
          ctx.fillStyle = '#7dd3fc';
          ctx.fillRect(wx + 1, 12, 7, 6);
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(wx + 1, 12, 4, 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(wx + 1, 16, 7, 2);
        }
        // Front windshield & glowing headlight
        ctx.fillStyle = O;
        ctx.fillRect(58, 11, 5, 8);
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(59, 12, 3, 6);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(61, 22, 3, 4);
        // Rear brake light & chrome bumpers
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(4, 22, 2, 3);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(3, 27, 62, 2);
        // Outlined spoked wheels
        for (const wx of [13, 46]) {
          ctx.fillStyle = O;
          ctx.fillRect(wx, 27, 10, 10);
          ctx.fillStyle = '#334155';
          ctx.fillRect(wx + 1, 28, 8, 8);
          ctx.fillStyle = '#eab308';
          ctx.fillRect(wx + 3, 30, 4, 4);
          ctx.fillStyle = '#fef9c3';
          ctx.fillRect(wx + 4, 31, 2, 2);
        }
        tex.refresh();
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    // Battambang Norry Bamboo Train (Authentic Cambodian motorized bamboo rail platform!)
    if (!this.textures.exists('norry_bamboo_train')) {
      const tex = this.textures.createCanvas('norry_bamboo_train', 56, 28);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        const O = '#2b1b17';
        // Woven bamboo deck & rattan cushions
        ctx.fillStyle = O;
        ctx.fillRect(3, 11, 50, 10);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(4, 12, 48, 8);
        for (let bx = 6; bx < 50; bx += 4) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(bx, 12, 2, 8);
        }
        // Checkered red-white Krama passenger cushion mat
        ctx.fillStyle = O;
        ctx.fillRect(10, 7, 24, 5);
        for (let kx = 11; kx < 33; kx += 2) {
          ctx.fillStyle = kx % 4 === 1 ? '#dc2626' : '#fef3c7';
          ctx.fillRect(kx, 8, 2, 3);
        }
        // Small rear motor & exhaust handle
        ctx.fillStyle = O;
        ctx.fillRect(38, 6, 11, 7);
        ctx.fillStyle = '#475569';
        ctx.fillRect(39, 7, 9, 5);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(40, 8, 4, 2);
        // Steel railway wheels
        for (const wx of [10, 40]) {
          ctx.fillStyle = O;
          ctx.fillRect(wx, 20, 7, 7);
          ctx.fillStyle = '#64748b';
          ctx.fillRect(wx + 1, 21, 5, 5);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(wx + 2, 22, 3, 3);
        }
        tex.refresh();
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    // Modular 16-bit Bamboo Railway Tracks (Horizontal & Vertical — seamless timber sleepers + steel rails!)
    if (!this.textures.exists('railway_track_h')) {
      const tex = this.textures.createCanvas('railway_track_h', 32, 24);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = 'rgba(120, 82, 48, 0.55)';
        ctx.fillRect(0, 2, 32, 20);
        // Timber sleepers
        for (let sx = 2; sx < 32; sx += 8) {
          ctx.fillStyle = '#2b1b17';
          ctx.fillRect(sx, 3, 5, 18);
          ctx.fillStyle = '#854d0e';
          ctx.fillRect(sx + 1, 4, 3, 16);
          ctx.fillStyle = '#a16207';
          ctx.fillRect(sx + 1, 4, 2, 14);
        }
        // Dual steel rails
        for (const ry of [6, 15]) {
          ctx.fillStyle = '#2b1b17';
          ctx.fillRect(0, ry, 32, 3);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(0, ry + 1, 32, 1);
        }
        tex.refresh();
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    if (!this.textures.exists('railway_track_v')) {
      const tex = this.textures.createCanvas('railway_track_v', 24, 32);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = 'rgba(120, 82, 48, 0.55)';
        ctx.fillRect(2, 0, 20, 32);
        for (let sy = 2; sy < 32; sy += 8) {
          ctx.fillStyle = '#2b1b17';
          ctx.fillRect(3, sy, 18, 5);
          ctx.fillStyle = '#854d0e';
          ctx.fillRect(4, sy + 1, 16, 3);
          ctx.fillStyle = '#a16207';
          ctx.fillRect(4, sy + 1, 14, 2);
        }
        for (const rx of [6, 15]) {
          ctx.fillStyle = '#2b1b17';
          ctx.fillRect(rx, 0, 3, 32);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(rx + 1, 0, 1, 32);
        }
        tex.refresh();
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    // Open Wooden Village Fence Gate (matching Serene Village warm timber fence palette!)
    if (!this.textures.exists('wood_fence_gate')) {
      const tex = this.textures.createCanvas('wood_fence_gate', 56, 36);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        const O = '#2b1b17';
        // Left & right carved timber gate posts with hanging lanterns
        for (const gx of [4, 42]) {
          ctx.fillStyle = O;
          ctx.fillRect(gx, 4, 10, 30);
          ctx.fillStyle = '#92400e';
          ctx.fillRect(gx + 1, 5, 8, 28);
          ctx.fillStyle = '#b45309';
          ctx.fillRect(gx + 2, 6, 4, 25);
          // Golden cap
          ctx.fillStyle = '#facc15';
          ctx.fillRect(gx + 1, 5, 8, 3);
        }
        // Overhead wooden lintel beam with Khmer gold ornament
        ctx.fillStyle = O;
        ctx.fillRect(2, 2, 52, 7);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(3, 3, 50, 5);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(22, 4, 12, 3);
        // Open swung fence doors flanking the walkable entryway
        ctx.fillStyle = O;
        ctx.fillRect(13, 18, 6, 14);
        ctx.fillRect(37, 18, 6, 14);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(14, 19, 4, 12);
        ctx.fillRect(38, 19, 4, 12);
        tex.refresh();
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
  }

  private safeCreateAnim(
    animKey: string,
    texKey: string,
    frames: number[],
    frameRate: number,
    repeat: number
  ): void {
    if (this.anims.exists(animKey) || !this.textures.exists(texKey)) return;
    const tex = this.textures.get(texKey);
    if (!tex || tex.key === '__MISSING') return;
    const validFrames = frames.filter((f) => tex.has(String(f)));
    if (validFrames.length === 0) {
      console.warn(`[BootScene] Skipping anim "${animKey}": texture "${texKey}" has no matching frames.`);
      return;
    }
    this.anims.create({
      key: animKey,
      frames: validFrames.map((frame) => ({ key: texKey, frame })),
      frameRate,
      repeat,
    });
  }

  private registerAnimations(): void {
    // Real Boss idle animations (GiantFrog 5 frames, GiantSpirit 5 frames)
    this.safeCreateAnim('boss_frog_idle', 'boss_giant_frog_idle', [0, 1, 2, 3, 4], 7, -1);
    this.safeCreateAnim('boss_spirit_idle', 'boss_giant_spirit_idle', [0, 1, 2, 3, 4], 7, -1);

    // Real Pet animations (Ninja Adventure + Update 2.3 4-Frame Animated Khmer PNG Pets!)
    const petAnims: Array<[string, string, number[], number]> = [
      ['pet_cat_idle', 'pet_cat_white', [0, 1], 4],
      ['pet_frog_idle', 'pet_frog', [0, 1], 5],
      ['pet_lioncub_idle', 'pet_lioncub', [0, 1], 5],
      ['pet_dog_idle', 'pet_dog', [0, 1], 5],
      ['pet_spirit_idle', 'pet_spirit', [0, 4, 8, 12], 7],
      ['pet_lantern_idle', 'pet_lantern', [0, 4, 8, 12], 7],
      ['pet_village_puppy_anim', 'pet_village_puppy', [0, 1, 2, 3], 6],
      ['pet_baby_water_buffalo_anim', 'pet_baby_water_buffalo', [0, 1, 2, 3], 5],
      ['pet_mini_golden_naga_anim', 'pet_mini_golden_naga', [0, 1, 2, 3], 7],
      ['pet_celestial_lotus_kitsune_anim', 'pet_celestial_lotus_kitsune', [0, 1, 2, 3], 6],
      ['pet_baby_angkor_singha_anim', 'pet_baby_angkor_singha', [0, 1, 2, 3], 6],
    ];
    for (const [animKey, texKey, frames, frameRate] of petAnims) {
      this.safeCreateAnim(animKey, texKey, frames, frameRate, -1);
    }

    // Update 2.3 — High-Detail 4-Frame Animated PNG Wings (flapping loop!)
    for (const [wingKey, fps] of [
      ['wings_bamboo_leaf_glider', 6],
      ['wings_golden_apsara_feathers', 7],
      ['wings_storm_crystal', 8],
      ['wings_celestial_naga_dragon', 7],
      ['wings_solar_angkor_seraph', 6],
      ['wings_void_phantom_butterfly', 8],
    ] as Array<[string, number]>) {
      this.safeCreateAnim(`${wingKey}_anim`, wingKey, [0, 1, 2, 3], fps, -1);
    }

    // Real Campfires, Shimmer Water Ripples, Lucky Wheel & Slash FX
    this.safeCreateAnim('slash_curved', 'fx_slash', [0, 1, 2, 3], 22, 0);
    this.safeCreateAnim('campfire_burn', 'sv_campfire_16', [0, 1, 2, 3], 7, -1);
    this.safeCreateAnim('campfire_burn_32', 'sv_campfire_32', [0, 1, 2, 3], 8, -1);
    this.safeCreateAnim('shimmer_ripple', 'na_water_purple', [0, 1, 2, 3], 5, -1);
    this.safeCreateAnim('lucky_wheel_spin', 'na_wheel_prop', [0, 1, 2, 3], 5, -1);
    this.safeCreateAnim('wf_top', 'na_wf_top', [0, 1, 2, 3, 4], 8, -1);
    this.safeCreateAnim('wf_mid', 'na_wf_mid', [0, 1, 2, 3, 4], 8, -1);
    this.safeCreateAnim('wf_bot', 'na_wf_bot', [0, 1, 2], 8, -1);
    this.safeCreateAnim('water_ripples_blue', 'na_ripples', [0, 1, 2, 3], 5, -1);
    this.safeCreateAnim('flag_red_wave', 'na_flag_red', [0, 1, 2, 3], 6, -1);
    this.safeCreateAnim('flag_yellow_wave', 'na_flag_yellow', [0, 1, 2, 3], 6, -1);
    this.safeCreateAnim('boar_idle_anim', 'boar_idle', [0, 1, 2, 3], 6, -1);
    this.safeCreateAnim('boar_hit_anim', 'boar_hit', [0, 1, 2, 3], 14, 0);
  }
}
