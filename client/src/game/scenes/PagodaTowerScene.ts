import Phaser from 'phaser';
import {
  INITIAL_PLAYER_STATE,
  type BossId,
  type PlayerState,
  type WeaponAuraId,
} from '@shared/types';
import { KHMER_BOSSES } from '@shared/khmerBosses';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { soundManager } from '../systems/SoundManager';

const ARENA_W = 1360;
const ARENA_H = 720;
const FLOOR_Y = 635;
const EXIT_X = 110;
const NEXT_PORTAL_X = 1240;

interface TowerEnemy {
  id: string;
  name: string;
  isBoss: boolean;
  bossId?: BossId;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  hp: number;
  maxHp: number;
  attackDmg: number;
  speed: number;
  flying: boolean;
  baseY: number;
  dir: number;
  alive: boolean;
  baseTint: number;
  phase2: boolean;
  lastHitAt: number;
  lastActionAt: number;
  lastContactAt: number;
}

interface TowerProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  fromPlayer: boolean;
  radius: number;
  bornAt: number;
  gfx: Phaser.GameObjects.Arc;
}

const BOSS_CYCLE: BossId[] = ['sdech_kongkaeb', 'arp_prey_chrov', 'yeak_thmor', 'neak_reach'];

/**
 * Update 1.4 — Endless 50-Floor Pagoda Tower Scene (Side-Scrolling Gauntlet & Mythic Boss Floors)
 * - Normal Floors: Escalating cavern/spirit wave gauntlets with Next Floor portal upon clearing.
 * - Every 5th Floor (5, 10, ..., 50): Mythic Boss Floor with scaled Khmer Bosses.
 * - Reuses Player PaperDoll, Double Jump, Dash, Bamboo Vine Grapple [G], and Khmer Weapon combat.
 */
export class PagodaTowerScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE, zone: 'tower' };
  private floor = 1;
  private partyMode: 'solo' | 'coop' = 'solo';
  private player!: Player;

  private floorCollider!: Phaser.Physics.Arcade.StaticGroup;
  private elevatedPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies: TowerEnemy[] = [];
  private projectiles: TowerProjectile[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E' | 'G' | 'J' | 'SHIFT' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };

  private floorCleared = false;
  private transitioning = false;
  private defeated = false;
  private jumpsUsed = 0;
  private lastAttackAt = 0;
  private attackAnimUntil = 0;
  private lastDashAt = 0;
  private dashUntil = 0;
  private lastGrappleAt = 0;
  private invulnUntil = 0;

  private grappleLine!: Phaser.GameObjects.Graphics;
  private grappleActiveUntil = 0;
  private grappleTarget = { x: 0, y: 0 };

  private hudBannerTitle!: Phaser.GameObjects.Text;
  private hudBannerSub!: Phaser.GameObjects.Text;
  private nextPortalGroup: Phaser.GameObjects.GameObject[] = [];
  private promptText!: Phaser.GameObjects.Text;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('PagodaTowerScene');
  }

  init(data?: { playerState?: PlayerState; floor?: number; partyMode?: 'solo' | 'coop' }): void {
    this.floor = Math.max(1, Math.min(50, Math.floor(data?.floor ?? 1)));
    this.partyMode = data?.partyMode ?? 'solo';
    this.initialState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'tower',
          activeMount: null,
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
          currencies: { ...data.playerState.currencies },
          lifeStats: { ...data.playerState.lifeStats },
        }
      : { ...INITIAL_PLAYER_STATE, zone: 'tower', activeMount: null };
    this.floorCleared = false;
    this.transitioning = false;
    this.defeated = false;
    this.enemies = [];
    this.projectiles = [];
    this.nextPortalGroup = [];
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    this.physics.world.gravity.y = 920;
    this.physics.world.setBounds(24, 0, ARENA_W - 48, ARENA_H);
    soundManager.playBgm('boss');

    const isBossFloor = this.floor % 5 === 0;

    // 1. Tower Backdrop & Sandstone Platforms
    this.drawTowerBackdrop(isBossFloor);
    this.buildPlatforms();
    this.buildExitPortal();

    // 2. Player Setup (Full HP on Floor Entry for fair progression)
    const bridge = computeVillageToDungeonBridge(this.initialState);
    const startState: PlayerState = {
      ...this.initialState,
      hp: Math.max(Math.round(bridge.effectiveMaxHp * 0.75), Math.min(bridge.effectiveMaxHp, this.initialState.hp || bridge.effectiveMaxHp)),
    };
    this.player = new Player(this, 220, FLOOR_Y - 36, startState, 'dungeon');
    this.player.body.setGravityY(0);
    this.physics.add.collider(this.player.sprite, this.floorCollider);
    this.physics.add.collider(this.player.sprite, this.elevatedPlatforms, undefined, () => {
      const dropThrough = this.keys.S.isDown || this.cursors.down.isDown;
      return !dropThrough && this.player.body.velocity.y >= 0;
    });

    this.grappleLine = this.add.graphics().setDepth(90);

    // 3. Spawn Floor Enemies or Scaled Mythic Boss
    if (isBossFloor) {
      this.spawnMythicBoss();
    } else {
      this.spawnNormalWave();
    }

    // 4. Crisp Floor X / 50 Arena Banner
    this.buildFloorBanner(isBossFloor);

    this.promptText = this.add
      .text(0, 0, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(2400)
      .setVisible(false);

    // 5. Camera & Controls
    this.cameras.main.setBounds(0, 0, ARENA_W, ARENA_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.fadeIn(220, 14, 10, 28);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E,G,J,SHIFT,SPACE') as Record<
      'W' | 'A' | 'S' | 'D' | 'E' | 'G' | 'J' | 'SHIFT' | 'SPACE',
      Phaser.Input.Keyboard.Key
    >;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.transitioning || this.defeated) return;
      if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return;
      if (pointer.rightButtonDown()) {
        this.fireBambooGrapple(pointer.worldX, pointer.worldY);
      } else {
        this.performAttack(pointer.worldX, pointer.worldY);
      }
    });

    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.joystick = vec;
      }),
      EventBus.on('input:attack', () => {
        const dir = this.player.facing === 'left' ? -1 : 1;
        this.performAttack(this.player.x + dir * 160, this.player.y - 16);
      }),
      EventBus.on('input:jump', () => {
        const b = computeVillageToDungeonBridge(this.player.state);
        const maxJ = b.hasDoubleJump ? 2 : 1;
        if (this.jumpsUsed < maxJ) {
          this.jumpsUsed += 1;
          this.player.body.setVelocityY(-470 * (1 + b.jumpPowerBonusPct));
        }
      }),
      EventBus.on('input:grapple', () => {
        const dir = this.player.facing === 'left' ? -1 : 1;
        this.fireBambooGrapple(this.player.x + dir * 240, this.player.y - 170);
      }),
      EventBus.on('input:dash', () => this.tryDash()),
      EventBus.on('input:interact', () => this.tryInteractNearest()),
      EventBus.on('player:loadoutChanged', ({ loadout, playerState }) => {
        this.player.applyLoadoutUpdate(loadout, playerState);
      }),
      EventBus.on('player:stateSync', (nextState) => {
        this.player.syncPlayerState(nextState);
      }),
      EventBus.on('travel:execute', (req) => {
        if (this.transitioning) return;
        this.exitToTempleDistrict(req.mapId ?? 'temple_district');
      })
    );

    EventBus.emit('scene:ready', { zone: 'tower' });
    EventBus.emit('player:state', this.player.state);
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: 'overworld' });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.player.destroy();
    });
  }

  private drawTowerBackdrop(isBossFloor: boolean): void {
    const g = this.add.graphics().setDepth(0);
    const topColor = isBossFloor ? 0x2e1065 : this.floor >= 25 ? 0x1e1b4b : 0x172554;
    const midColor = isBossFloor ? 0x4c1d95 : 0x1e293b;
    g.fillGradientStyle(topColor, topColor, midColor, midColor, 1);
    g.fillRect(0, 0, ARENA_W, ARENA_H);

    // Subtle parallax cavern backdrop if loaded
    if (this.textures.exists('lf_bg_1')) {
      this.add.tileSprite(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 'lf_bg_1').setAlpha(0.28).setDepth(1);
    }

    // Carved Khmer Pagoda Columns & Lantern Braziers
    const colG = this.add.graphics().setDepth(4);
    for (let cx = 180; cx < ARENA_W; cx += 240) {
      colG.fillStyle(0x44403c, 0.72);
      colG.fillRect(cx - 16, 80, 32, FLOOR_Y - 80);
      colG.lineStyle(2, isBossFloor ? 0xf59e0b : 0xa8a29e, 0.45);
      colG.strokeRect(cx - 16, 80, 32, FLOOR_Y - 80);

      // Flickering Temple Brazier
      if (this.textures.exists('sv_campfire_16')) {
        const fire = this.add.sprite(cx, FLOOR_Y - 8, 'sv_campfire_16', 0).setScale(1.15).setDepth(8);
        if (this.anims.exists('campfire_burn')) fire.play('campfire_burn');
      }
      if (this.textures.exists('torch_glow')) {
        this.add
          .image(cx, FLOOR_Y - 18, 'torch_glow')
          .setTint(isBossFloor ? 0xf59e0b : 0x38bdf8)
          .setScale(0.95)
          .setAlpha(0.32)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(6);
      }
    }

    // Main Stone Pagoda Floor
    const floorG = this.add.graphics().setDepth(10);
    floorG.fillStyle(0x57534e, 1);
    floorG.fillRect(0, FLOOR_Y, ARENA_W, ARENA_H - FLOOR_Y);
    floorG.fillStyle(isBossFloor ? 0xf59e0b : 0xd6d3d1, 0.9);
    floorG.fillRect(0, FLOOR_Y, ARENA_W, 6);
  }

  private buildPlatforms(): void {
    this.floorCollider = this.physics.add.staticGroup();
    const ground = this.add.rectangle(ARENA_W / 2, FLOOR_Y + 42, ARENA_W, 84, 0x000000, 0);
    this.floorCollider.add(ground);

    this.elevatedPlatforms = this.physics.add.staticGroup();
    const plats = [
      { x: 380, y: 505, w: 220 },
      { x: 680, y: 420, w: 260 },
      { x: 980, y: 505, w: 220 },
    ];
    for (const p of plats) {
      const g = this.add.graphics().setDepth(12);
      g.fillStyle(0x44403c, 1);
      g.fillRoundedRect(p.x - p.w / 2, p.y - 8, p.w, 16, 6);
      g.lineStyle(2, 0xfacc15, 0.75);
      g.strokeRoundedRect(p.x - p.w / 2, p.y - 8, p.w, 16, 6);

      const col = this.add.rectangle(p.x, p.y, p.w, 16, 0x000000, 0);
      this.elevatedPlatforms.add(col);
    }
  }

  private buildExitPortal(): void {
    if (this.textures.exists('portal_vortex')) {
      const aura = this.add
        .image(EXIT_X, FLOOR_Y - 46, 'portal_vortex')
        .setTint(0x38bdf8)
        .setScale(1.1)
        .setAlpha(0.6)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(15);
      this.tweens.add({ targets: aura, scale: 1.25, alpha: 0.3, duration: 850, yoyo: true, repeat: -1 });
    }
    const hit = this.add
      .rectangle(EXIT_X, FLOOR_Y - 44, 68, 86, 0x1e293b, 0.35)
      .setStrokeStyle(2, 0x38bdf8)
      .setDepth(16)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.exitToTempleDistrict('temple_district'));

    this.add
      .text(EXIT_X, FLOOR_Y - 96, 'EXIT TO TEMPLE [E]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#bae6fd',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(20);
  }

  private buildFloorBanner(isBossFloor: boolean): void {
    const cx = this.scale.width / 2;
    this.hudBannerTitle = this.add
      .text(
        cx,
        88,
        isBossFloor
          ? `🔥 PAGODA TOWER · FLOOR ${this.floor} / 50 (MYTHIC BOSS)`
          : `🗼 PAGODA TOWER · FLOOR ${this.floor} / 50`,
        {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: isBossFloor ? '#fde047' : '#e0f2fe',
          backgroundColor: isBossFloor ? 'rgba(88, 28, 135, 0.92)' : 'rgba(15, 23, 42, 0.88)',
          padding: { x: 14, y: 5 },
        }
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2200);

    this.hudBannerSub = this.add
      .text(cx, 120, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: { x: 10, y: 3 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2200);

    this.refreshBannerSubtitle();
  }

  private refreshBannerSubtitle(): void {
    const alive = this.enemies.filter((e) => e.alive);
    if (this.floorCleared) {
      this.hudBannerSub.setText(
        this.floor >= 50
          ? '🏆 FLOOR 50 CONQUERED! Enter the Golden Portal on the right!'
          : `✨ FLOOR ${this.floor} CLEARED! Walk right or Click NEXT FLOOR PORTAL →`
      );
      return;
    }
    if (this.floor % 5 === 0 && alive[0]) {
      const b = alive[0];
      this.hudBannerSub.setText(
        `⚔️ ${b.name} · HP ${Math.max(0, Math.round(b.hp)).toLocaleString()} / ${b.maxHp.toLocaleString()} · Click/Space Attack · [G] Grapple`
      );
    } else {
      this.hudBannerSub.setText(
        `⚔️ Enemies Remaining: ${alive.length} · Click/Space Attack · [Shift] Dash · [G] Grapple`
      );
    }
  }

  private spawnNormalWave(): void {
    const count = 3 + Math.min(4, Math.floor(this.floor / 7));
    const templates = [
      { name: 'Pagoda Shadow Boar', tex: 'boar_idle', anim: 'boar_idle_anim', scale: 1.55, tint: 0xfca5a5, flying: false },
      { name: 'Temple Spirit Wisp', tex: 'pet_spirit', anim: 'pet_spirit_idle', scale: 2.35, tint: 0xc084fc, flying: true },
      { name: 'Cursed Pagoda Lantern', tex: 'pet_lantern', anim: 'pet_lantern_idle', scale: 2.45, tint: 0xfacc15, flying: true },
      { name: 'Tower Mud Hopper', tex: 'pet_frog', anim: 'pet_frog_idle', scale: 2.35, tint: 0x4ade80, flying: false },
    ];

    for (let i = 0; i < count; i++) {
      const tpl = templates[(this.floor + i) % templates.length];
      const spawnX = 390 + i * Math.floor(420 / Math.max(1, count));
      const baseY = tpl.flying ? 430 + (i % 2) * 55 : FLOOR_Y - 22;
      const maxHp = Math.round((85 + this.floor * 26) * (this.partyMode === 'coop' ? 1.25 : 1));
      const atk = Math.round(10 + this.floor * 0.9);

      const sprite = this.add
        .sprite(spawnX, baseY, tpl.tex, 0)
        .setScale(tpl.scale)
        .setTint(tpl.tint)
        .setDepth(35)
        .setInteractive({ useHandCursor: true });
      if (this.anims.exists(tpl.anim)) sprite.play(tpl.anim);

      const hpBg = this.add.rectangle(spawnX, baseY - 38, 52, 6, 0x0f172a).setDepth(38);
      const hpFill = this.add.rectangle(spawnX - 24, baseY - 38, 48, 4, 0xef4444).setOrigin(0, 0.5).setDepth(39);
      const nameText = this.add
        .text(spawnX, baseY - 46, tpl.name, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fecaca',
          backgroundColor: 'rgba(15, 23, 42, 0.84)',
          padding: { x: 4, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setDepth(40);

      const enemy: TowerEnemy = {
        id: `tower_mob_${this.floor}_${i}`,
        name: tpl.name,
        isBoss: false,
        sprite,
        hpBg,
        hpFill,
        nameText,
        hp: maxHp,
        maxHp,
        attackDmg: atk,
        speed: 78 + Math.min(60, this.floor * 1.4),
        flying: tpl.flying,
        baseY,
        dir: i % 2 === 0 ? -1 : 1,
        alive: true,
        baseTint: tpl.tint,
        phase2: false,
        lastHitAt: 0,
        lastActionAt: 0,
        lastContactAt: 0,
      };
      this.enemies.push(enemy);
      sprite.on('pointerdown', () => this.performAttack(enemy.sprite.x, enemy.sprite.y));
    }
  }

  private spawnMythicBoss(): void {
    const bossId = BOSS_CYCLE[Math.floor((this.floor - 1) / 5) % BOSS_CYCLE.length];
    const bossDef = KHMER_BOSSES[bossId];
    const spawnX = 960;
    const isFloating = bossId === 'arp_prey_chrov' || bossId === 'neak_reach';
    const baseY = isFloating ? 455 : FLOOR_Y - 54;
    const maxHp = Math.round((850 + this.floor * 185) * (this.partyMode === 'coop' ? 1.35 : 1));
    const atk = Math.round(16 + this.floor * 1.15);

    const texKey = this.textures.exists(bossDef.textureKey) ? bossDef.textureKey : 'boar_idle';
    const sprite = this.add
      .image(spawnX, baseY, texKey)
      .setScale(texKey.startsWith('boss_') ? 0.56 : 2.6)
      .setDepth(38)
      .setInteractive({ useHandCursor: true });

    const hpBg = this.add.rectangle(spawnX, baseY - 78, 128, 10, 0x0f172a).setDepth(42);
    const hpFill = this.add.rectangle(spawnX - 62, baseY - 78, 124, 6, 0xf59e0b).setOrigin(0, 0.5).setDepth(43);
    const nameText = this.add
      .text(spawnX, baseY - 88, `👑 MYTHIC ${bossDef.englishName.toUpperCase()}`, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fde047',
        backgroundColor: 'rgba(88, 28, 135, 0.92)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(44);

    const boss: TowerEnemy = {
      id: `tower_boss_${this.floor}`,
      name: bossDef.englishName,
      isBoss: true,
      bossId,
      sprite,
      hpBg,
      hpFill,
      nameText,
      hp: maxHp,
      maxHp,
      attackDmg: atk,
      speed: 96 + Math.min(55, this.floor * 1.1),
      flying: isFloating,
      baseY,
      dir: -1,
      alive: true,
      baseTint: 0xffffff,
      phase2: false,
      lastHitAt: 0,
      lastActionAt: 0,
      lastContactAt: 0,
    };
    this.enemies.push(boss);
    sprite.on('pointerdown', () => this.performAttack(boss.sprite.x, boss.sprite.y));
  }

  private performAttack(targetX: number, targetY: number): void {
    const now = this.time.now;
    const cooldown = Math.max(180, this.player.state.weapon.attackCooldownMs);
    if (now - this.lastAttackAt < cooldown) return;
    this.lastAttackAt = now;
    this.attackAnimUntil = now + 200;

    const dir = targetX < this.player.x ? -1 : 1;
    this.player.facing = dir < 0 ? 'left' : 'right';
    this.player.playStateAnimation('attack');
    soundManager.playSfx('swing');

    const bridge = computeVillageToDungeonBridge(this.player.state);
    const baseDmg = Math.round(
      (this.player.state.weapon.baseDamage + bridge.flatDamageBonus) *
        (1 + bridge.classSkillDamagePct + bridge.snackAttackPct + bridge.armorDamagePctBonus)
    );
    const isCrit = Math.random() < bridge.effectiveCritChance;
    const finalDmg = Math.max(24, Math.round(baseDmg * (isCrit ? bridge.critMultiplier : 1)));

    // Slash arc visual
    const slash = this.add
      .arc(this.player.x + dir * 32, this.player.y - 16, 46, dir > 0 ? -70 : 110, dir > 0 ? 70 : 250, false, isCrit ? 0xfacc15 : 0x38bdf8, 0.48)
      .setDepth(75);
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.35,
      duration: 170,
      onComplete: () => slash.destroy(),
    });

    // Melee hit check
    let hitAny = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x + dir * 24, this.player.y - 16, e.sprite.x, e.sprite.y);
      if (dist <= (e.isBoss ? 145 : 115)) {
        this.damageEnemy(e, finalDmg, isCrit);
        hitAny = true;
      }
    }

    // Also fire a spirit bolt toward pointer for ranged classes or distant targets
    if (!hitAny || this.player.state.activeClass === 'archer' || this.player.state.activeClass === 'mystic' || this.player.state.activeClass === 'tamer') {
      const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y - 16, targetX, targetY);
      const speed = 520;
      const orbColor =
        this.player.state.loadout.weaponAura === 'celestial_angkor'
          ? 0xc084fc
          : this.player.state.loadout.weaponAura === 'emerald_naga'
            ? 0x10b981
            : 0xfacc15;
      const gfx = this.add.circle(this.player.x + dir * 14, this.player.y - 16, 6, orbColor, 0.95).setDepth(78);
      this.projectiles.push({
        x: gfx.x,
        y: gfx.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        dmg: Math.round(finalDmg * 0.85),
        fromPlayer: true,
        radius: 14,
        bornAt: now,
        gfx,
      });
    }
  }

  private damageEnemy(enemy: TowerEnemy, dmg: number, isCrit: boolean): void {
    if (!enemy.alive) return;
    enemy.hp = Math.max(0, enemy.hp - dmg);
    enemy.lastHitAt = this.time.now;
    soundManager.playSfx('hit');
    enemy.sprite.setTintFill(0xffffff);
    this.time.delayedCall(90, () => {
      if (enemy.sprite.active && enemy.alive) {
        if (enemy.baseTint === 0xffffff) enemy.sprite.clearTint();
        else enemy.sprite.setTint(enemy.baseTint);
      }
    });

    const maxBarW = enemy.isBoss ? 124 : 48;
    enemy.hpFill.width = Math.max(0, Math.round(maxBarW * (enemy.hp / enemy.maxHp)));
    this.spawnFloatingText(
      enemy.sprite.x + Phaser.Math.Between(-16, 16),
      enemy.sprite.y - (enemy.isBoss ? 68 : 34),
      isCrit ? `CRIT -${dmg}!` : `-${dmg}`,
      isCrit ? '#fde047' : '#ffffff'
    );

    if (enemy.isBoss && !enemy.phase2 && enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.5) {
      enemy.phase2 = true;
      enemy.speed *= 1.25;
      enemy.baseTint = 0xfca5a5;
      enemy.sprite.setTint(0xfca5a5);
      this.cameras.main.shake(180, 0.008);
      this.spawnFloatingText(enemy.sprite.x, enemy.sprite.y - 96, '🔥 PHASE 2 ENRAGE!', '#fb7185');
    }

    if (enemy.hp <= 0) {
      enemy.alive = false;
      enemy.sprite.setVisible(false);
      enemy.hpBg.setVisible(false);
      enemy.hpFill.setVisible(false);
      enemy.nameText.setVisible(false);
      this.cameras.main.shake(130, 0.006);
      soundManager.playSfx('victory');

      if (this.enemies.every((e) => !e.alive)) {
        this.handleFloorCleared();
      }
    }

    this.refreshBannerSubtitle();
  }

  private handleFloorCleared(): void {
    if (this.floorCleared) return;
    this.floorCleared = true;

    const isBossFloor = this.floor % 5 === 0;
    const coins = 80 + this.floor * 28 + (isBossFloor ? 180 : 0);
    const vitalityXp = 35 + this.floor * 8 + (isBossFloor ? 45 : 0);
    const reforgeStones = isBossFloor ? 2 : 1;

    let unlockedAura: WeaponAuraId | null = null;
    if (this.floor === 10) unlockedAura = 'golden_lotus';
    else if (this.floor === 25) unlockedAura = 'emerald_naga';
    else if (this.floor === 50) unlockedAura = 'celestial_angkor';

    soundManager.playSfx('level_up');
    this.cameras.main.flash(280, 250, 204, 21);

    EventBus.emit('tower:floorCleared', {
      floor: this.floor,
      isBossFloor,
      coins,
      vitalityXp,
      reforgeStones,
      unlockedAura,
    });

    this.spawnNextFloorPortal();
    this.refreshBannerSubtitle();
  }

  private spawnNextFloorPortal(): void {
    const isFinal = this.floor >= 50;
    const tint = isFinal ? 0xfacc15 : 0xc084fc;
    if (this.textures.exists('portal_vortex')) {
      const aura = this.add
        .image(NEXT_PORTAL_X, FLOOR_Y - 52, 'portal_vortex')
        .setTint(tint)
        .setScale(1.35)
        .setAlpha(0.75)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(22);
      this.tweens.add({ targets: aura, scale: 1.55, alpha: 0.35, duration: 750, yoyo: true, repeat: -1 });
      this.nextPortalGroup.push(aura);
    }

    const hit = this.add
      .rectangle(NEXT_PORTAL_X, FLOOR_Y - 50, 82, 96, isFinal ? 0x854d0e : 0x581c87, 0.52)
      .setStrokeStyle(3, 0xfacc15)
      .setDepth(24)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.advanceToNextFloor());
    this.nextPortalGroup.push(hit);

    if (this.textures.exists('join_arrow')) {
      const arrow = this.add.image(NEXT_PORTAL_X, FLOOR_Y - 120, 'join_arrow').setScale(0.72).setDepth(30);
      this.tweens.add({ targets: arrow, y: FLOOR_Y - 130, duration: 500, yoyo: true, repeat: -1 });
      this.nextPortalGroup.push(arrow);
    }

    const label = this.add
      .text(
        NEXT_PORTAL_X,
        FLOOR_Y - 148,
        isFinal ? '🏆 CONQUERED! RETURN TO TEMPLE [E]' : `NEXT FLOOR (${this.floor + 1} / 50) [E]`,
        {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          padding: { x: 8, y: 4 },
        }
      )
      .setOrigin(0.5)
      .setDepth(32);
    this.nextPortalGroup.push(label);
  }

  private advanceToNextFloor(): void {
    if (this.transitioning) return;
    if (this.floor >= 50) {
      this.exitToTempleDistrict('temple_district');
      return;
    }
    this.transitioning = true;
    soundManager.playSfx('magic');
    this.cameras.main.fadeOut(220, 20, 12, 40);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('PagodaTowerScene', {
        floor: this.floor + 1,
        partyMode: this.partyMode,
        playerState: {
          ...this.player.state,
          highestTowerFloor: Math.max(this.player.state.highestTowerFloor ?? 0, this.floor),
        },
      });
    });
  }

  private exitToTempleDistrict(
    mapId: 'central_plaza' | 'market_street' | 'temple_district' | 'green_park' | 'wild_frontier'
  ): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(220, 10, 14, 24);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId,
        spawnX: mapId === 'temple_district' ? 1080 : 800,
        spawnY: mapId === 'temple_district' ? 420 : 600,
        playerState: {
          ...this.player.state,
          zone: 'overworld',
          currentMapId: mapId,
        },
      });
    });
  }

  private tryDash(): void {
    const now = this.time.now;
    const bridge = computeVillageToDungeonBridge(this.player.state);
    const cd = Math.round(950 * bridge.dashCooldownMult);
    if (now - this.lastDashAt < cd) return;
    this.lastDashAt = now;
    this.dashUntil = now + 180;
    this.invulnUntil = Math.max(this.invulnUntil, now + 260);
    const dir = this.player.facing === 'left' ? -1 : 1;
    this.player.body.setVelocityX(dir * 520);
    soundManager.playSfx('swing');
  }

  private fireBambooGrapple(tx: number, ty: number): void {
    const now = this.time.now;
    if (now - this.lastGrappleAt < 650) return;
    this.lastGrappleAt = now;
    const clampedX = Phaser.Math.Clamp(tx, 60, ARENA_W - 60);
    const clampedY = Phaser.Math.Clamp(ty, 220, FLOOR_Y - 20);
    this.grappleTarget = { x: clampedX, y: clampedY };
    this.grappleActiveUntil = now + 240;
    const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y - 16, clampedX, clampedY);
    this.player.body.setVelocity(Math.cos(ang) * 560, Math.sin(ang) * 560 - 90);
    this.jumpsUsed = 1;
    soundManager.playSfx('swing');
  }

  private tryInteractNearest(): void {
    if (this.floorCleared && Math.abs(this.player.x - NEXT_PORTAL_X) < 110) {
      this.advanceToNextFloor();
      return;
    }
    if (Math.abs(this.player.x - EXIT_X) < 110) {
      this.exitToTempleDistrict('temple_district');
      return;
    }
    if (this.floorCleared) {
      this.advanceToNextFloor();
    }
  }

  private damagePlayer(rawDmg: number): void {
    const now = this.time.now;
    if (now < this.invulnUntil || this.defeated || this.transitioning) return;
    this.invulnUntil = now + 680;
    const bridge = computeVillageToDungeonBridge(this.player.state);
    const reduced = Math.max(4, Math.round(rawDmg - bridge.effectiveDefense * 0.35));
    const nextHp = Math.max(0, this.player.state.hp - reduced);
    this.player.state = { ...this.player.state, hp: nextHp };
    EventBus.emit('player:state', this.player.state);
    this.player.paperDoll.flashWhite(140);
    this.cameras.main.shake(110, 0.005);
    this.spawnFloatingText(this.player.x, this.player.y - 42, `-${reduced}`, '#fb7185');

    if (nextHp <= 0) {
      this.defeated = true;
      EventBus.emit('ui:toast', {
        text: `💀 Defeated on Pagoda Floor ${this.floor}! Restoring HP & returning to Temple District...`,
      });
      this.player.state = { ...this.player.state, hp: bridge.effectiveMaxHp };
      EventBus.emit('player:state', this.player.state);
      this.time.delayedCall(1200, () => this.exitToTempleDistrict('temple_district'));
    }
  }

  private spawnFloatingText(x: number, y: number, msg: string, color: string): void {
    const t = this.add
      .text(x, y, msg, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color,
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2500);
    this.tweens.add({
      targets: t,
      y: y - 30,
      alpha: 0,
      duration: 780,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  update(time: number, delta: number): void {
    const modalOpen = Boolean(document.querySelector('dialog[open]'));
    if (this.input.enabled === modalOpen) {
      this.input.enabled = !modalOpen;
    }
    const typing =
      modalOpen ||
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA';

    const onFloor = this.player.body.blocked.down || this.player.body.touching.down;
    if (onFloor) this.jumpsUsed = 0;

    const bridge = computeVillageToDungeonBridge(this.player.state);
    const maxJumps = bridge.hasDoubleJump ? 2 : 1;

    let moveX = this.joystick.x;
    if (!typing && !this.transitioning && !this.defeated) {
      if (this.cursors.left.isDown || this.keys.A.isDown) moveX -= 1;
      if (this.cursors.right.isDown || this.keys.D.isDown) moveX += 1;

      if (
        (Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) &&
        this.jumpsUsed < maxJumps
      ) {
        this.jumpsUsed += 1;
        this.player.body.setVelocityY(-470 * (1 + bridge.jumpPowerBonusPct));
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.J)) {
        const dir = this.player.facing === 'left' ? -1 : 1;
        this.performAttack(this.player.x + dir * 160, this.player.y - 16);
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) {
        this.tryDash();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.G)) {
        const dir = this.player.facing === 'left' ? -1 : 1;
        this.fireBambooGrapple(this.player.x + dir * 240, this.player.y - 170);
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.tryInteractNearest();
      }
    }

    if (time > this.dashUntil && time > this.grappleActiveUntil) {
      const moveSpeed = 240 * (1 + Math.min(0.45, bridge.moveSpeedBonusPct));
      this.player.body.setVelocityX(Phaser.Math.Clamp(moveX, -1, 1) * moveSpeed);
    }

    if (Math.abs(moveX) > 0.1) {
      this.player.facing = moveX < 0 ? 'left' : 'right';
    }
    if (time < this.attackAnimUntil) {
      this.player.playStateAnimation('attack');
    } else if (!onFloor) {
      this.player.playStateAnimation('jump');
    } else if (Math.abs(moveX) > 0.1) {
      this.player.playStateAnimation('walk');
    } else {
      this.player.playStateAnimation('idle');
    }
    this.player.syncVisuals(time, false);

    // Draw grapple rope
    this.grappleLine.clear();
    if (time < this.grappleActiveUntil) {
      this.grappleLine.lineStyle(3, 0x4ade80, 0.95);
      this.grappleLine.lineBetween(this.player.x, this.player.y - 18, this.grappleTarget.x, this.grappleTarget.y);
    }

    // Update enemies & boss AI
    const dt = delta / 1000;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = this.player.x - e.sprite.x;
      const moveDir = dx < -12 ? -1 : dx > 12 ? 1 : 0;
      e.sprite.x = Phaser.Math.Clamp(e.sprite.x + moveDir * e.speed * dt, 120, ARENA_W - 120);
      if ('setFlipX' in e.sprite) {
        e.sprite.setFlipX(moveDir < 0);
      }
      if (e.flying) {
        e.sprite.y = e.baseY + Math.sin(time / 340 + e.sprite.x * 0.01) * 28;
      }

      const barY = e.sprite.y - (e.isBoss ? 78 : 38);
      e.hpBg.setPosition(e.sprite.x, barY);
      e.hpFill.setPosition(e.sprite.x - (e.isBoss ? 62 : 24), barY);
      e.nameText.setPosition(e.sprite.x, barY - 10);

      // Boss ranged volley
      const fireInterval = e.phase2 ? 1550 : 2200;
      if (e.isBoss && time - e.lastActionAt > fireInterval) {
        e.lastActionAt = time;
        const ang = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, this.player.x, this.player.y - 16);
        const spreads = e.phase2 ? [-0.22, 0, 0.22] : [0];
        for (const s of spreads) {
          const gfx = this.add.circle(e.sprite.x, e.sprite.y, 8, 0xfb7185, 0.92).setDepth(76);
          this.projectiles.push({
            x: e.sprite.x,
            y: e.sprite.y,
            vx: Math.cos(ang + s) * 290,
            vy: Math.sin(ang + s) * 290,
            dmg: e.attackDmg,
            fromPlayer: false,
            radius: 14,
            bornAt: time,
            gfx,
          });
        }
      }

      // Contact damage check
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y - 16, e.sprite.x, e.sprite.y);
      if (dist < (e.isBoss ? 56 : 36) && time - e.lastContactAt > 900) {
        e.lastContactAt = time;
        this.damagePlayer(e.attackDmg);
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.gfx.setPosition(p.x, p.y);

      let remove = time - p.bornAt > 2400 || p.x < 0 || p.x > ARENA_W || p.y < 0 || p.y > ARENA_H;
      if (!remove && p.fromPlayer) {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, e.sprite.x, e.sprite.y) < (e.isBoss ? 54 : 32)) {
            this.damageEnemy(e, p.dmg, false);
            remove = true;
            break;
          }
        }
      } else if (!remove && !p.fromPlayer) {
        if (Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y - 16) < 26) {
          this.damagePlayer(p.dmg);
          remove = true;
        }
      }

      if (remove) {
        p.gfx.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    // Portal prompt
    if (this.floorCleared && Math.abs(this.player.x - NEXT_PORTAL_X) < 110) {
      this.promptText
        .setPosition(NEXT_PORTAL_X, FLOOR_Y - 108)
        .setText(this.floor >= 50 ? 'Press [E] → Return to Temple District!' : `Press [E] → Enter Floor ${this.floor + 1}!`)
        .setVisible(true);
    } else if (Math.abs(this.player.x - EXIT_X) < 105) {
      this.promptText.setPosition(EXIT_X, FLOOR_Y - 108).setText('Press [E] → Exit to Temple District').setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }
}
