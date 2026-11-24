import Phaser from 'phaser';
import {
  INITIAL_PLAYER_STATE,
  type PlayerState,
  type SkillId,
} from '@shared/types';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
import { ACCESSORY_DEFS } from '@shared/accessoryFusions';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { soundManager } from '../systems/SoundManager';

const WORLD_W = 2400;
const WORLD_H = 1040;
const FLOOR_Y = 900;
const EXIT_X = 148;
const EXIT_Y = FLOOR_Y - 12;

interface PlatformDef {
  x: number;
  y: number;
  w: number;
  style: 'wood' | 'stone';
}

interface OreVeinNode {
  id: string;
  kind: 'laterite' | 'jade' | 'gold';
  itemId: string;
  name: string;
  xp: number;
  tint: number;
  sparkColor: number;
  x: number;
  y: number;
  hitsRemaining: number;
  maxHits: number;
  ready: boolean;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  pips: Phaser.GameObjects.Rectangle[];
}

interface RelicChestNode {
  id: string;
  x: number;
  y: number;
  opened: boolean;
  coins: number;
  reforgeStones: number;
  accessoryId: string;
  title: string;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

interface CavernMob {
  id: string;
  name: string;
  sprite: Phaser.GameObjects.Sprite;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  minX: number;
  maxX: number;
  baseY: number;
  speed: number;
  dir: number;
  flying: boolean;
  hp: number;
  maxHp: number;
  alive: boolean;
  baseTint: number;
  rewardCoins: number;
  rewardXp: number;
  dropItemId: string;
  lastHitAt: number;
  lastContactAt: number;
}

export interface CavernExploreInitData {
  playerState?: PlayerState;
  returnMapId?: 'wild_frontier' | 'temple_district';
}

const CAVERN_PLATFORMS: PlatformDef[] = [
  // Tier 1 (Easy climb & grapple)
  { x: 470, y: 760, w: 230, style: 'stone' },
  { x: 960, y: 745, w: 250, style: 'wood' },
  { x: 1480, y: 755, w: 260, style: 'stone' },
  { x: 2010, y: 745, w: 250, style: 'wood' },

  // Tier 2 (Mid underground shelves)
  { x: 280, y: 615, w: 220, style: 'wood' },
  { x: 740, y: 600, w: 250, style: 'stone' },
  { x: 1240, y: 595, w: 260, style: 'wood' },
  { x: 1750, y: 605, w: 240, style: 'stone' },
  { x: 2180, y: 595, w: 220, style: 'stone' },

  // Tier 3 (High Grapple / Double-Jump Relic Ledges)
  { x: 495, y: 445, w: 230, style: 'stone' },
  { x: 1030, y: 420, w: 250, style: 'wood' },
  { x: 1580, y: 440, w: 240, style: 'stone' },
  { x: 2080, y: 430, w: 240, style: 'wood' },

  // Tier 4 (Hidden Upper Crystal Sanctuary Alcove)
  { x: 1280, y: 270, w: 240, style: 'stone' },
];

export class CavernExploreScene extends Phaser.Scene {
  private player!: Player;
  private initialState: PlayerState = INITIAL_PLAYER_STATE;
  private returnMapId: 'wild_frontier' | 'temple_district' = 'wild_frontier';

  private bgFar!: Phaser.GameObjects.TileSprite;
  private bgMid!: Phaser.GameObjects.TileSprite;
  private solidFloor!: Phaser.Physics.Arcade.StaticGroup;
  private elevatedPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private platformDefs: PlatformDef[] = CAVERN_PLATFORMS;

  private oreVeins: OreVeinNode[] = [];
  private relicChests: RelicChestNode[] = [];
  private mobs: CavernMob[] = [];
  private spores: Array<{ dot: Phaser.GameObjects.Arc; vx: number; vy: number }> = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'A' | 'D' | 'W' | 'E' | 'J' | 'G' | 'SHIFT' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };

  private jumpsUsed = 0;
  private prevOnGround = true;
  private peakAirVy = 0;
  private dashActiveUntil = 0;
  private dashCooldownUntil = 0;
  private attackCooldownUntil = 0;
  private attackAnimUntil = 0;
  private invulnerableUntil = 0;

  // Bamboo Vine Grapple state
  private grappleActive = false;
  private grappleTargetX = 0;
  private grappleTargetY = 0;
  private grappleEndAt = 0;
  private grappleCooldownUntil = 0;
  private grappleGraphics!: Phaser.GameObjects.Graphics;

  // Naga Scale Set Orbiting Water Shield (blocks 1 hit every 20s)
  private waterShieldReadyAt = 0;
  private waterShieldOrb!: Phaser.GameObjects.Arc;
  private waterShieldRing!: Phaser.GameObjects.Arc;

  private nearExitSent = false;
  private transitioning = false;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('CavernExploreScene');
  }

  init(data?: CavernExploreInitData): void {
    this.returnMapId = data?.returnMapId ?? 'wild_frontier';
    this.initialState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'cavern',
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
          currencies: { ...data.playerState.currencies },
          lifeStats: { ...data.playerState.lifeStats },
          activeBuffs: [...data.playerState.activeBuffs],
          quickSnackSlots: [...data.playerState.quickSnackSlots],
          clearedBosses: [...data.playerState.clearedBosses],
        }
      : { ...INITIAL_PLAYER_STATE, zone: 'cavern' };

    this.oreVeins = [];
    this.relicChests = [];
    this.mobs = [];
    this.spores = [];
    this.jumpsUsed = 0;
    this.prevOnGround = true;
    this.peakAirVy = 0;
    this.dashActiveUntil = 0;
    this.dashCooldownUntil = 0;
    this.attackCooldownUntil = 0;
    this.attackAnimUntil = 0;
    this.invulnerableUntil = 0;
    this.grappleActive = false;
    this.grappleCooldownUntil = 0;
    this.waterShieldReadyAt = 0;
    this.nearExitSent = false;
    this.transitioning = false;
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    this.physics.world.gravity.y = 800;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    soundManager.playBgm('boss');

    this.drawCavernParallaxAndBackdrop();
    this.buildPlatforms();
    this.buildExitPortal();
    this.buildOreVeins();
    this.buildRelicChests();
    this.buildCavernMobs();

    this.player = new Player(this, 235, FLOOR_Y - 48, this.initialState, 'cavern');
    this.physics.add.collider(this.player.sprite, this.solidFloor);
    this.physics.add.collider(
      this.player.sprite,
      this.elevatedPlatforms,
      undefined,
      (playerObj, platObj) => {
        const p = playerObj as Phaser.Physics.Arcade.Sprite;
        const plat = platObj as Phaser.GameObjects.Rectangle;
        const body = p.body as Phaser.Physics.Arcade.Body;
        return !this.grappleActive && body.velocity.y >= 0 && body.bottom <= plat.y - plat.height / 2 + 14;
      }
    );

    this.grappleGraphics = this.add.graphics().setDepth(65);
    this.waterShieldOrb = this.add.circle(this.player.x, this.player.y, 7, 0x38bdf8, 0.92).setDepth(62).setVisible(false);
    this.waterShieldRing = this.add
      .circle(this.player.x, this.player.y, 10, 0x7dd3fc, 0)
      .setStrokeStyle(2, 0xbae6fd, 0.85)
      .setDepth(61)
      .setVisible(false);

    // Camera follow
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.fadeIn(220, 8, 12, 22);

    // Controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('A,D,W,E,J,G,SHIFT,SPACE') as Record<
        'A' | 'D' | 'W' | 'E' | 'J' | 'G' | 'SHIFT' | 'SPACE',
        Phaser.Input.Keyboard.Key
      >;
    }

    // Banner helper tooltip at bottom-left of cavern entrance
    this.add
      .text(
        295,
        FLOOR_Y - 122,
        '⛏️ ANCIENT KHMER CAVERNS\n[A/D] Move · [W/Space] Jump · [G] Bamboo Vine Grapple\n[J / Click] Mine Ores & Fight · [E] Open Chests / Exit',
        {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          padding: { x: 8, y: 5 },
          align: 'center',
        }
      )
      .setOrigin(0.5)
      .setDepth(28);

    // EventBus bindings
    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.joystick = vec;
      }),
      EventBus.on('input:jump', () => this.performJump()),
      EventBus.on('input:dash', () => this.performDash()),
      EventBus.on('input:grapple', () => this.performBambooGrapple()),
      EventBus.on('input:attack', () => this.performAttackOrMine()),
      EventBus.on('input:interact', () => this.tryInteractNearest()),
      EventBus.on('input:exitDungeon', () => this.exitToOverworld()),
      EventBus.on('player:loadoutChanged', ({ loadout, playerState }) => {
        this.player.applyLoadoutUpdate(loadout, playerState);
      }),
      EventBus.on('player:stateSync', (nextState) => {
        this.player.syncPlayerState(nextState);
      }),
      EventBus.on('travel:execute', (req) => {
        if (this.transitioning) return;
        this.transitioning = true;
        this.cameras.main.fadeOut(220, 8, 12, 22);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          if (req.targetZone === 'farm') {
            this.scene.start('FarmScene', {
              playerState: { ...this.player.state, zone: 'farm' },
            });
          } else if (req.targetZone === 'club') {
            this.scene.start('ClubScene', {
              playerState: { ...this.player.state, zone: 'club' },
            });
          } else {
            const targetMap = req.mapId ?? this.returnMapId;
            this.scene.start('OverworldScene', {
              mapId: targetMap,
              spawnX: req.spawnX,
              spawnY: req.spawnY,
              goldenFlash: true,
              playerState: { ...this.player.state, zone: 'overworld', currentMapId: targetMap },
            });
          }
        });
      })
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((fn) => fn());
      this.unsubs = [];
    });

    EventBus.emit('scene:ready', { zone: 'cavern' });
    EventBus.emit('player:state', this.player.state);
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: 'overworld' });
  }

  private drawCavernParallaxAndBackdrop(): void {
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x0b1020).setDepth(0);

    if (this.textures.exists('lf_sky')) {
      this.add
        .tileSprite(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 'lf_sky')
        .setTint(0x1e293b)
        .setAlpha(0.75)
        .setDepth(1);
    }

    if (this.textures.exists('lf_parallax_far')) {
      this.bgFar = this.add
        .tileSprite(WORLD_W / 2, 430, WORLD_W, 640, 'lf_parallax_far')
        .setTint(0x334155)
        .setAlpha(0.62)
        .setDepth(2);
    }

    if (this.textures.exists('lf_parallax_mid')) {
      this.bgMid = this.add
        .tileSprite(WORLD_W / 2, 540, WORLD_W, 560, 'lf_parallax_mid')
        .setTint(0x475569)
        .setAlpha(0.72)
        .setDepth(3);
    }

    // Carved stone pillars, glowing torches, hanging vines & mushrooms across the cavern
    for (let px = 310; px < WORLD_W - 140; px += 380) {
      if (this.textures.exists('lf_pillar')) {
        this.add.image(px, FLOOR_Y - 120, 'lf_pillar').setScale(2.8, 3.4).setTint(0x64748b).setAlpha(0.55).setDepth(5);
      }
      if (this.textures.exists('lf_torch')) {
        this.add.image(px + 28, FLOOR_Y - 82, 'lf_torch').setScale(2.1).setDepth(8);
        const glow = this.add
          .image(px + 28, FLOOR_Y - 94, 'torch_glow')
          .setTint(0xf59e0b)
          .setScale(1.1)
          .setAlpha(0.5)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(9);
        this.tweens.add({ targets: glow, alpha: 0.28, scale: 1.25, duration: 900, yoyo: true, repeat: -1 });
      }
    }

    for (let vx = 180; vx < WORLD_W - 80; vx += 210) {
      const vineKey = vx % 420 === 0 ? 'lf_vine_purple' : 'lf_vine_green';
      if (this.textures.exists(vineKey)) {
        this.add.image(vx, 80 + (vx % 90), vineKey).setScale(2.4).setAlpha(0.7).setDepth(6);
      }
    }

    for (let mx = 360; mx < WORLD_W - 120; mx += 440) {
      if (this.textures.exists('lf_mushroom')) {
        this.add.image(mx, FLOOR_Y - 14, 'lf_mushroom').setScale(1.6).setDepth(9);
      }
    }

    // Floating bioluminescent cavern spores
    for (let i = 0; i < 36; i++) {
      const col = i % 3 === 0 ? 0x34d399 : i % 3 === 1 ? 0xfacc15 : 0x38bdf8;
      const dot = this.add
        .circle(Phaser.Math.Between(80, WORLD_W - 80), Phaser.Math.Between(120, FLOOR_Y - 30), 2.5, col, 0.55)
        .setDepth(12);
      this.spores.push({
        dot,
        vx: Phaser.Math.FloatBetween(-9, 9),
        vy: Phaser.Math.FloatBetween(-12, -3),
      });
    }
  }

  private buildPlatforms(): void {
    this.solidFloor = this.physics.add.staticGroup();
    this.elevatedPlatforms = this.physics.add.staticGroup();

    // Solid cavern bedrock floor
    const floorVisualH = WORLD_H - FLOOR_Y;
    if (this.textures.exists('lf_cave_floor')) {
      this.add
        .tileSprite(WORLD_W / 2, FLOOR_Y + floorVisualH / 2, WORLD_W, floorVisualH, 'lf_cave_floor')
        .setDepth(10);
    } else {
      this.add.rectangle(WORLD_W / 2, FLOOR_Y + floorVisualH / 2, WORLD_W, floorVisualH, 0x292524).setDepth(10);
    }
    if (this.textures.exists('lf_moss_top')) {
      this.add.tileSprite(WORLD_W / 2, FLOOR_Y + 6, WORLD_W, 24, 'lf_moss_top').setDepth(11);
    }

    const floorRect = this.add.rectangle(WORLD_W / 2, FLOOR_Y + 40, WORLD_W, 80, 0x000000, 0);
    this.solidFloor.add(floorRect);

    // Elevated multi-tier cavern ledges (with glowing bamboo grapple anchors on sides)
    for (const p of this.platformDefs) {
      const texKey = p.style === 'wood' ? 'lf_plat_wood' : 'lf_plat_stone';
      if (this.textures.exists(texKey)) {
        this.add.tileSprite(p.x, p.y, p.w, 24, texKey).setDepth(14);
      } else {
        this.add.rectangle(p.x, p.y, p.w, 18, 0x57534e).setStrokeStyle(2, 0x292524).setDepth(14);
      }
      // Subtle emerald vine knot markers showing Grapple [G] anchor points
      this.add.circle(p.x - p.w / 2 + 12, p.y + 8, 4, 0x4ade80, 0.72).setDepth(15);
      this.add.circle(p.x + p.w / 2 - 12, p.y + 8, 4, 0x4ade80, 0.72).setDepth(15);

      const col = this.add.rectangle(p.x, p.y, p.w, 18, 0x000000, 0);
      this.elevatedPlatforms.add(col);
    }
  }

  private buildExitPortal(): void {
    const aura = this.add
      .image(EXIT_X, EXIT_Y - 56, 'portal_vortex')
      .setTint(0x38bdf8)
      .setScale(1.35)
      .setAlpha(0.68)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(16);
    this.tweens.add({ targets: aura, scale: 1.55, alpha: 0.35, duration: 820, yoyo: true, repeat: -1 });

    if (this.textures.exists('lf_cave_entrance')) {
      const gate = this.add
        .image(EXIT_X, EXIT_Y + 12, 'lf_cave_entrance')
        .setOrigin(0.5, 1)
        .setScale(0.95)
        .setDepth(17)
        .setInteractive({ useHandCursor: true });
      gate.on('pointerdown', () => this.exitToOverworld());
    }

    const arrow = this.add.image(EXIT_X, EXIT_Y - 135, 'join_arrow').setScale(0.75).setDepth(30);
    this.tweens.add({ targets: arrow, y: EXIT_Y - 144, duration: 540, yoyo: true, repeat: -1 });

    this.add
      .text(EXIT_X, EXIT_Y - 165, 'EXIT TO VILLAGE [E]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#e0f2fe',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(32);
  }

  private buildOreVeins(): void {
    const veinDefs: Array<{
      x: number;
      y: number;
      kind: 'laterite' | 'jade' | 'gold';
    }> = [
      { x: 520, y: FLOOR_Y - 18, kind: 'laterite' },
      { x: 470, y: 742, kind: 'laterite' },
      { x: 1120, y: FLOOR_Y - 18, kind: 'laterite' },
      { x: 740, y: 582, kind: 'jade' },
      { x: 1480, y: 737, kind: 'jade' },
      { x: 1240, y: 577, kind: 'jade' },
      { x: 1750, y: 587, kind: 'gold' },
      { x: 1580, y: 422, kind: 'gold' },
      { x: 2180, y: 577, kind: 'gold' },
    ];

    const meta = {
      laterite: {
        itemId: 'ore_laterite',
        name: 'Laterite Ore',
        xp: 28,
        tint: 0xea580c,
        sparkColor: 0xfb923c,
        labelColor: '#fed7aa',
      },
      jade: {
        itemId: 'ore_jade_crystal',
        name: 'Jade Crystal',
        xp: 44,
        tint: 0x10b981,
        sparkColor: 0x34d399,
        labelColor: '#a7f3d0',
      },
      gold: {
        itemId: 'ore_angkor_gold',
        name: 'Angkor Gold',
        xp: 66,
        tint: 0xfacc15,
        sparkColor: 0xfef08a,
        labelColor: '#fef08a',
      },
    };

    veinDefs.forEach((v, idx) => {
      const m = meta[v.kind];
      const glow = this.add
        .image(v.x, v.y - 4, 'torch_glow')
        .setTint(m.sparkColor)
        .setScale(0.65)
        .setAlpha(0.45)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(21);
      this.tweens.add({ targets: glow, alpha: 0.22, duration: 850 + idx * 70, yoyo: true, repeat: -1 });

      const sprite = this.add
        .image(v.x, v.y, 'lf_boulder')
        .setScale(0.88)
        .setTint(m.tint)
        .setDepth(22)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(v.x, v.y - 34, `⛏️ ${m.name}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: m.labelColor,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5, 1)
        .setDepth(26);

      const pips = [0, 1, 2].map((pi) =>
        this.add
          .rectangle(v.x - 12 + pi * 12, v.y - 26, 9, 4, m.sparkColor)
          .setStrokeStyle(1, 0x0f172a)
          .setDepth(27)
      );

      const node: OreVeinNode = {
        id: `vein_${idx}`,
        kind: v.kind,
        itemId: m.itemId,
        name: m.name,
        xp: m.xp,
        tint: m.tint,
        sparkColor: m.sparkColor,
        x: v.x,
        y: v.y,
        hitsRemaining: 3,
        maxHits: 3,
        ready: true,
        sprite,
        glow,
        label,
        pips,
      };
      this.oreVeins.push(node);

      sprite.on('pointerdown', () => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y);
        if (dist > 260) {
          this.spawnFloatingText(node.x, node.y - 42, 'Move closer to mine!', '#cbd5e1', '11px');
          return;
        }
        this.strikeOreVein(node);
      });
    });
  }

  private buildRelicChests(): void {
    const chestDefs = [
      {
        id: 'chest_swift',
        x: 495,
        y: 424,
        coins: 180,
        reforgeStones: 2,
        accessoryId: 'acc_swift_sandals',
        title: 'Swift Relic Chest',
      },
      {
        id: 'chest_lotus',
        x: 1280,
        y: 249,
        coins: 260,
        reforgeStones: 2,
        accessoryId: 'acc_lotus_jump_charm',
        title: 'Lotus Sanctuary Chest',
      },
      {
        id: 'chest_naga',
        x: 2080,
        y: 409,
        coins: 350,
        reforgeStones: 3,
        accessoryId: 'acc_naga_dash_ring',
        title: 'Naga Vault Chest',
      },
    ];

    chestDefs.forEach((c) => {
      const glow = this.add
        .image(c.x, c.y - 6, 'torch_glow')
        .setTint(0xfacc15)
        .setScale(0.95)
        .setAlpha(0.65)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(21);
      this.tweens.add({ targets: glow, scale: 1.15, alpha: 0.35, duration: 760, yoyo: true, repeat: -1 });

      const texKey = this.textures.exists('lf_chest') ? 'lf_chest' : 'na_chest';
      const sprite = this.add
        .image(c.x, c.y, texKey)
        .setScale(texKey === 'lf_chest' ? 1.45 : 2.1)
        .setDepth(23)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(c.x, c.y - 34, `✨ ${c.title} [E]`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(120, 53, 15, 0.9)',
          padding: { x: 6, y: 2 },
        })
        .setOrigin(0.5, 1)
        .setDepth(28);

      const node: RelicChestNode = {
        ...c,
        opened: false,
        sprite,
        glow,
        label,
      };
      this.relicChests.push(node);

      sprite.on('pointerdown', () => this.openRelicChest(node));
    });
  }

  private buildCavernMobs(): void {
    const mobSpecs: Array<{
      id: string;
      name: string;
      tex: string;
      anim: string;
      scale: number;
      tint: number;
      minX: number;
      maxX: number;
      y: number;
      speed: number;
      flying: boolean;
      hp: number;
      coins: number;
      xp: number;
      dropItemId: string;
    }> = [
      {
        id: 'cavern_boar_1',
        name: 'Laterite Cave Boar',
        tex: 'boar_idle',
        anim: 'boar_idle_anim',
        scale: 1.45,
        tint: 0xfca5a5,
        minX: 640,
        maxX: 1020,
        y: FLOOR_Y - 22,
        speed: 68,
        flying: false,
        hp: 75,
        coins: 48,
        xp: 30,
        dropItemId: 'ore_laterite',
      },
      {
        id: 'cavern_boar_2',
        name: 'Obsidian Tusk Boar',
        tex: 'boar_idle',
        anim: 'boar_idle_anim',
        scale: 1.55,
        tint: 0xc4b5fd,
        minX: 1580,
        maxX: 2060,
        y: FLOOR_Y - 22,
        speed: 82,
        flying: false,
        hp: 105,
        coins: 72,
        xp: 44,
        dropItemId: 'drop_cavern_essence',
      },
      {
        id: 'cavern_wisp_1',
        name: 'Jade Cave Wisp',
        tex: 'pet_spirit',
        anim: 'pet_spirit_idle',
        scale: 2.35,
        tint: 0x6ee7b7,
        minX: 920,
        maxX: 1360,
        y: 530,
        speed: 74,
        flying: true,
        hp: 85,
        coins: 60,
        xp: 38,
        dropItemId: 'ore_jade_crystal',
      },
      {
        id: 'cavern_lantern_1',
        name: 'Cursed Angkor Lantern',
        tex: 'pet_lantern',
        anim: 'pet_lantern_idle',
        scale: 2.45,
        tint: 0xfde047,
        minX: 1840,
        maxX: 2240,
        y: 515,
        speed: 86,
        flying: true,
        hp: 115,
        coins: 92,
        xp: 54,
        dropItemId: 'drop_cavern_essence',
      },
    ];

    mobSpecs.forEach((m) => {
      const startX = (m.minX + m.maxX) / 2;
      const sprite = this.add
        .sprite(startX, m.y, m.tex, 0)
        .setScale(m.scale)
        .setTint(m.tint)
        .setDepth(35)
        .setInteractive({ useHandCursor: true });
      if (this.anims.exists(m.anim)) sprite.play(m.anim);

      const hpBg = this.add.rectangle(startX, m.y - 34, 46, 6, 0x0f172a).setDepth(38);
      const hpFill = this.add.rectangle(startX - 21, m.y - 34, 42, 4, 0xef4444).setOrigin(0, 0.5).setDepth(39);
      const nameText = this.add
        .text(startX, m.y - 42, m.name, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fecaca',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          padding: { x: 4, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setDepth(40);

      const mob: CavernMob = {
        id: m.id,
        name: m.name,
        sprite,
        hpBg,
        hpFill,
        nameText,
        minX: m.minX,
        maxX: m.maxX,
        baseY: m.y,
        speed: m.speed,
        dir: 1,
        flying: m.flying,
        hp: m.hp,
        maxHp: m.hp,
        alive: true,
        baseTint: m.tint,
        rewardCoins: m.coins,
        rewardXp: m.xp,
        dropItemId: m.dropItemId,
        lastHitAt: 0,
        lastContactAt: 0,
      };
      this.mobs.push(mob);

      sprite.on('pointerdown', () => {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.sprite.x, mob.sprite.y) <= 240) {
          this.damageMob(mob, 28 + Math.round(this.player.state.weapon.baseDamage * 0.9));
        }
      });
    });
  }

  private strikeOreVein(node: OreVeinNode): void {
    if (!node.ready || this.transitioning) return;
    const bridge = computeVillageToDungeonBridge(this.player.state);
    // Laterite Miner Set (+25% Mining Speed) cuts vein hits from 3 -> 2 (deals 1.5 hits per swing!)
    const hitPower = bridge.miningSpeedPct >= 0.25 ? 1.5 : 1;
    node.hitsRemaining = Math.max(0, node.hitsRemaining - hitPower);

    soundManager.playSfx('hit');
    this.cameras.main.shake(70, 0.0035);
    this.player.playStateAnimation('attack');
    this.attackAnimUntil = this.time.now + 200;

    // Chip stone/crystal sparks
    this.spawnStoneBurst(node.x, node.y - 6, node.sparkColor, 7);
    this.tweens.add({
      targets: node.sprite,
      scaleX: 0.96,
      scaleY: 0.78,
      duration: 65,
      yoyo: true,
    });

    const visiblePips = Math.ceil(node.hitsRemaining);
    node.pips.forEach((pip, i) => pip.setVisible(i < visiblePips));

    if (node.hitsRemaining > 0) {
      this.spawnFloatingText(node.x, node.y - 44, `⛏️ Crack! (${visiblePips} left)`, '#fde047', '12px');
      return;
    }

    // Shatter ore vein & drop ore + Mining XP!
    node.ready = false;
    node.sprite.setAlpha(0.22).setScale(0.62);
    node.glow.setAlpha(0.08);
    node.label.setText('Respawning...');
    this.spawnStoneBurst(node.x, node.y - 8, node.sparkColor, 16);
    soundManager.playSfx('harvest');

    const dropQty = node.kind === 'laterite' ? 2 : 1;
    this.spawnFloatingText(
      node.x,
      node.y - 46,
      `+${dropQty} ${node.name} · +${node.xp} Mining XP`,
      '#4ade80',
      '13px'
    );
    EventBus.emit('cavern:reward', {
      skillId: 'mining',
      xp: node.xp,
      items: [{ itemId: node.itemId, quantity: dropQty }],
      label: `⛏️ Mined ${dropQty}× ${node.name} (+${node.xp} Mining XP)!`,
    });

    this.time.delayedCall(25000, () => {
      if (!node.sprite.active) return;
      node.ready = true;
      node.hitsRemaining = node.maxHits;
      node.sprite.setAlpha(1).setScale(0.88);
      node.glow.setAlpha(0.45);
      node.label.setText(`⛏️ ${node.name}`);
      node.pips.forEach((pip) => pip.setVisible(true));
    });
  }

  private openRelicChest(node: RelicChestNode): void {
    if (node.opened || this.transitioning) return;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y);
    if (dist > 150) {
      this.spawnFloatingText(node.x, node.y - 42, 'Climb/Grapple closer to open!', '#fde047', '11px');
      return;
    }

    node.opened = true;
    node.sprite.setTint(0x64748b).setAlpha(0.6);
    node.glow.setVisible(false);
    node.label.setText('✓ Looted').setColor('#94a3b8');

    soundManager.playSfx('level_up');
    this.spawnStoneBurst(node.x, node.y - 10, 0xfacc15, 18);

    const accDef = ACCESSORY_DEFS[node.accessoryId];
    const alreadyOwnsAcc =
      this.player.state.inventory.some((i) => i.itemId === node.accessoryId && i.quantity > 0) ||
      (this.player.state.loadout.accessories ?? []).includes(node.accessoryId);

    const items: Array<{ itemId: string; quantity: number }> = [
      { itemId: 'mat_reforge_stone', quantity: node.reforgeStones },
    ];
    let bonusCoins = node.coins;
    let lootSummary = `+${bonusCoins}c, ${node.reforgeStones}× Reforge Stone`;

    if (!alreadyOwnsAcc && accDef) {
      items.push({ itemId: accDef.id, quantity: 1 });
      lootSummary += `, ${accDef.icon} ${accDef.name}`;
    } else {
      bonusCoins += 160;
      items.push({ itemId: 'ore_jade_crystal', quantity: 2 });
      lootSummary = `+${bonusCoins}c, ${node.reforgeStones}× Reforge Stone, 2× Jade Crystal`;
    }

    this.spawnFloatingText(node.x, node.y - 52, `🎁 ${lootSummary}!`, '#fde047', '13px');
    EventBus.emit('cavern:reward', {
      skillId: 'mining',
      xp: 40,
      coins: bonusCoins,
      items,
      label: `🎁 Opened ${node.title}: ${lootSummary}!`,
    });
  }

  private damageMob(mob: CavernMob, amount: number): void {
    if (!mob.alive || this.transitioning) return;
    const now = this.time.now;
    if (now - mob.lastHitAt < 180) return;
    mob.lastHitAt = now;

    const bridge = computeVillageToDungeonBridge(this.player.state);
    const dmg = Math.max(8, Math.round(amount * (1 + bridge.armorDamagePctBonus)));
    mob.hp = Math.max(0, mob.hp - dmg);
    soundManager.playSfx('hit');
    mob.sprite.setTintFill(0xffffff);
    this.time.delayedCall(90, () => {
      if (mob.sprite.active && mob.alive) mob.sprite.setTint(mob.baseTint);
    });
    mob.hpFill.width = Math.max(0, 42 * (mob.hp / mob.maxHp));
    this.spawnFloatingText(mob.sprite.x, mob.sprite.y - 34, `-${dmg}`, '#facc15', '14px');

    if (mob.hp <= 0) {
      mob.alive = false;
      mob.sprite.setVisible(false);
      mob.hpBg.setVisible(false);
      mob.hpFill.setVisible(false);
      mob.nameText.setVisible(false);
      this.spawnStoneBurst(mob.sprite.x, mob.sprite.y, 0xc084fc, 14);
      soundManager.playSfx('level_up');

      const combatSkill: SkillId =
        this.player.state.activeClass === 'archer'
          ? 'ranged'
          : this.player.state.activeClass === 'mystic'
            ? 'magic'
            : this.player.state.activeClass === 'tamer'
              ? 'summoning'
              : this.player.state.activeClass === 'shadow'
                ? 'rogue'
                : 'melee';

      this.spawnFloatingText(
        mob.sprite.x,
        mob.sprite.y - 26,
        `+${mob.rewardCoins}c · +${mob.rewardXp} Combat XP`,
        '#4ade80',
        '13px'
      );
      EventBus.emit('cavern:reward', {
        skillId: combatSkill,
        xp: mob.rewardXp,
        coins: mob.rewardCoins,
        items: [{ itemId: mob.dropItemId, quantity: 1 }],
        label: `⚔️ Defeated ${mob.name} (+${mob.rewardCoins}c & loot)!`,
      });

      this.time.delayedCall(22000, () => {
        if (!mob.sprite.active) return;
        mob.alive = true;
        mob.hp = mob.maxHp;
        mob.hpFill.width = 42;
        mob.sprite.setVisible(true).setTint(mob.baseTint);
        mob.hpBg.setVisible(true);
        mob.hpFill.setVisible(true);
        mob.nameText.setVisible(true);
      });
    }
  }

  private performJump(): void {
    if (this.transitioning) return;
    if (this.grappleActive) {
      this.grappleActive = false;
      this.grappleGraphics.clear();
    }
    const bridge = computeVillageToDungeonBridge(this.player.state);
    const jumpMult = 1 + bridge.jumpPowerBonusPct;
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;

    if (onGround) {
      this.jumpsUsed = 1;
      this.player.body.setVelocityY(-515 * jumpMult);
      soundManager.playSfx('swing');
    } else if (this.jumpsUsed < 2) {
      if (bridge.hasDoubleJump) {
        this.jumpsUsed = 2;
        this.player.body.setVelocityY(-490 * jumpMult);
        soundManager.playSfx('magic');
        this.spawnLotusPetalBurst(this.player.x, this.player.y + 14);
        this.spawnFloatingText(this.player.x, this.player.y - 28, '🌸 Lotus Double-Jump!', '#f472b6', '13px');
      } else {
        this.jumpsUsed = 2;
        this.spawnFloatingText(
          this.player.x,
          this.player.y - 30,
          'Equip Lotus Jump Charm for 2nd Jump (or [G] Grapple!)',
          '#cbd5e1',
          '11px'
        );
      }
    }
  }

  private performDash(): void {
    const now = this.time.now;
    if (now < this.dashCooldownUntil || this.transitioning) return;
    const bridge = computeVillageToDungeonBridge(this.player.state);
    const dir = this.player.facingRight ? 1 : -1;
    this.dashCooldownUntil = now + Math.round(900 * bridge.dashCooldownMult);
    this.dashActiveUntil = now + 200;
    this.player.body.setVelocityX(dir * 590);
    this.player.body.setVelocityY(-40);
    this.player.paperDoll.flashWhite(110);
    soundManager.playSfx('swing');
  }

  /**
   * Bamboo Vine Grapple ([G] key or touch GRAPPLE button):
   * Finds the nearest overhead/forward platform ledge within 360px and zips player smoothly onto it.
   */
  private performBambooGrapple(): void {
    const now = this.time.now;
    if (now < this.grappleCooldownUntil || this.transitioning) return;

    const px = this.player.x;
    const py = this.player.y;
    const dir = this.player.facingRight ? 1 : -1;

    let bestPlat: PlatformDef | null = null;
    let bestScore = Infinity;

    for (const p of this.platformDefs) {
      const anchorX = Phaser.Math.Clamp(px + dir * 48, p.x - p.w / 2 + 18, p.x + p.w / 2 - 18);
      const anchorY = p.y - 10;
      const dy = py - anchorY; // positive when platform is above player
      const dist = Phaser.Math.Distance.Between(px, py, anchorX, anchorY);
      if (dy < 36 || dist > 380) continue;
      // Prefer overhead platforms in facing direction
      const forwardBias = Math.sign(anchorX - px) === dir ? 0.72 : 1.05;
      const score = dist * forwardBias;
      if (score < bestScore) {
        bestScore = score;
        bestPlat = p;
      }
    }

    if (!bestPlat) {
      this.spawnFloatingText(px, py - 34, '🌿 No overhead ledge in Grapple range!', '#86efac', '11px');
      return;
    }

    const targetX = Phaser.Math.Clamp(px + dir * 40, bestPlat.x - bestPlat.w / 2 + 24, bestPlat.x + bestPlat.w / 2 - 24);
    const targetY = bestPlat.y - 34;

    this.grappleActive = true;
    this.grappleTargetX = targetX;
    this.grappleTargetY = targetY;
    this.grappleEndAt = now + 380;
    this.grappleCooldownUntil = now + 1150;
    this.jumpsUsed = 1; // Allow Lotus Double-Jump right after zipping!

    soundManager.playSfx('swing');
    this.spawnStoneBurst(targetX, bestPlat.y, 0x4ade80, 8);
    this.spawnFloatingText(px, py - 32, '🌿 Bamboo Vine Grapple!', '#4ade80', '13px');
  }

  private performAttackOrMine(): void {
    const now = this.time.now;
    const bridge = computeVillageToDungeonBridge(this.player.state);
    const cd = Math.max(170, Math.round(290 / (1 + bridge.miningSpeedPct)));
    if (now < this.attackCooldownUntil || this.transitioning) return;
    this.attackCooldownUntil = now + cd;
    this.attackAnimUntil = now + 200;
    this.player.playStateAnimation('attack');
    soundManager.playSfx('swing');

    const dir = this.player.facingRight ? 1 : -1;
    const hitX = this.player.x + dir * 42;
    const hitY = this.player.y;

    // Slash visual
    if (this.textures.exists('fx_slash')) {
      const slash = this.add
        .sprite(hitX, hitY, 'fx_slash', 0)
        .setScale(1.85)
        .setFlipX(dir < 0)
        .setTint(0xfde047)
        .setDepth(60);
      if (this.anims.exists('slash_curved')) {
        slash.play('slash_curved');
        slash.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => slash.destroy());
      } else {
        this.time.delayedCall(150, () => slash.destroy());
      }
    }

    // Check nearby Ore Veins
    let hitSomething = false;
    for (const vein of this.oreVeins) {
      if (!vein.ready) continue;
      if (Phaser.Math.Distance.Between(hitX, hitY, vein.x, vein.y) < 76) {
        this.strikeOreVein(vein);
        hitSomething = true;
      }
    }

    // Check nearby Cavern Mobs
    const baseDmg = 24 + Math.round(this.player.state.weapon.baseDamage * 0.95);
    for (const mob of this.mobs) {
      if (!mob.alive) continue;
      if (Phaser.Math.Distance.Between(hitX, hitY, mob.sprite.x, mob.sprite.y) < 88) {
        this.damageMob(mob, baseDmg);
        hitSomething = true;
      }
    }

    if (!hitSomething) {
      this.tryInteractNearest(false);
    }
  }

  private tryInteractNearest(allowExit = true): void {
    if (this.transitioning) return;
    if (allowExit && Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_X, EXIT_Y) < 92) {
      this.exitToOverworld();
      return;
    }
    for (const chest of this.relicChests) {
      if (!chest.opened && Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y) < 92) {
        this.openRelicChest(chest);
        return;
      }
    }
    for (const vein of this.oreVeins) {
      if (vein.ready && Phaser.Math.Distance.Between(this.player.x, this.player.y, vein.x, vein.y) < 88) {
        this.strikeOreVein(vein);
        return;
      }
    }
  }

  private triggerGroundSlamShockwave(): void {
    soundManager.playSfx('hit');
    this.cameras.main.shake(150, 0.008);
    const ring = this.add
      .circle(this.player.x, this.player.y + 18, 16, 0xf59e0b, 0.28)
      .setStrokeStyle(4, 0xfde047, 0.95)
      .setDepth(58);
    this.tweens.add({
      targets: ring,
      scaleX: 7.5,
      scaleY: 2.2,
      alpha: 0,
      duration: 360,
      onComplete: () => ring.destroy(),
    });
    this.spawnFloatingText(this.player.x, this.player.y - 36, '🪨 YAKSHA GROUND-SLAM!', '#fbbf24', '14px');

    for (const mob of this.mobs) {
      if (!mob.alive) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.sprite.x, mob.sprite.y) < 165) {
        this.damageMob(mob, 38);
      }
    }
    for (const vein of this.oreVeins) {
      if (!vein.ready) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, vein.x, vein.y) < 145) {
        this.strikeOreVein(vein);
      }
    }
  }

  private handlePlayerContactDamage(mob: CavernMob): void {
    const now = this.time.now;
    if (now < this.invulnerableUntil || this.transitioning) return;
    const bridge = computeVillageToDungeonBridge(this.player.state);

    // Naga Scale Set: Orbiting Water Shield blocks 1 hit every 20s!
    if (bridge.hasWaterShield && now >= this.waterShieldReadyAt) {
      this.waterShieldReadyAt = now + 20_000;
      this.invulnerableUntil = now + 900;
      soundManager.playSfx('magic');
      this.spawnStoneBurst(this.player.x, this.player.y, 0x38bdf8, 14);
      this.spawnFloatingText(this.player.x, this.player.y - 44, '💧 WATER SHIELD BLOCKED HIT!', '#38bdf8', '14px');
      return;
    }

    const rawDmg = 18;
    const dmg = Math.max(4, rawDmg - Math.floor(bridge.effectiveDefense * 0.45));
    this.invulnerableUntil = now + 950;
    this.player.state.hp = Math.max(0, this.player.state.hp - dmg);
    this.player.paperDoll.flashWhite(150);
    this.cameras.main.shake(90, 0.005);
    soundManager.playSfx('hit');
    const knock = this.player.x < mob.sprite.x ? -1 : 1;
    this.player.body.setVelocity(knock * 220, -210);
    this.spawnFloatingText(this.player.x, this.player.y - 36, `-${dmg}`, '#f87171', '14px');

    if (this.player.state.hp <= 0) {
      // Safe rescue back to Cavern Entrance with full HP
      this.player.state.hp = bridge.effectiveMaxHp;
      this.player.sprite.setPosition(235, FLOOR_Y - 48);
      this.player.body.setVelocity(0, 0);
      EventBus.emit('ui:toast', { text: '💫 Rescued back to Cavern Entrance with full HP!' });
    }
    EventBus.emit('player:state', this.player.state);
  }

  private spawnLotusPetalBurst(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const petal = this.add
        .ellipse(x, y, 8, 4, i % 2 === 0 ? 0xf472b6 : 0xfce7f3, 0.95)
        .setRotation(angle)
        .setDepth(60);
      this.tweens.add({
        targets: petal,
        x: x + Math.cos(angle) * 38,
        y: y + Math.sin(angle) * 20 + 10,
        alpha: 0,
        scale: 0.4,
        duration: 380,
        ease: 'Cubic.easeOut',
        onComplete: () => petal.destroy(),
      });
    }
  }

  private spawnStoneBurst(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const chip = this.add.rectangle(x, y, 5, 5, color).setDepth(59);
      const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(18, 54);
      this.tweens.add({
        targets: chip,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist + 14,
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: 360,
        ease: 'Quad.easeOut',
        onComplete: () => chip.destroy(),
      });
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, fontSize = '13px'): void {
    const t = this.add
      .text(x, y, text, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize,
        fontStyle: 'bold',
        color,
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(95);
    this.tweens.add({
      targets: t,
      y: y - 34,
      alpha: 0,
      duration: 920,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private exitToOverworld(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    const spawnCoords =
      this.returnMapId === 'temple_district' ? { x: 1300, y: 460 } : { x: 320, y: 385 };
    this.cameras.main.fadeOut(220, 8, 12, 22);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId: this.returnMapId,
        spawnX: spawnCoords.x,
        spawnY: spawnCoords.y,
        playerState: {
          ...this.player.state,
          zone: 'overworld',
          currentMapId: this.returnMapId,
        },
      });
    });
  }

  update(time: number, delta: number): void {
    if (this.transitioning) return;
    const dt = delta / 1000;

    // Parallax scrolling
    const camX = this.cameras.main.scrollX;
    if (this.bgFar) this.bgFar.tilePositionX = camX * 0.18;
    if (this.bgMid) this.bgMid.tilePositionX = camX * 0.42;

    // Spores drift
    for (const s of this.spores) {
      s.dot.x += s.vx * dt;
      s.dot.y += s.vy * dt;
      if (s.dot.y < 90) s.dot.y = FLOOR_Y - 24;
      if (s.dot.x < 40) s.dot.x = WORLD_W - 40;
      if (s.dot.x > WORLD_W - 40) s.dot.x = 40;
    }

    const typing =
      document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

    const bridge = computeVillageToDungeonBridge(this.player.state);
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;

    if (!onGround) {
      this.peakAirVy = Math.max(this.peakAirVy, this.player.body.velocity.y);
    } else {
      // Yeak Thmor Stone Set: Hard landing shockwave!
      if (!this.prevOnGround && this.peakAirVy > 420 && bridge.hasGroundSlamShockwave) {
        this.triggerGroundSlamShockwave();
      }
      this.jumpsUsed = 0;
      this.peakAirVy = 0;
    }
    this.prevOnGround = onGround;

    // Bamboo Vine Grapple Zip Physics
    this.grappleGraphics.clear();
    if (this.grappleActive) {
      const dx = this.grappleTargetX - this.player.x;
      const dy = this.grappleTargetY - this.player.y;
      const dist = Math.hypot(dx, dy);

      // Draw segmented bamboo vine line + lotus hook ring
      this.grappleGraphics.lineStyle(4, 0x166534, 1);
      this.grappleGraphics.beginPath();
      this.grappleGraphics.moveTo(this.player.x, this.player.y - 8);
      this.grappleGraphics.lineTo(this.grappleTargetX, this.grappleTargetY + 14);
      this.grappleGraphics.strokePath();

      this.grappleGraphics.lineStyle(2, 0x4ade80, 0.95);
      this.grappleGraphics.beginPath();
      this.grappleGraphics.moveTo(this.player.x, this.player.y - 8);
      this.grappleGraphics.lineTo(this.grappleTargetX, this.grappleTargetY + 14);
      this.grappleGraphics.strokePath();

      this.grappleGraphics.fillStyle(0xf472b6, 1);
      this.grappleGraphics.fillCircle(this.grappleTargetX, this.grappleTargetY + 14, 5);

      if (dist < 24 || time >= this.grappleEndAt) {
        this.grappleActive = false;
        this.player.body.setVelocity(dx * 1.4, -220);
      } else {
        const zipSpeed = 760;
        this.player.body.setVelocity((dx / dist) * zipSpeed, (dy / dist) * zipSpeed);
      }
    } else if (!typing && time >= this.dashActiveUntil) {
      let moveX = this.joystick.x;
      if (this.cursors?.left.isDown || this.keys?.A.isDown) moveX -= 1;
      if (this.cursors?.right.isDown || this.keys?.D.isDown) moveX += 1;
      moveX = Phaser.Math.Clamp(moveX, -1, 1);

      const moveSpeed = 238 * (1 + bridge.moveSpeedBonusPct);
      this.player.body.setVelocityX(moveX * moveSpeed);

      if (moveX < -0.1) this.player.facing = 'left';
      else if (moveX > 0.1) this.player.facing = 'right';

      if (
        (this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) ||
        (this.keys && (Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)))
      ) {
        this.performJump();
      }
      if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.G)) {
        this.performBambooGrapple();
      }
      if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) {
        this.performDash();
      }
      if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.J)) {
        this.performAttackOrMine();
      }
      if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.tryInteractNearest();
      }
    }

    // Player animation state
    if (time < this.attackAnimUntil) {
      this.player.playStateAnimation('attack');
    } else if (!onGround) {
      this.player.playStateAnimation('jump');
    } else if (Math.abs(this.player.body.velocity.x) > 16) {
      this.player.playStateAnimation('walk');
    } else {
      this.player.playStateAnimation('idle');
    }
    this.player.syncVisuals(time, onGround);

    // Naga Scale Set Orbiting Water Shield Visual
    const shieldReady = bridge.hasWaterShield && time >= this.waterShieldReadyAt;
    this.waterShieldOrb.setVisible(shieldReady);
    this.waterShieldRing.setVisible(shieldReady);
    if (shieldReady) {
      const ang = time * 0.0042;
      const ox = this.player.x + Math.cos(ang) * 34;
      const oy = this.player.y - 6 + Math.sin(ang) * 18;
      this.waterShieldOrb.setPosition(ox, oy);
      this.waterShieldRing.setPosition(ox, oy);
    }

    // Update Wandering Cavern Mobs
    for (const mob of this.mobs) {
      if (!mob.alive) continue;
      mob.sprite.x += mob.dir * mob.speed * dt;
      if (mob.sprite.x >= mob.maxX) mob.dir = -1;
      if (mob.sprite.x <= mob.minX) mob.dir = 1;
      mob.sprite.setFlipX(mob.dir > 0);
      if (mob.flying) {
        mob.sprite.y = mob.baseY + Math.sin(time * 0.004 + mob.minX) * 14;
      }
      mob.hpBg.setPosition(mob.sprite.x, mob.sprite.y - 34);
      mob.hpFill.setPosition(mob.sprite.x - 21, mob.sprite.y - 34);
      mob.nameText.setPosition(mob.sprite.x, mob.sprite.y - 42);

      const distToPlayer = Phaser.Math.Distance.Between(this.player.x, this.player.y, mob.sprite.x, mob.sprite.y);
      if (distToPlayer < 36 && time - mob.lastContactAt > 900) {
        mob.lastContactAt = time;
        this.handlePlayerContactDamage(mob);
      }
    }

    // Exit Portal proximity
    const nearExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_X, EXIT_Y) < 92;
    if (nearExit !== this.nearExitSent) {
      this.nearExitSent = nearExit;
      EventBus.emit('portal:proximity', {
        nearPortal: nearExit,
        label: nearExit ? 'Press [E] to Return to Village' : '',
        targetZone: 'overworld',
      });
    }
  }
}
