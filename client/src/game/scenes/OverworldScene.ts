import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PlayerState } from '@shared/types';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';

const MAP_W = 1600;
const MAP_H = 1200;

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
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);

    // 1. Lush Serene Village tiled grass ground
    this.add
      .tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 'sv_grass')
      .setTileScale(2, 2)
      .setDepth(0);

    // 2. Cozy dirt roads & central sand plaza square (Serene Village textures)
    this.add.tileSprite(800, 610, 1140, 108, 'sv_path').setTileScale(2, 2).setDepth(2);
    this.add.tileSprite(800, 580, 116, 760, 'sv_path').setTileScale(2, 2).setDepth(2);
    this.add.tileSprite(800, 610, 280, 240, 'sv_plaza_sand').setTileScale(1.5, 1.5).setDepth(3);

    // Decorative wildflower meadows around the village
    const flowerSpots = [
      [310, 480], [1050, 460], [560, 820], [1160, 820], [640, 320],
    ];
    for (const [fx, fy] of flowerSpots) {
      this.add.image(fx, fy, 'sv_flowers').setScale(1.5).setDepth(4).setAlpha(0.9);
    }

    // Animated Village Square Campfire
    const fire = this.add.sprite(800, 595, 'sv_campfire', 0).setScale(2).setDepth(595);
    fire.play('campfire_burn');

    this.colliders = this.physics.add.staticGroup();
    this.buildLandmarks();
    this.buildVillageTreesAndFlowers();

    // Real animated Ninja Adventure chibi player + soft shadow
    this.player = new Player(this, 800, 665, this.initialState, 'overworld');
    this.physics.add.collider(this.player.sprite, this.colliders);

    this.promptText = this.add
      .text(0, 0, '', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5, 1)
      .setDepth(2600)
      .setVisible(false);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
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
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.player.destroy();
    });
  }

  private addSolidProp(
    texture: string,
    x: number,
    y: number,
    scale: number,
    bodyW: number,
    bodyH: number,
    label?: string
  ): Phaser.GameObjects.Image {
    const img = this.add.image(x, y, texture).setOrigin(0.5, 0.9).setScale(scale);
    img.setDepth(y);

    if (bodyW > 0 && bodyH > 0) {
      const colliderRect = this.add.rectangle(x, y - bodyH / 2, bodyW, bodyH, 0x000000, 0);
      this.colliders.add(colliderRect);
    }

    if (label) {
      this.add
        .text(x, y + 10, label, {
          fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#fef9c3',
          backgroundColor: 'rgba(15, 23, 42, 0.82)',
          padding: { x: 8, y: 3 },
        })
        .setOrigin(0.5, 0)
        .setDepth(y + 8);
    }

    return img;
  }

  private buildLandmarks(): void {
    // 1. AREA 0 Wooden Street Sign (Serene Village sign + crisp Avatar World badge)
    this.addSolidProp('sv_sign_wood', 645, 535, 2, 34, 18);
    this.add
      .text(645, 476, 'AREA 0', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#1d4ed8',
        padding: { x: 7, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(545);
    this.landmarks.push({
      x: 645,
      y: 545,
      radius: 82,
      label: 'AREA 0 Street Sign (Online Channels arrive in Phase 6)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:toast', { text: 'Phum Village • AREA 0 (Multiplayer sync unlocks in Phase 6)' }),
    });

    // 2. FARM Farmhouse & Wooden Fence Pen (Top-Left, Serene Village green-roof cottage)
    this.addSolidProp('sv_house_green', 340, 315, 1.55, 168, 72, 'FARM GATE');
    this.addSolidProp('sv_fence_pen', 520, 345, 1.35, 110, 64);
    this.landmarks.push({
      x: 340,
      y: 340,
      radius: 112,
      label: 'Personal Farm Gate (Stardew Farming unlocks in Phase 3)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:toast', { text: 'FARM Gate — Crop planting & timers arrive in Phase 3!' }),
    });

    // 3. SNACK CART Cozy Red-Roof Stall + Ninja Adventure Noodle Emblem (Center-Left)
    this.addSolidProp('sv_house_red', 435, 585, 1.5, 126, 62, 'SNACK CART');
    this.add.image(435, 430, 'icon_noodle').setScale(2.5).setDepth(595);
    this.add.image(435, 615, 'sv_flower_box').setScale(1.3).setDepth(615);
    this.landmarks.push({
      x: 435,
      y: 615,
      radius: 105,
      label: 'Khmer Street Snack Cart (Phase 4)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:toast', { text: 'SNACK CART — Num Pang & Iced Coffee buffs arrive in Phase 4!' }),
    });

    // 4. FASHION SHOP Blue-Roof Boutique (Center-Right, Serene Village)
    this.addSolidProp('sv_house_blue', 1170, 585, 1.55, 168, 72, 'FASHION SHOP');
    this.add.image(1170, 618, 'sv_flower_box').setScale(1.3).setDepth(618);
    this.landmarks.push({
      x: 1170,
      y: 618,
      radius: 110,
      label: 'Plaza Fashion Boutique (Phase 2 & 4)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:toast', { text: 'FASHION SHOP — Modular Paper-Doll outfits arrive in Phase 2!' }),
    });

    // 5. Glowing DUNGEON PORTAL (Legacy Fantasy Cave Entrance + Vortex + Bouncing JOIN Arrow, Top-Right)
    this.addSolidProp('lf_cave_entrance', 1245, 320, 1.35, 130, 54, 'DUNGEON PORTAL');
    const vortex = this.add.image(1258, 250, 'portal_vortex').setScale(1.25).setDepth(322);
    this.tweens.add({
      targets: vortex,
      alpha: 0.55,
      scale: 1.4,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const joinArrow = this.add.image(1245, 125, 'join_arrow').setDepth(450);
    this.tweens.add({
      targets: joinArrow,
      y: 110,
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.landmarks.push({
      x: 1245,
      y: 345,
      radius: 118,
      label: 'Press [E] or Tap JOIN → Enter Ancient Cavern (Side-Scroll)',
      isDungeonPortal: true,
      onInteract: () => this.enterDungeon(),
    });
  }

  private buildVillageTreesAndFlowers(): void {
    const trees: Array<[number, number, 'sv_tree_green' | 'sv_tree_teal']> = [
      [130, 210, 'sv_tree_green'], [145, 450, 'sv_tree_teal'], [140, 770, 'sv_tree_green'],
      [220, 1020, 'sv_tree_teal'], [540, 1015, 'sv_tree_green'], [960, 1020, 'sv_tree_teal'],
      [1310, 1010, 'sv_tree_green'], [1465, 810, 'sv_tree_teal'], [1470, 500, 'sv_tree_green'],
      [1465, 220, 'sv_tree_teal'], [985, 200, 'sv_tree_green'], [670, 195, 'sv_tree_teal'],
    ];
    for (const [tx, ty, tex] of trees) {
      this.addSolidProp(tex, tx, ty, 1.5, 44, 24);
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
      EventBus.emit('ui:toast', { text: 'Walk closer to the Dungeon Portal (top-right) or a Village building!' });
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
      const speed = 235;
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
      this.promptText.setPosition(nearest.x, nearest.y - 70);
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
