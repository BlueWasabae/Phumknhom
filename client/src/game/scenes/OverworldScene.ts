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
    // Stardew / Avatar World Mode: Top-Down 2D with gravity = 0
    this.physics.world.gravity.y = 0;
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);

    this.add.tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 'tile_grass').setDepth(0);

    const roads = this.add.graphics().setDepth(2);
    roads.fillStyle(0xdec08b, 1);
    roads.fillRoundedRect(210, 540, 1180, 120, 26);
    roads.fillRoundedRect(740, 220, 130, 760, 26);
    roads.lineStyle(5, 0xb89358, 1);
    roads.strokeRoundedRect(210, 540, 1180, 120, 26);
    roads.fillStyle(0xfef3c7, 0.92);
    roads.fillCircle(805, 600, 145);
    roads.lineStyle(5, 0xd97706, 0.8);
    roads.strokeCircle(805, 600, 145);

    this.colliders = this.physics.add.staticGroup();
    this.buildLandmarks();
    this.buildBorderTrees();

    this.player = new Player(this, 805, 640, this.initialState, 'overworld');
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
    bodyW: number,
    bodyH: number,
    label?: string
  ): Phaser.GameObjects.Image {
    const img = this.add.image(x, y, texture).setOrigin(0.5, 0.9);
    img.setDepth(y);

    const colliderRect = this.add.rectangle(x, y - bodyH / 2, bodyW, bodyH, 0x000000, 0);
    this.colliders.add(colliderRect);

    if (label) {
      this.add
        .text(x, y + 10, label, {
          fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#fef9c3',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          padding: { x: 8, y: 3 },
        })
        .setOrigin(0.5, 0)
        .setDepth(y + 5);
    }

    return img;
  }

  private buildLandmarks(): void {
    // 1. AREA 0 Street Sign
    this.addSolidProp('sign_area', 640, 505, 36, 18);
    this.landmarks.push({
      x: 640,
      y: 515,
      radius: 82,
      label: 'AREA 0 Channel Sign (Online Channels arrive in Phase 6)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:toast', { text: 'Phum Village • AREA 0 (Multiplayer sync unlocks in Phase 6)' }),
    });

    // 2. FARM Wooden Gate (Top-Left)
    this.addSolidProp('gate_farm', 360, 290, 112, 26, 'FARM GATE');
    this.landmarks.push({
      x: 360,
      y: 310,
      radius: 96,
      label: 'Personal Farm Gate (Stardew Farming unlocks in Phase 3)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:toast', { text: 'FARM Gate — Crop planting & timers arrive in Phase 3!' }),
    });

    // 3. SNACK CART Stall (Center-Left)
    this.addSolidProp('stall_snack', 470, 610, 108, 34, 'SNACK CART');
    this.landmarks.push({
      x: 470,
      y: 635,
      radius: 95,
      label: 'Khmer Street Snack Cart (Phase 4)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:toast', { text: 'SNACK CART — Num Pang & Iced Coffee buffs arrive in Phase 4!' }),
    });

    // 4. FASHION SHOP Booth (Center-Right)
    this.addSolidProp('stall_fashion', 1130, 615, 126, 42, 'FASHION SHOP');
    this.landmarks.push({
      x: 1130,
      y: 645,
      radius: 100,
      label: 'Plaza Fashion Boutique (Phase 2 & 4)',
      isDungeonPortal: false,
      onInteract: () => EventBus.emit('ui:toast', { text: 'FASHION SHOP — Modular Paper-Doll outfits arrive in Phase 2!' }),
    });

    // 5. Glowing DUNGEON PORTAL + Floating Yellow Downward "JOIN" Arrow (Top-Right)
    this.addSolidProp('portal_dungeon', 1240, 300, 84, 24, 'DUNGEON PORTAL');
    const joinArrow = this.add.image(1240, 155, 'join_arrow').setDepth(450);
    this.tweens.add({
      targets: joinArrow,
      y: 140,
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.landmarks.push({
      x: 1240,
      y: 325,
      radius: 108,
      label: 'Press [E] or Tap JOIN → Enter Ancient Cavern (Side-Scroll)',
      isDungeonPortal: true,
      onInteract: () => this.enterDungeon(),
    });
  }

  private buildBorderTrees(): void {
    const spots: Array<[number, number]> = [
      [140, 190], [180, 420], [150, 780], [220, 1020],
      [560, 175], [980, 185], [1460, 210], [1460, 520],
      [1450, 840], [1340, 1040], [980, 1030], [560, 1040],
    ];
    for (const [tx, ty] of spots) {
      this.addSolidProp('tree_lush', tx, ty, 38, 22);
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
    let frame = 0;
    if (len > 0.1) {
      const speed = 235;
      const nx = vx / Math.max(1, len);
      const ny = vy / Math.max(1, len);
      this.player.body.setVelocity(nx * speed, ny * speed);
      if (Math.abs(nx) > 0.08) this.player.facingRight = nx > 0;
      frame = Math.floor(time / 145) % 2 === 0 ? 1 : 2;
    } else {
      this.player.body.setVelocity(0, 0);
    }

    this.player.syncVisuals(time, frame);

    const nearest = this.findNearestLandmark();
    if (nearest) {
      this.promptText.setPosition(nearest.x, nearest.y - 60);
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
