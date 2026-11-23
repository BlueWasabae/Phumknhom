import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PlayerState } from '@shared/types';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';

// Cozy 16x16 Stardew-scale village world (60 x 42 tiles) rendered at 2.5x - 2.9x camera zoom
const MAP_W = 960;
const MAP_H = 672;
const HORIZON_H = 82;

interface LandmarkZone {
  x: number;
  y: number;
  radius: number;
  label: string;
  isDungeonPortal: boolean;
  onInteract: () => void;
}

export class OverworldScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private player!: Player;
  private promptText!: Phaser.GameObjects.Text;
  private colliders!: Phaser.Physics.Arcade.StaticGroup;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };
  private landmarks: LandmarkZone[] = [];
  private nearPortalSent = false;
  private transitioning = false;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('OverworldScene');
  }

  init(data?: { playerState?: PlayerState }): void {
    this.initialState = data?.playerState
      ? { ...data.playerState, zone: 'overworld', weapon: { ...data.playerState.weapon } }
      : { ...INITIAL_PLAYER_STATE, zone: 'overworld', weapon: { ...INITIAL_PLAYER_STATE.weapon } };
    this.landmarks = [];
    this.nearPortalSent = false;
    this.transitioning = false;
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    // Stardew / Avatar World Mode: Top-Down 2.5D (gravity = 0)
    this.physics.world.gravity.y = 0;
    this.physics.world.setBounds(0, HORIZON_H, MAP_W, MAP_H - HORIZON_H);

    // 1. 2.5D Top Horizon Strip (Sky + Distant Mountain Treeline along north border)
    this.buildTopHorizonStrip();

    // 2. Real Textured 16x16 Serene Village Grass + Wildflower & Pebble Variations
    this.add
      .tileSprite(MAP_W / 2, HORIZON_H + (MAP_H - HORIZON_H) / 2, MAP_W, MAP_H - HORIZON_H, 'sv_grass')
      .setDepth(0);

    // 3. Bordered Dirt/Stone Village Paths + Proper Central Village Plaza Courtyard
    this.buildBorderedPathsAndPlaza();

    this.colliders = this.physics.add.staticGroup();
    this.buildLandmarks();
    this.buildFencesAndTrees();

    // 4. Real 4-directional Animated Chibi Player + Soft Shadow
    this.player = new Player(this, 480, 405, this.initialState, 'overworld');
    this.physics.add.collider(this.player.sprite, this.colliders);

    this.promptText = this.add
      .text(0, 0, '', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: { x: 10, y: 5 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 1)
      .setDepth(2600)
      .setVisible(false);

    // 5. Crisp Stardew Camera Zoom (2.5x - 2.9x based on screen width) + Resize Handler
    this.applyResponsiveZoom();
    this.scale.on('resize', this.applyResponsiveZoom, this);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.fadeIn(240, 10, 14, 24);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E') as Record<
      'W' | 'A' | 'S' | 'D' | 'E',
      Phaser.Input.Keyboard.Key
    >;

    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.joystick = vec;
      }),
      EventBus.on('player:chat', ({ text }) => {
        this.player.showSpeechBubble(text, 4500);
      }),
      EventBus.on('player:emote', ({ emoji }) => {
        this.player.showEmote(emoji, 3000);
      }),
      EventBus.on('input:interact', () => {
        this.tryInteractNearest();
      })
    );

    EventBus.emit('scene:ready', { zone: 'overworld' });
    EventBus.emit('player:state', this.player.state);
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: 'dungeon' });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.applyResponsiveZoom, this);
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.player.destroy();
    });
  }

  private applyResponsiveZoom = (): void => {
    const w = this.scale.width;
    const zoom = w < 640 ? 2.4 : w < 1100 ? 2.65 : 2.95;
    this.cameras.main.setZoom(zoom);
  };

  private buildTopHorizonStrip(): void {
    // Warm tropical morning sky along north edge (y = 0..82)
    this.add
      .tileSprite(MAP_W / 2, HORIZON_H / 2, MAP_W, HORIZON_H, 'lf_sky')
      .setTileScale(0.65, 0.35)
      .setDepth(0);

    // Distant lush treeline silhouette separating sky and village grass
    this.add
      .tileSprite(MAP_W / 2, HORIZON_H - 18, MAP_W, 74, 'lf_parallax_far')
      .setTileScale(0.42, 0.36)
      .setTint(0x2f7d4d)
      .setDepth(1);

    // Crisp grass hedge line at y = HORIZON_H
    const rim = this.add.graphics().setDepth(2);
    rim.fillStyle(0x2d6a3e, 1);
    rim.fillRect(0, HORIZON_H - 5, MAP_W, 7);
  }

  private buildBorderedPathsAndPlaza(): void {
    const borderGfx = this.add.graphics().setDepth(1);

    // Warm dark-earth road trim under horizontal & vertical village paths
    borderGfx.fillStyle(0x8d6339, 0.85);
    borderGfx.fillRoundedRect(130, 344, 700, 56, 8);
    borderGfx.fillRoundedRect(450, 150, 60, 420, 8);
    // Cobblestone Central Village Plaza trim
    borderGfx.fillStyle(0x7c5b3b, 0.9);
    borderGfx.fillRoundedRect(388, 304, 184, 132, 10);

    // Textured Serene Village dirt roads
    this.add.tileSprite(480, 372, 692, 48, 'sv_path').setDepth(2);
    this.add.tileSprite(480, 360, 52, 412, 'sv_path').setDepth(2);

    // Proper Central Village Plaza Courtyard (sandstone/cobblestone tiles — no flat circle!)
    this.add.tileSprite(480, 370, 176, 124, 'sv_plaza_tile').setDepth(3);

    // Subtle cobblestone plaza inner frame
    const plazaLine = this.add.graphics().setDepth(4);
    plazaLine.lineStyle(1.5, 0xd6b47c, 0.9);
    plazaLine.strokeRoundedRect(394, 310, 172, 118, 6);

    // Scatter wildflower meadows & pebbles across the village grass
    const flowerSpots = [
      [180, 290], [320, 455], [640, 455], [785, 295], [340, 265], [610, 265],
    ];
    for (const [fx, fy] of flowerSpots) {
      this.add.image(fx, fy, 'sv_flowers').setDepth(3).setAlpha(0.92);
    }
    const pebbleSpots = [
      [410, 326], [548, 324], [412, 416], [546, 414], [250, 368], [710, 368],
    ];
    for (const [px, py] of pebbleSpots) {
      this.add.image(px, py, 'na_pebbles').setDepth(4).setAlpha(0.85);
    }

    // Animated Central Plaza Campfire + Warm Glow + Cozy Benches + Lanterns
    this.add.image(480, 368, 'torch_glow').setScale(0.7).setDepth(5).setAlpha(0.55);
    const fire = this.add.sprite(480, 365, 'sv_campfire_16', 0).setScale(1.15).setDepth(365);
    fire.play('campfire_burn');

    // Cozy Village Park Benches facing the courtyard
    this.add.image(432, 342, 'soft_shadow').setScale(0.75, 0.35).setDepth(340);
    this.add.image(432, 340, 'na_bench').setDepth(341);
    this.add.image(528, 342, 'soft_shadow').setScale(0.75, 0.35).setDepth(340);
    this.add.image(528, 340, 'na_bench').setDepth(341);

    // Decorative Plaza Lantern Posts
    for (const [lx, ly] of [[400, 318], [560, 318], [400, 422], [560, 422]]) {
      this.add.image(lx, ly + 6, 'soft_shadow').setScale(0.28, 0.2).setDepth(ly);
      this.add.image(lx, ly, 'na_lantern').setOrigin(0.5, 0.85).setDepth(ly + 1);
    }
  }

  private addBuildingOrProp(opts: {
    texture: string;
    x: number;
    y: number;
    scale?: number;
    shadowW?: number;
    shadowH?: number;
    bodyW?: number;
    bodyH?: number;
    label?: string;
    joinArrowY?: number;
  }): Phaser.GameObjects.Image {
    const scale = opts.scale ?? 1;
    // Soft dark oval ground shadow under every prop/house/tree
    if (opts.shadowW && opts.shadowH) {
      this.add
        .image(opts.x, opts.y - 2, 'soft_shadow')
        .setDisplaySize(opts.shadowW, opts.shadowH)
        .setDepth(opts.y - 4);
    }

    const img = this.add.image(opts.x, opts.y, opts.texture).setOrigin(0.5, 0.92).setScale(scale);
    img.setDepth(opts.y);

    if (opts.bodyW && opts.bodyH) {
      const col = this.add.rectangle(opts.x, opts.y - opts.bodyH / 2 - 2, opts.bodyW, opts.bodyH, 0x000000, 0);
      this.colliders.add(col);
    }

    if (opts.label) {
      this.add
        .text(opts.x, opts.y + 4, opts.label, {
          fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#fef9c3',
          backgroundColor: 'rgba(15, 23, 42, 0.84)',
          padding: { x: 7, y: 2 },
        })
        .setResolution(2)
        .setScale(0.45)
        .setOrigin(0.5, 0)
        .setDepth(opts.y + 8);
    }

    if (typeof opts.joinArrowY === 'number') {
      const arrow = this.add.image(opts.x, opts.joinArrowY, 'join_arrow').setScale(0.56).setDepth(opts.y + 50);
      this.tweens.add({
        targets: arrow,
        y: opts.joinArrowY - 6,
        duration: 560,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    return img;
  }

  private buildLandmarks(): void {
    // 1. AREA 0 Wooden Street Sign at Plaza Entrance
    this.addBuildingOrProp({
      texture: 'sv_sign_wood',
      x: 416,
      y: 374,
      scale: 1.15,
      shadowW: 18,
      shadowH: 7,
      bodyW: 14,
      bodyH: 8,
    });
    this.add
      .text(416, 349, 'AREA 0', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#1d4ed8',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.44)
      .setOrigin(0.5)
      .setDepth(390);
    this.landmarks.push({
      x: 416,
      y: 378,
      radius: 34,
      label: 'AREA 0 Channel Sign (Online Channels in Phase 6)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:toast', { text: 'Phum Village • AREA 0 (Multiplayer sync arrives in Phase 6)' }),
    });

    // 2. FARM — Green-Roof Farmhouse + Wooden Fence Garden Pen (Top-Left)
    this.addBuildingOrProp({
      texture: 'sv_house_green',
      x: 205,
      y: 224,
      scale: 1.15,
      shadowW: 86,
      shadowH: 24,
      bodyW: 66,
      bodyH: 30,
      label: 'FARM GATE',
      joinArrowY: 148,
    });
    this.addBuildingOrProp({
      texture: 'sv_fence_pen',
      x: 286,
      y: 234,
      scale: 1.0,
      shadowW: 54,
      shadowH: 16,
      bodyW: 44,
      bodyH: 26,
    });
    this.landmarks.push({
      x: 205,
      y: 234,
      radius: 48,
      label: 'Personal Farm Gate (Stardew Farming unlocks in Phase 3)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:toast', { text: 'FARM Gate — Crop planting, watering & timers arrive in Phase 3!' }),
    });

    // 3. SNACK CART — Cozy Red-Roof Stall + Ninja Adventure Wooden Cart + Noodle Emblem (Center-Left)
    this.addBuildingOrProp({
      texture: 'sv_house_red',
      x: 255,
      y: 356,
      scale: 1.15,
      shadowW: 66,
      shadowH: 20,
      bodyW: 50,
      bodyH: 26,
      label: 'SNACK CART',
      joinArrowY: 278,
    });
    this.addBuildingOrProp({
      texture: 'na_cart',
      x: 205,
      y: 360,
      scale: 0.95,
      shadowW: 32,
      shadowH: 12,
      bodyW: 24,
      bodyH: 14,
    });
    this.add.image(255, 294, 'icon_noodle').setScale(0.9).setDepth(370);
    this.landmarks.push({
      x: 255,
      y: 368,
      radius: 48,
      label: 'Khmer Street Snack Cart (Phase 4)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:toast', { text: 'SNACK CART — Num Pang & Kafé combat buffs arrive in Phase 4!' }),
    });

    // 4. FASHION SHOP — Blue-Roof Boutique + Flower Boxes (Center-Right)
    this.addBuildingOrProp({
      texture: 'sv_house_blue',
      x: 705,
      y: 356,
      scale: 1.15,
      shadowW: 86,
      shadowH: 24,
      bodyW: 66,
      bodyH: 30,
      label: 'FASHION SHOP',
      joinArrowY: 276,
    });
    this.add.image(705, 370, 'sv_flower_box').setScale(0.85).setDepth(370);
    this.landmarks.push({
      x: 705,
      y: 368,
      radius: 50,
      label: 'Plaza Fashion Boutique (Paper-Doll Outfits in Phase 2)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:toast', { text: 'FASHION SHOP — 9-Layer Modular Paper-Doll unlocks in Phase 2!' }),
    });

    // 5. DUNGEON PORTAL — Legacy Fantasy Cave/Temple Archway + Swirling Vortex + Bouncing JOIN Arrow (Top-Right)
    this.addBuildingOrProp({
      texture: 'lf_cave_entrance',
      x: 745,
      y: 234,
      scale: 0.62,
      shadowW: 84,
      shadowH: 22,
      bodyW: 56,
      bodyH: 24,
      label: 'DUNGEON PORTAL',
      joinArrowY: 132,
    });
    const vortex = this.add.image(752, 200, 'portal_vortex').setScale(0.75).setDepth(238);
    this.tweens.add({
      targets: vortex,
      alpha: 0.52,
      scale: 0.88,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.landmarks.push({
      x: 745,
      y: 246,
      radius: 54,
      label: 'Press [E] or Tap JOIN → Enter Ancient Cavern',
      isDungeonPortal: true,
      onInteract: () => this.enterDungeon(),
    });
  }

  private buildFencesAndTrees(): void {
    // Decorative wooden fences framing the north & south village edges
    for (const fx of [360, 400, 560, 600]) {
      this.addBuildingOrProp({
        texture: 'sv_fence_h',
        x: fx,
        y: 162,
        shadowW: 32,
        shadowH: 8,
        bodyW: 30,
        bodyH: 10,
      });
    }

    // Layered Y-sorted perimeter trees with soft oval ground shadows
    const trees: Array<[number, number, 'sv_tree_green' | 'sv_tree_teal']> = [
      [74, 165, 'sv_tree_green'], [118, 195, 'sv_tree_teal'], [72, 315, 'sv_tree_teal'],
      [82, 460, 'sv_tree_green'], [138, 565, 'sv_tree_teal'], [285, 560, 'sv_tree_green'],
      [370, 585, 'sv_tree_teal'], [595, 585, 'sv_tree_green'], [695, 560, 'sv_tree_teal'],
      [830, 555, 'sv_tree_green'], [878, 445, 'sv_tree_teal'], [885, 310, 'sv_tree_green'],
      [875, 180, 'sv_tree_teal'], [575, 138, 'sv_tree_green'], [390, 136, 'sv_tree_teal'],
    ];
    for (const [tx, ty, tex] of trees) {
      this.addBuildingOrProp({
        texture: tex,
        x: tx,
        y: ty,
        scale: 1.1,
        shadowW: 36,
        shadowH: 12,
        bodyW: 16,
        bodyH: 12,
      });
    }
  }

  private enterDungeon(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(220, 8, 10, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('DungeonBossScene', {
        playerState: {
          ...this.player.state,
          zone: 'dungeon',
          weapon: { ...this.player.state.weapon },
        },
      });
    });
  }

  private findNearestLandmark(): LandmarkZone | null {
    let best: LandmarkZone | null = null;
    let bestDist = Infinity;
    for (const lm of this.landmarks) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, lm.x, lm.y);
      if (d <= lm.radius && d < bestDist) {
        bestDist = d;
        best = lm;
      }
    }
    return best;
  }

  private tryInteractNearest(): void {
    const lm = this.findNearestLandmark();
    if (lm) {
      lm.onInteract();
    } else {
      EventBus.emit('ui:toast', { text: 'Walk closer to the Dungeon Portal (top-right) or a Village landmark!' });
    }
  }

  update(time: number): void {
    const typing =
      document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

    let vx = this.joystick.x;
    let vy = this.joystick.y;

    if (!typing && !this.transitioning) {
      if (this.cursors.left.isDown || this.keys.A.isDown) vx -= 1;
      if (this.cursors.right.isDown || this.keys.D.isDown) vx += 1;
      if (this.cursors.up.isDown || this.keys.W.isDown) vy -= 1;
      if (this.cursors.down.isDown || this.keys.S.isDown) vy += 1;

      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.tryInteractNearest();
      }
    }

    const len = Math.hypot(vx, vy);
    if (len > 0.1) {
      const speed = 115; // Crisp Stardew walk speed tuned for 16x16 zoomed world
      const nx = vx / Math.max(1, len);
      const ny = vy / Math.max(1, len);
      this.player.body.setVelocity(nx * speed, ny * speed);

      if (Math.abs(nx) >= Math.abs(ny)) {
        this.player.facing = nx < 0 ? 'left' : 'right';
      } else {
        this.player.facing = ny < 0 ? 'up' : 'down';
      }
      this.player.playStateAnimation('walk');
    } else {
      this.player.body.setVelocity(0, 0);
      this.player.playStateAnimation('idle');
    }

    this.player.syncVisuals(time, true);

    const nearest = this.findNearestLandmark();
    if (nearest) {
      this.promptText.setPosition(nearest.x, nearest.y - 34);
      this.promptText.setText(nearest.label).setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }

    const nearDungeon = Boolean(nearest?.isDungeonPortal);
    if (nearDungeon !== this.nearPortalSent) {
      this.nearPortalSent = nearDungeon;
      EventBus.emit('portal:proximity', {
        nearPortal: nearDungeon,
        label: nearDungeon ? 'JOIN DUNGEON' : '',
        targetZone: 'dungeon',
      });
    }
  }
}
