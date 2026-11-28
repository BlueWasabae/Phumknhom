import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PlayerState } from '@shared/types';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { soundManager } from '../systems/SoundManager';
import { vfxManager } from '../animations/VFXManager';

interface DiveInitData {
  playerState?: PlayerState;
}

interface OceanClamNode {
  id: string;
  kind: 'clam' | 'chest';
  x: number;
  y: number;
  opened: boolean;
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Arc;
  shellTop: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
  prompt: Phaser.GameObjects.Text;
}

interface AirVentNode {
  x: number;
  y: number;
  cooldownUntil: number;
  ring: Phaser.GameObjects.Arc;
  bubbles: Phaser.GameObjects.Arc[];
}

interface SeaHazard {
  kind: 'jellyfish' | 'eel';
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  ampX: number;
  ampY: number;
  speed: number;
  phase: number;
  container: Phaser.GameObjects.Container;
}

const WORLD_W = 1600;
const WORLD_H = 920;
const SURFACE_Y = 115;
const BUOY_X = 800;
const BUOY_Y = 112;
const BASE_OXYGEN_SEC = 45;
const NAGA_SCALE_BONUS_SEC = 20;

export class PearlDiveScene extends Phaser.Scene {
  private playerState: PlayerState = structuredClone(INITIAL_PLAYER_STATE);
  private player!: Player;
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    E: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    UP: Phaser.Input.Keyboard.Key;
    DOWN: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key;
    RIGHT: Phaser.Input.Keyboard.Key;
  };
  private mobileVec: JoystickVector = { x: 0, y: 0 };
  private unsubs: Array<() => void> = [];

  private maxOxygenSec = BASE_OXYGEN_SEC;
  private oxygenSec = BASE_OXYGEN_SEC;
  private hasNagaBonus = false;
  private seaPearls = 0;
  private coralShards = 0;
  private treasureMaps = 0;
  private ancientPearls = 0;
  private finished = false;
  private hurtInvulnUntil = 0;
  private lastHudEmit = 0;

  private clams: OceanClamNode[] = [];
  private vents: AirVentNode[] = [];
  private hazards: SeaHazard[] = [];
  private ambientBubbles: Array<{ x: number; y: number; r: number; vy: number; sway: number }> = [];
  private bubbleGfx!: Phaser.GameObjects.Graphics;
  private rayGfx!: Phaser.GameObjects.Graphics;
  private buoyPrompt!: Phaser.GameObjects.Text;

  constructor() {
    super('PearlDiveScene');
  }

  init(data?: DiveInitData): void {
    this.playerState = data?.playerState
      ? structuredClone(data.playerState)
      : structuredClone(INITIAL_PLAYER_STATE);
    this.hasNagaBonus =
      this.playerState.loadout.armor === 'armor_naga_scale' ||
      this.playerState.loadout.shirt === 'shirt_celestial_naga';
    this.maxOxygenSec = BASE_OXYGEN_SEC + (this.hasNagaBonus ? NAGA_SCALE_BONUS_SEC : 0);
    this.oxygenSec = this.maxOxygenSec;
    this.seaPearls = 0;
    this.coralShards = 0;
    this.treasureMaps = 0;
    this.ancientPearls = 0;
    this.finished = false;
    this.hurtInvulnUntil = 0;
    this.lastHudEmit = 0;
    this.clams = [];
    this.vents = [];
    this.hazards = [];
    this.ambientBubbles = [];
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    this.physics.world.setBounds(24, SURFACE_Y - 12, WORLD_W - 48, WORLD_H - SURFACE_Y - 16);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBackgroundColor('#042f40');
    soundManager.playBgm('cavern');

    this.buildUnderwaterBackdrop();
    this.buildSurfaceBuoy();
    this.buildAirBubbleVents();
    this.buildClamsAndChests();
    this.buildSeaHazards();

    this.player = new Player(this, BUOY_X, SURFACE_Y + 60, this.playerState, 'pearl_dive');
    const body = this.player.body;
    body.setCollideWorldBounds(true);
    body.setDrag(240, 240);
    body.setMaxVelocity(235, 220);

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.fadeIn(320, 6, 95, 115);

    this.keys = this.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      UP: Phaser.Input.Keyboard.KeyCodes.UP,
      DOWN: Phaser.Input.Keyboard.KeyCodes.DOWN,
      LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
      RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    }) as typeof this.keys;

    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.mobileVec = vec;
      }),
      EventBus.on('input:interact', () => this.tryInteractNearest()),
      EventBus.on('dive:surfaceRequest', () => {
        if (!this.finished) {
          this.completeDive(true);
        }
      })
    );

    EventBus.emit('scene:ready', { zone: 'pearl_dive' });
    EventBus.emit('player:state', this.playerState);
    this.emitDiveHud(true);

    this.showFloatingBanner(
      this.hasNagaBonus
        ? '🫧 Naga Scale Set Active: 65s Oxygen! Harvest Giant Clams & return to the Buoy!'
        : '🫧 Koh Rong Coral Reef! Harvest Giant Clams (E/Click) & surface before air runs out!'
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      vfxManager.cleanupScene(this);
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.player?.destroy();
      EventBus.emit('dive:hudUpdate', null);
    });
  }

  private buildUnderwaterBackdrop(): void {
    const bg = this.add.graphics().setDepth(0);
    // Multi-band deep turquoise -> abyssal teal ocean gradient
    const bands = [
      { y: 0, h: 112, color: 0x0ea5e9 },
      { y: 112, h: 160, color: 0x0891b2 },
      { y: 272, h: 210, color: 0x0e7490 },
      { y: 482, h: 220, color: 0x155e75 },
      { y: 702, h: 218, color: 0x083344 },
    ];
    for (const b of bands) {
      bg.fillStyle(b.color, 1);
      bg.fillRect(0, b.y, WORLD_W, b.h);
    }

    // Shimmering ocean surface wave band
    bg.fillStyle(0xe0f2fe, 0.55);
    bg.fillRect(0, SURFACE_Y - 6, WORLD_W, 9);

    // Sandy ocean floor & coral ridges
    bg.fillStyle(0xd97706, 0.32);
    bg.fillRect(0, WORLD_H - 96, WORLD_W, 96);
    bg.fillStyle(0xfde68a, 0.45);
    bg.fillEllipse(360, WORLD_H - 58, 760, 110);
    bg.fillEllipse(1120, WORLD_H - 54, 880, 120);

    // Decorative coral spires & swaying kelp silhouettes
    const coralColors = [0xfb7185, 0x34d399, 0x38bdf8, 0xc084fc, 0xfbbf24];
    for (let i = 0; i < 24; i++) {
      const cx = 65 + i * 64 + ((i * 19) % 24);
      const cy = WORLD_H - 64 + ((i * 7) % 22);
      const col = coralColors[i % coralColors.length];
      bg.fillStyle(col, 0.65);
      bg.fillRoundedRect(cx - 5, cy - 34 - (i % 3) * 14, 10, 42 + (i % 3) * 14, 5);
      bg.fillCircle(cx - 7, cy - 22, 6);
      bg.fillCircle(cx + 7, cy - 28, 5);
    }

    // Animated diagonal cyan sunbeams + ambient rising bubbles
    this.rayGfx = this.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    this.bubbleGfx = this.add.graphics().setDepth(65);
    for (let i = 0; i < 55; i++) {
      this.ambientBubbles.push({
        x: Math.random() * WORLD_W,
        y: SURFACE_Y + Math.random() * (WORLD_H - SURFACE_Y - 40),
        r: 2 + Math.random() * 4,
        vy: 22 + Math.random() * 34,
        sway: Math.random() * Math.PI * 2,
      });
    }
  }

  private buildSurfaceBuoy(): void {
    const buoy = this.add.container(BUOY_X, BUOY_Y).setDepth(40);
    const halo = this.add.circle(0, 6, 44, 0x22d3ee, 0.24).setBlendMode(Phaser.BlendModes.ADD);
    vfxManager.applyBloom(this, halo, { color: 0x22d3ee, strength: 1.8 });
    const floatRing = this.add.ellipse(0, 8, 48, 18, 0xf97316, 1).setStrokeStyle(3, 0xffffff, 0.95);
    const mast = this.add.rectangle(0, -10, 8, 28, 0xfef3c7, 1);
    const beacon = this.add.circle(0, -24, 7, 0x67e8f9, 1);
    vfxManager.applyBloom(this, beacon, { color: 0x22d3ee, strength: 2.0 });
    const rope = this.add.rectangle(0, 62, 3, 98, 0xcbd5e1, 0.55);
    buoy.add([rope, halo, floatRing, mast, beacon]);

    this.tweens.add({
      targets: buoy,
      y: BUOY_Y - 6,
      duration: 1450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.buoyPrompt = this.add
      .text(BUOY_X, BUOY_Y - 50, '🛟 Coral Reef Buoy · Surface Here (100% Haul)', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#ecfeff',
        backgroundColor: '#083344dd',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(80);
  }

  private buildAirBubbleVents(): void {
    const ventCoords = [
      { x: 280, y: WORLD_H - 70 },
      { x: 640, y: WORLD_H - 64 },
      { x: 1020, y: WORLD_H - 68 },
      { x: 1360, y: WORLD_H - 72 },
    ];
    for (const v of ventCoords) {
      this.add.ellipse(v.x, v.y + 8, 54, 20, 0x1e293b, 0.9).setDepth(14);
      const ring = this.add
        .circle(v.x, v.y - 4, 24, 0x38bdf8, 0.28)
        .setStrokeStyle(2, 0x67e8f9, 0.85)
        .setDepth(16)
        .setBlendMode(Phaser.BlendModes.ADD);
      vfxManager.applyBloom(this, ring, { color: 0x38bdf8, strength: 1.6 });

      const bubbles: Phaser.GameObjects.Arc[] = [];
      for (let i = 0; i < 4; i++) {
        const b = this.add
          .circle(v.x + (i - 1.5) * 8, v.y - 14 - i * 16, 5 - i * 0.6, 0xbae6fd, 0.85)
          .setDepth(17);
        bubbles.push(b);
      }

      this.add
        .text(v.x, v.y + 24, '🫧 Air Vent (+18s)', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          color: '#bae6fd',
          backgroundColor: '#082f49bb',
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(25);

      this.vents.push({ x: v.x, y: v.y, cooldownUntil: 0, ring, bubbles });
    }
  }

  private buildClamsAndChests(): void {
    const nodes: Array<{ id: string; kind: 'clam' | 'chest'; x: number; y: number }> = [
      { id: 'clam_1', kind: 'clam', x: 210, y: 540 },
      { id: 'clam_2', kind: 'clam', x: 460, y: 740 },
      { id: 'clam_3', kind: 'clam', x: 760, y: 610 },
      { id: 'clam_4', kind: 'clam', x: 930, y: 790 },
      { id: 'clam_5', kind: 'clam', x: 1180, y: 560 },
      { id: 'clam_6', kind: 'clam', x: 1440, y: 760 },
      { id: 'chest_1', kind: 'chest', x: 320, y: 810 },
      { id: 'chest_2', kind: 'chest', x: 820, y: 825 },
      { id: 'chest_3', kind: 'chest', x: 1290, y: 815 },
    ];

    for (const n of nodes) {
      const container = this.add.container(n.x, n.y).setDepth(28);
      const glow = this.add
        .circle(0, 0, n.kind === 'chest' ? 30 : 26, n.kind === 'chest' ? 0xfacc15 : 0x67e8f9, 0.25)
        .setBlendMode(Phaser.BlendModes.ADD);
      vfxManager.applyBloom(this, glow, { color: n.kind === 'chest' ? 0xfacc15 : 0x22d3ee, strength: 1.5 });

      let shellTop: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
      if (n.kind === 'clam') {
        const baseShell = this.add.ellipse(0, 8, 36, 18, 0xc084fc, 1).setStrokeStyle(2, 0xf5d0fe, 0.9);
        const pearlCore = this.add.circle(0, 2, 7, 0xfef9c3, 1);
        shellTop = this.add.circle(0, -4, 15, 0xa855f7, 0.95).setStrokeStyle(2, 0xf5d0fe, 0.9);
        container.add([glow, baseShell, pearlCore, shellTop]);
      } else {
        const box = this.add.rectangle(0, 6, 36, 22, 0x92400e, 1).setStrokeStyle(2, 0xfbbf24, 1);
        shellTop = this.add.rectangle(0, -6, 38, 10, 0xb45309, 1).setStrokeStyle(2, 0xfde047, 1);
        const lock = this.add.rectangle(0, 2, 7, 9, 0xfef08a, 1);
        container.add([glow, box, shellTop, lock]);
      }

      const prompt = this.add
        .text(n.x, n.y - 32, n.kind === 'clam' ? '🫧 Giant Clam [E / Click]' : '💰 Sunken Chest [E / Click]', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          color: n.kind === 'chest' ? '#fef08a' : '#cffafe',
          backgroundColor: '#042f40dd',
          padding: { x: 6, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(55)
        .setVisible(false);

      const nodeObj: OceanClamNode = {
        id: n.id,
        kind: n.kind,
        x: n.x,
        y: n.y,
        opened: false,
        container,
        glow,
        shellTop,
        prompt,
      };
      this.clams.push(nodeObj);

      container.setSize(52, 52);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        if (this.finished || nodeObj.opened) return;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, nodeObj.x, nodeObj.y);
        if (dist <= 135) {
          this.harvestNode(nodeObj);
        } else {
          this.showFloatingText(nodeObj.x, nodeObj.y - 24, 'Swim closer!', '#bae6fd');
        }
      });
    }
  }

  private buildSeaHazards(): void {
    const specs: Array<{
      kind: 'jellyfish' | 'eel';
      x: number;
      y: number;
      ampX: number;
      ampY: number;
      speed: number;
    }> = [
      { kind: 'jellyfish', x: 370, y: 420, ampX: 40, ampY: 85, speed: 0.0017 },
      { kind: 'jellyfish', x: 960, y: 460, ampX: 48, ampY: 95, speed: 0.0019 },
      { kind: 'jellyfish', x: 1320, y: 410, ampX: 36, ampY: 90, speed: 0.0016 },
      { kind: 'eel', x: 580, y: 690, ampX: 170, ampY: 22, speed: 0.0021 },
      { kind: 'eel', x: 1120, y: 710, ampX: 185, ampY: 26, speed: 0.0023 },
    ];

    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const container = this.add.container(s.x, s.y).setDepth(38);
      if (s.kind === 'jellyfish') {
        const aura = this.add.circle(0, 0, 26, 0xe879f9, 0.25).setBlendMode(Phaser.BlendModes.ADD);
        vfxManager.applyBloom(this, aura, { color: 0xe879f9, strength: 1.6 });
        const bell = this.add.ellipse(0, -4, 30, 20, 0xf0abfc, 0.92).setStrokeStyle(2, 0xffffff, 0.8);
        const t1 = this.add.rectangle(-8, 12, 3, 18, 0xe879f9, 0.85);
        const t2 = this.add.rectangle(0, 14, 3, 20, 0x38bdf8, 0.85);
        const t3 = this.add.rectangle(8, 12, 3, 18, 0xe879f9, 0.85);
        container.add([aura, t1, t2, t3, bell]);
      } else {
        const aura = this.add.ellipse(0, 0, 62, 22, 0x22d3ee, 0.25).setBlendMode(Phaser.BlendModes.ADD);
        vfxManager.applyBloom(this, aura, { color: 0x22d3ee, strength: 1.6 });
        const seg1 = this.add.ellipse(-18, 0, 24, 12, 0x0f766e, 1).setStrokeStyle(1.5, 0x67e8f9, 0.9);
        const seg2 = this.add.ellipse(0, 2, 26, 13, 0x14b8a6, 1).setStrokeStyle(1.5, 0x67e8f9, 0.9);
        const head = this.add.ellipse(18, -1, 22, 14, 0x2dd4bf, 1).setStrokeStyle(1.5, 0xfef08a, 0.95);
        const eye = this.add.circle(23, -3, 2.5, 0xfef08a, 1);
        container.add([aura, seg1, seg2, head, eye]);
      }
      this.hazards.push({
        kind: s.kind,
        x: s.x,
        y: s.y,
        baseX: s.x,
        baseY: s.y,
        ampX: s.ampX,
        ampY: s.ampY,
        speed: s.speed,
        phase: i * 1.4,
        container,
      });
    }
  }

  private tryInteractNearest(): void {
    if (this.finished) return;
    // Check surface buoy first if near it
    const distBuoy = Phaser.Math.Distance.Between(this.player.x, this.player.y, BUOY_X, BUOY_Y + 35);
    if (distBuoy <= 95) {
      this.completeDive(true);
      return;
    }
    let nearest: OceanClamNode | null = null;
    let best = 130;
    for (const c of this.clams) {
      if (c.opened) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      if (d < best) {
        best = d;
        nearest = c;
      }
    }
    if (nearest) {
      this.harvestNode(nearest);
    }
  }

  private harvestNode(node: OceanClamNode): void {
    if (node.opened || this.finished) return;
    node.opened = true;
    node.prompt.setVisible(false);
    node.glow.setAlpha(0.06);
    node.shellTop.setAlpha(0.35);
    soundManager.playSfx('coin');

    const roll = Math.random();
    const pearls = node.kind === 'clam' ? 1 + (Math.random() < 0.4 ? 1 : 0) : 1;
    const corals = node.kind === 'chest' ? 2 + Math.floor(Math.random() * 2) : 1;
    this.seaPearls += pearls;
    this.coralShards += corals;

    let label = `+${pearls} 🫧 Sea Pearl, +${corals} 🪸 Coral`;
    let color = '#67e8f9';

    if (node.kind === 'chest' && Math.random() < 0.22) {
      this.treasureMaps += 1;
      label += ' + 🗺️ Torn Map!';
      color = '#fde047';
    }
    // 0.2% Ancient Bioluminescent Pearl drop!
    if (roll < 0.002) {
      this.ancientPearls += 1;
      label = '✨ ANCIENT BIOLUMINESCENT PEARL (0.2%)!!';
      color = '#22d3ee';
      soundManager.playSfx('victory');
      this.cameras.main.flash(260, 34, 211, 238, false);
    }

    this.showFloatingText(node.x, node.y - 24, label, color);
    this.emitDiveHud(true);
  }

  private completeDive(surfacedSafely: boolean): void {
    if (this.finished) return;
    this.finished = true;

    const keptRatio = surfacedSafely ? 1 : 0.5;
    const keptPearls = Math.floor(this.seaPearls * keptRatio);
    const keptCorals = Math.floor(this.coralShards * keptRatio);
    const keptMaps = surfacedSafely ? this.treasureMaps : Math.floor(this.treasureMaps * 0.5);
    const keptAncient = surfacedSafely ? this.ancientPearls : this.ancientPearls; // Never lose a 0.2% Ancient drop!
    const coinsEarned = keptPearls * 45 + keptCorals * 20;
    const fishingXp = 25 + keptPearls * 18 + keptCorals * 8 + keptAncient * 150;

    soundManager.playSfx(surfacedSafely ? 'victory' : 'splash');
    EventBus.emit('dive:completed', {
      surfacedSafely,
      keptRatio,
      seaPearls: keptPearls,
      coralShards: keptCorals,
      treasureMaps: keptMaps,
      ancientPearls: keptAncient,
      coinsEarned,
      fishingXp,
    });
    EventBus.emit('dive:hudUpdate', null);

    this.cameras.main.fadeOut(320, 6, 95, 115);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        playerState: this.playerState,
        mapId: 'koh_rong_island',
        spawnX: 800,
        spawnY: 770,
      });
    });
  }

  private emitDiveHud(force = false): void {
    const now = this.time.now;
    if (!force && now - this.lastHudEmit < 120) return;
    this.lastHudEmit = now;
    const depthMeters = Math.max(0, Math.round((this.player.y - SURFACE_Y) / 22));
    const nearSurfaceBuoy =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, BUOY_X, BUOY_Y + 35) <= 125;

    EventBus.emit('dive:hudUpdate', {
      active: !this.finished,
      oxygenSec: Math.max(0, this.oxygenSec),
      maxOxygenSec: this.maxOxygenSec,
      nagaScaleBonus: this.hasNagaBonus,
      seaPearls: this.seaPearls,
      coralShards: this.coralShards,
      treasureMaps: this.treasureMaps,
      ancientPearls: this.ancientPearls,
      depthMeters,
      nearSurfaceBuoy,
    });
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const txt = this.add
      .text(x, y, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color,
        stroke: '#042f40',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(95);
    this.tweens.add({
      targets: txt,
      y: y - 34,
      alpha: 0,
      duration: 1350,
      onComplete: () => txt.destroy(),
    });
  }

  private showFloatingBanner(text: string): void {
    const cam = this.cameras.main;
    const txt = this.add
      .text(cam.width / 2, cam.height - 62, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ecfeff',
        backgroundColor: '#083344dd',
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(120);
    this.time.delayedCall(4200, () => {
      if (txt.active) txt.destroy();
    });
  }

  update(time: number, delta: number): void {
    if (this.finished) return;
    const dt = Math.min(0.05, delta / 1000);

    // 360° gentle underwater swimming physics
    let ix = this.mobileVec.x;
    let iy = this.mobileVec.y;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) ix -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) ix += 1;
    if (this.keys.W.isDown || this.keys.UP.isDown) iy -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) iy += 1;

    const len = Math.hypot(ix, iy);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (len > 0.08) {
      const nx = ix / Math.max(1, len);
      const ny = iy / Math.max(1, len);
      body.setAcceleration(nx * 540, ny * 510);
      if (nx < -0.15) this.player.facing = 'left';
      else if (nx > 0.15) this.player.facing = 'right';
      this.player.playStateAnimation('walk');
    } else {
      // Gentle underwater buoyancy drift
      body.setAcceleration(0, Math.sin(time * 0.003) * 32);
      this.player.playStateAnimation('idle');
    }
    this.player.syncVisuals(time, false);

    // Interact via E or Space
    if (Phaser.Input.Keyboard.JustDown(this.keys.E) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.tryInteractNearest();
    }

    // Oxygen countdown
    this.oxygenSec = Math.max(0, this.oxygenSec - dt);
    if (this.oxygenSec <= 0) {
      this.completeDive(false);
      return;
    }

    // Surface buoy proximity check (swim right up to the buoy to auto-prompt or press E)
    const distBuoy = Phaser.Math.Distance.Between(this.player.x, this.player.y, BUOY_X, BUOY_Y + 24);
    this.buoyPrompt.setText(
      distBuoy <= 95
        ? '🛟 Press [E] or click Surface to keep 100% Haul!'
        : '🛟 Coral Reef Buoy · Surface Here (100% Haul)'
    );

    // Air Bubble Vents restore +18s oxygen
    for (const v of this.vents) {
      for (let i = 0; i < v.bubbles.length; i++) {
        const b = v.bubbles[i];
        b.y -= 36 * dt;
        if (b.y < v.y - 82) {
          b.y = v.y - 8;
        }
      }
      if (time >= v.cooldownUntil) {
        v.ring.setAlpha(0.32 + Math.sin(time * 0.006) * 0.1);
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, v.x, v.y - 16);
        if (d <= 56 && this.oxygenSec < this.maxOxygenSec - 1) {
          v.cooldownUntil = time + 9000;
          this.oxygenSec = Math.min(this.maxOxygenSec, this.oxygenSec + 18);
          soundManager.playSfx('heal');
          this.showFloatingText(v.x, v.y - 36, '+18s Oxygen 🫧', '#7dd3fc');
          this.emitDiveHud(true);
        }
      } else {
        v.ring.setAlpha(0.08);
      }
    }

    // Clam / Chest proximity prompts
    for (const c of this.clams) {
      if (c.opened) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      c.prompt.setVisible(d <= 130);
    }

    // Patrolling Jellyfish & Electric Eels (drains Oxygen instead of instant death)
    for (const h of this.hazards) {
      h.x = h.baseX + Math.sin(time * h.speed + h.phase) * h.ampX;
      h.y = h.baseY + Math.cos(time * h.speed * 0.85 + h.phase) * h.ampY;
      h.container.setPosition(h.x, h.y);
      if (h.kind === 'eel') {
        const vx = Math.cos(time * h.speed + h.phase) * h.ampX;
        h.container.setScale(vx < 0 ? -1 : 1, 1);
      }

      if (time >= this.hurtInvulnUntil) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, h.x, h.y);
        if (d <= 36) {
          this.hurtInvulnUntil = time + 1200;
          this.oxygenSec = Math.max(0, this.oxygenSec - 8);
          soundManager.playSfx('hit');
          this.cameras.main.shake(150, 0.006);
          this.showFloatingText(
            this.player.x,
            this.player.y - 32,
            h.kind === 'eel' ? '⚡ Eel Shock! -8s Air' : '🪼 Jellyfish Sting! -8s Air',
            '#fda4af'
          );
          this.emitDiveHud(true);
          if (this.oxygenSec <= 0) {
            this.completeDive(false);
            return;
          }
        }
      }
    }

    // Render animated blooming diagonal cyan sunbeams
    this.rayGfx.clear();
    for (let i = 0; i < 6; i++) {
      const rx = 140 + i * 260 + Math.sin(time * 0.0007 + i) * 35;
      const alpha = 0.07 + Math.sin(time * 0.0015 + i * 1.2) * 0.03;
      this.rayGfx.fillStyle(0x67e8f9, alpha);
      this.rayGfx.beginPath();
      this.rayGfx.moveTo(rx, SURFACE_Y);
      this.rayGfx.lineTo(rx + 95, SURFACE_Y);
      this.rayGfx.lineTo(rx + 250, WORLD_H);
      this.rayGfx.lineTo(rx + 85, WORLD_H);
      this.rayGfx.closePath();
      this.rayGfx.fillPath();
    }

    // Render rising ambient bubbles
    this.bubbleGfx.clear();
    for (const b of this.ambientBubbles) {
      b.y -= b.vy * dt;
      b.x += Math.sin(time * 0.002 + b.sway) * 14 * dt;
      if (b.y < SURFACE_Y) {
        b.y = WORLD_H - 25;
        b.x = Math.random() * WORLD_W;
      }
      this.bubbleGfx.lineStyle(1, 0xbae6fd, 0.55);
      this.bubbleGfx.strokeCircle(b.x, b.y, b.r);
    }

    this.emitDiveHud(false);
  }
}
