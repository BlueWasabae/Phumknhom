import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PlayerState } from '@shared/types';
import { calculatePlayerDamage, getXpForNextLevel } from '@shared/balanceFormulas';
import { CLASS_TO_COMBAT_SKILL, computeVillageToDungeonBridge } from '@shared/skillTrees';
import { awardSkillXp } from '../systems/SkillManager';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { ClassCombatVFX, type SpawnedProjectile } from '../animations/ClassCombatVFX';

const ARENA_W = 1800;
const ARENA_H = 720;
const FLOOR_Y = 620;
const BOSS_SPAWN_X = 1390;
const BOSS_SPAWN_Y = FLOOR_Y - 104;
const BOSS_MAX_HP = 360;
const EXIT_PORTAL_X = 118;
const EXIT_PORTAL_Y = FLOOR_Y - 78;

interface DustMote {
  sprite: Phaser.GameObjects.Image;
  baseY: number;
  speedX: number;
  phase: number;
}

export class DungeonBossScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private player!: Player;
  private vfx!: ClassCombatVFX;
  private promptText!: Phaser.GameObjects.Text;

  private solidFloor!: Phaser.Physics.Arcade.StaticGroup;
  private elevatedPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private dustMotes: DustMote[] = [];

  // Custom Khmer Boss: Yeak Thmor (Stone Yaksha)
  private boss!: Phaser.GameObjects.Image;
  private bossShadow!: Phaser.GameObjects.Image;
  private bossBreatheTween?: Phaser.Tweens.Tween;
  private bossHp = BOSS_MAX_HP;
  private bossAlive = true;
  private bossBarBg!: Phaser.GameObjects.Rectangle;
  private bossBarFill!: Phaser.GameObjects.Rectangle;
  private bossLabel!: Phaser.GameObjects.Text;

  // 5-Class Combat Systems
  private projectiles: SpawnedProjectile[] = [];
  private yantSigils: Phaser.GameObjects.Container[] = [];
  private lbokatorStance = 1; // 1=Lion, 2=Crocodile, 3=Hanuman
  private consecutiveMeleeHits = 0;
  private stealthPct = 0;     // 0..100 for Shadow Hunter
  private lastAttackAt = 0;
  private lastMeterBroadcast = 0;

  // Platformer & Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'A' | 'D' | 'W' | 'E' | 'J' | 'L' | 'SHIFT' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };
  private jumpsUsed = 0;
  private dashActiveUntil = 0;
  private dashCooldownUntil = 0;
  private invulnerableUntil = 0;
  private attackCooldownUntil = 0;
  private attackAnimUntil = 0;
  private nearExitSent = false;
  private transitioning = false;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('DungeonBossScene');
  }

  init(data?: { playerState?: PlayerState }): void {
    this.initialState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'dungeon',
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
          currencies: { ...data.playerState.currencies },
          lifeStats: { ...data.playerState.lifeStats },
        }
      : { ...INITIAL_PLAYER_STATE, zone: 'dungeon' };
    this.bossHp = BOSS_MAX_HP;
    this.bossAlive = true;
    this.jumpsUsed = 0;
    this.nearExitSent = false;
    this.transitioning = false;
    this.joystick = { x: 0, y: 0 };
    this.dustMotes = [];
    this.projectiles = [];
    this.yantSigils = [];
    this.lbokatorStance = 1;
    this.consecutiveMeleeHits = 0;
    this.stealthPct = 0;
  }

  create(): void {
    // Terraria / Calamity Mode: Side-Scrolling 2D (gravity = 800)
    this.physics.world.gravity.y = 800;
    this.physics.world.setBounds(0, 0, ARENA_W, ARENA_H);

    this.vfx = new ClassCombatVFX(this);
    this.drawParallaxCavernAndAtmosphere();
    this.buildArenaPlatforms();
    this.buildExitPortal();
    this.buildYeakThmorBoss();

    this.player = new Player(this, 240, FLOOR_Y - 46, this.initialState, 'dungeon');
    this.physics.add.collider(this.player.sprite, this.solidFloor);
    this.physics.add.collider(
      this.player.sprite,
      this.elevatedPlatforms,
      undefined,
      (playerObj, platObj) => {
        const p = playerObj as Phaser.Physics.Arcade.Sprite;
        const plat = platObj as Phaser.GameObjects.Rectangle;
        const body = p.body as Phaser.Physics.Arcade.Body;
        return body.velocity.y >= 0 && body.bottom <= plat.y - plat.height / 2 + 14;
      }
    );

    this.promptText = this.add
      .text(EXIT_PORTAL_X + 20, EXIT_PORTAL_Y - 94, 'Press [E] or Tap EXIT → Return to Phum Village', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setDepth(90)
      .setVisible(false);

    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, ARENA_W, ARENA_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.fadeIn(240, 8, 10, 20);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D,W,E,J,L,SHIFT,SPACE') as Record<
      'A' | 'D' | 'W' | 'E' | 'J' | 'L' | 'SHIFT' | 'SPACE',
      Phaser.Input.Keyboard.Key
    >;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.performClassAttack();
      }
    });

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
      EventBus.on('player:loadoutChanged', ({ loadout, playerState }) => {
        this.player.applyLoadoutUpdate(loadout, playerState);
        this.stealthPct = 0;
        this.consecutiveMeleeHits = 0;
        this.clearYantSigils();
        this.player.paperDoll.setStealthTint(false);
        this.broadcastClassMeter();
      }),
      EventBus.on('player:stateSync', (nextState) => {
        this.player.syncPlayerState(nextState);
      }),
      EventBus.on('input:jump', () => this.performJump()),
      EventBus.on('input:attack', () => this.performClassAttack()),
      EventBus.on('input:dash', () => this.performClassDash()),
      EventBus.on('input:exitDungeon', () => this.returnToOverworld()),
      EventBus.on('input:interact', () => {
        if (this.isNearExitPortal()) this.returnToOverworld();
      })
    );

    EventBus.emit('scene:ready', { zone: 'dungeon' });
    EventBus.emit('player:state', this.player.state);
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: 'overworld' });
    this.broadcastClassMeter();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.clearYantSigils();
      this.player.destroy();
    });
  }

  private drawParallaxCavernAndAtmosphere(): void {
    this.add
      .tileSprite(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 'lf_sky')
      .setTileScale(2.8, 2.8)
      .setTint(0x202744)
      .setScrollFactor(0.1)
      .setDepth(0);

    this.add
      .tileSprite(ARENA_W / 2, 405, ARENA_W, 256, 'lf_parallax_far')
      .setTileScale(2.2, 2.2)
      .setTint(0x25354f)
      .setScrollFactor(0.2)
      .setDepth(2);

    this.add
      .tileSprite(ARENA_W / 2, 445, ARENA_W, 256, 'lf_parallax_mid')
      .setTileScale(2.2, 2.2)
      .setTint(0x1a263a)
      .setScrollFactor(0.5)
      .setDepth(4);

    const vineXs = [210, 390, 540, 720, 890, 1080, 1290, 1510, 1680];
    vineXs.forEach((vx, idx) => {
      const tex = idx % 2 === 0 ? 'lf_vine_green' : 'lf_vine_purple';
      const vine = this.add.image(vx, 85 + (idx % 3) * 18, tex).setScale(2.3).setOrigin(0.5, 0).setDepth(7);
      this.tweens.add({
        targets: vine,
        angle: idx % 2 === 0 ? 3 : -3,
        duration: 1800 + idx * 140,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    for (const tx of [360, 740, 1140, 1580]) {
      this.add.image(tx, FLOOR_Y - 68, 'lf_pillar').setScale(1.6).setTint(0x64748b).setDepth(6);
      this.add.image(tx, FLOOR_Y - 125, 'lf_torch').setScale(2.2).setDepth(8);
      const glow = this.add
        .image(tx, FLOOR_Y - 134, 'torch_glow')
        .setScale(1.45)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(9);
      this.tweens.add({
        targets: glow,
        alpha: 0.58,
        scale: 1.65,
        duration: 360 + Math.random() * 240,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    for (const mx of [310, 620, 970, 1280, 1650]) {
      this.add.image(mx, FLOOR_Y - 16, 'lf_mushroom').setScale(1.7).setDepth(16);
    }
    this.add.image(1460, 336, 'lf_chest').setScale(1.7).setDepth(16);
    this.add.image(560, FLOOR_Y - 26, 'lf_boulder').setScale(1.4).setTint(0x64748b).setDepth(8);

    for (let i = 0; i < 28; i++) {
      const dx = Math.random() * ARENA_W;
      const dy = 140 + Math.random() * 430;
      const mote = this.add
        .image(dx, dy, 'dust_mote')
        .setScale(0.8 + Math.random() * 1.1)
        .setAlpha(0.25 + Math.random() * 0.45)
        .setDepth(28);
      this.dustMotes.push({
        sprite: mote,
        baseY: dy,
        speedX: 8 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.add
      .text(420, 130, 'ANCIENT CAVERN · 5 KHMER CLASSES COMBAT ARENA', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setDepth(12);
    this.add
      .text(420, 156, '[I] Swap Class · [K] Skills · [1/2/3] Eat Snack · Space/W Jump · Shift/L Dash · J/Click Attack', {
        fontFamily: 'Kantumruy Pro, sans-serif',
        fontSize: '12px',
        color: '#cbd5e1',
      })
      .setDepth(12);
  }

  private buildArenaPlatforms(): void {
    this.solidFloor = this.physics.add.staticGroup();
    this.elevatedPlatforms = this.physics.add.staticGroup();

    this.add.tileSprite(ARENA_W / 2, FLOOR_Y + 52, ARENA_W, 108, 'lf_cave_floor').setTileScale(1.8, 1.8).setDepth(10);
    this.add.tileSprite(ARENA_W / 2, FLOOR_Y + 10, ARENA_W, 34, 'lf_moss_top').setTileScale(1.8, 1.4).setDepth(11);
    const floorCollider = this.add.rectangle(ARENA_W / 2, FLOOR_Y + 50, ARENA_W, 100, 0x000000, 0);
    this.solidFloor.add(floorCollider);

    const platforms: Array<{ x: number; y: number; w: number; tex: 'lf_plat_stone' | 'lf_plat_wood' }> = [
      { x: 460, y: 500, w: 224, tex: 'lf_plat_stone' },
      { x: 780, y: 395, w: 240, tex: 'lf_plat_wood' },
      { x: 1120, y: 485, w: 224, tex: 'lf_plat_stone' },
      { x: 1460, y: 365, w: 240, tex: 'lf_plat_wood' },
    ];
    for (const p of platforms) {
      this.add.tileSprite(p.x, p.y, p.w, 26, p.tex).setTileScale(1.6, 1.5).setDepth(14);
      const collider = this.add.rectangle(p.x, p.y, p.w, 18, 0x000000, 0);
      this.elevatedPlatforms.add(collider);
    }
  }

  private buildExitPortal(): void {
    this.add.image(EXIT_PORTAL_X, FLOOR_Y - 2, 'soft_shadow').setDisplaySize(130, 26).setDepth(17);
    const glow = this.add
      .image(EXIT_PORTAL_X, EXIT_PORTAL_Y, 'portal_vortex')
      .setScale(1.6)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(19);
    this.tweens.add({
      targets: glow,
      alpha: 0.25,
      scale: 1.8,
      duration: 850,
      yoyo: true,
      repeat: -1,
    });
    this.add.image(EXIT_PORTAL_X, FLOOR_Y + 4, 'angkor_portal').setOrigin(0.5, 0.96).setScale(0.92).setDepth(20);

    const arrow = this.add.image(EXIT_PORTAL_X, EXIT_PORTAL_Y - 108, 'join_arrow').setScale(1.2).setDepth(24);
    this.tweens.add({
      targets: arrow,
      y: EXIT_PORTAL_Y - 120,
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.add
      .text(EXIT_PORTAL_X, FLOOR_Y - 6, 'VILLAGE EXIT', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(24);
  }

  private buildYeakThmorBoss(): void {
    this.bossShadow = this.add
      .image(BOSS_SPAWN_X, FLOOR_Y - 2, 'soft_shadow')
      .setDisplaySize(172, 30)
      .setDepth(40);

    this.boss = this.add
      .image(BOSS_SPAWN_X, FLOOR_Y, 'boss_yeak_thmor')
      .setOrigin(0.5, 0.96)
      .setScale(1.45)
      .setDepth(42);

    this.bossBreatheTween = this.tweens.add({
      targets: this.boss,
      scaleY: 1.5,
      scaleX: 1.42,
      y: FLOOR_Y - 4,
      duration: 1050,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.bossLabel = this.add
      .text(BOSS_SPAWN_X, BOSS_SPAWN_Y - 118, 'យក្សថ្ម · Yeak Thmor (Stone Yaksha)', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(46);

    this.bossBarBg = this.add
      .rectangle(BOSS_SPAWN_X, BOSS_SPAWN_Y - 104, 148, 12, 0x0f172a)
      .setStrokeStyle(2, 0xf59e0b)
      .setDepth(46);

    this.bossBarFill = this.add
      .rectangle(BOSS_SPAWN_X - 71, BOSS_SPAWN_Y - 104, 142, 7, 0xef4444)
      .setOrigin(0, 0.5)
      .setDepth(47);
  }

  private clearYantSigils(): void {
    for (const s of this.yantSigils) s.destroy();
    this.yantSigils = [];
  }

  private broadcastClassMeter(): void {
    EventBus.emit('combat:classMeter', {
      classId: this.player.state.activeClass,
      stealthPct: Math.round(this.stealthPct),
      yantStacks: this.yantSigils.length,
      lbokatorStance: this.lbokatorStance,
    });
  }

  private performJump(): void {
    if (this.transitioning) return;
    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now(), this.consecutiveMeleeHits);
    const jumpMult = 1 + bridge.jumpPowerBonusPct;
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (onGround) {
      this.jumpsUsed = 1;
      this.player.body.setVelocityY(-495 * jumpMult);
    } else if (this.jumpsUsed < 2) {
      this.jumpsUsed = 2;
      this.player.body.setVelocityY(-460 * jumpMult);
      this.spawnFloatingText(this.player.x, this.player.y - 26, 'Double Jump!', '#38bdf8', '13px');
    }
  }

  /**
   * 5-Class Distinct Dash Abilities
   */
  private performClassDash(): void {
    const now = this.time.now;
    if (now < this.dashCooldownUntil || this.transitioning) return;

    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now(), this.consecutiveMeleeHits);
    const cls = this.player.state.activeClass;
    const dir = this.player.facingRight ? 1 : -1;
    this.dashCooldownUntil = now + Math.round(920 * bridge.dashCooldownMult);
    this.dashActiveUntil = now + 200;
    this.invulnerableUntil = now + 380;

    if (cls === 'archer') {
      // Divine Archer: Acrobatic backflip firing 1 quick arrow mid-air!
      this.player.body.setVelocityX(-dir * 420);
      this.player.body.setVelocityY(-280);
      this.projectiles.push(this.vfx.spawnArcherArrow(this.player.x, this.player.y - 8, dir, 1.15));
      this.spawnFloatingText(this.player.x, this.player.y - 36, 'Backflip Shot!', '#4ade80', '14px');
    } else if (cls === 'mystic') {
      // Achar Mystic: Blink-teleport dissolving into golden lotus petals
      const fromX = this.player.x;
      const fromY = this.player.y;
      const toX = Phaser.Math.Clamp(fromX + dir * 165, 60, ARENA_W - 60);
      this.player.sprite.setPosition(toX, fromY - 6);
      this.vfx.playMysticLotusBlink(fromX, fromY, toX, fromY - 6);
      this.spawnFloatingText(toX, fromY - 36, 'Lotus Blink!', '#facc15', '14px');
    } else if (cls === 'shadow') {
      // Shadow Hunter: Smoke-puff vanish leaving 0.4s shadow afterimage decoy
      this.vfx.playShadowDecoyDash(this.player.x, this.player.y);
      this.player.body.setVelocityX(dir * 690);
      this.player.body.setVelocityY(-40);
      this.stealthPct = Math.min(100, this.stealthPct + 35);
      this.spawnFloatingText(this.player.x, this.player.y - 36, 'Smoke Vanish!', '#c084fc', '14px');
      this.broadcastClassMeter();
    } else if (cls === 'tamer') {
      // Barami Spirit Tamer: Spirit silhouette phase dash
      this.player.body.setVelocityX(dir * 610);
      this.player.body.setVelocityY(-45);
      this.player.paperDoll.setAlpha(0.5);
      this.spawnFloatingText(this.player.x, this.player.y - 36, 'Spirit Phase!', '#34d399', '14px');
    } else {
      // Lbokator Warrior: Forward shoulder-roll leaving golden dust sparks
      this.player.body.setVelocityX(dir * 640);
      this.player.body.setVelocityY(-45);
      this.vfx.playLbokatorDashDust(this.player.x, this.player.y);
      this.player.paperDoll.flashWhite(120);
      this.spawnFloatingText(this.player.x, this.player.y - 36, 'Roll Dash!', '#facc15', '14px');
    }
  }

  /**
   * 5-Class Distinct Combat Attacks
   */
  private performClassAttack(): void {
    const now = this.time.now;
    if (now < this.attackCooldownUntil || this.transitioning) return;

    const weapon = this.player.state.weapon;
    const cls = this.player.state.activeClass;
    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now(), this.consecutiveMeleeHits);
    const cooldownMs = Math.round(weapon.attackCooldownMs / Math.max(0.5, bridge.castSpeedMult));
    this.attackCooldownUntil = now + cooldownMs;
    this.attackAnimUntil = now + 185;
    this.lastAttackAt = now;

    const dir = this.player.facingRight ? 1 : -1;

    if (cls === 'archer') {
      this.projectiles.push(this.vfx.spawnArcherArrow(this.player.x, this.player.y, dir, 1));
      return;
    }

    if (cls === 'mystic') {
      this.projectiles.push(this.vfx.spawnMysticOrb(this.player.x, this.player.y, dir));
      return;
    }

    if (cls === 'tamer') {
      this.vfx.playKramaWhipSnap(this.player.x, this.player.y, dir);
      const whipBox = new Phaser.Geom.Rectangle(this.player.x + (dir > 0 ? 0 : -118), this.player.y - 44, 118, 88);
      if (this.bossAlive && Phaser.Geom.Intersects.RectangleToRectangle(whipBox, this.boss.getBounds())) {
        this.damageYeakThmor(dir, { bonusMult: 1, tag: 'Krama Mark!' });
      }
      // Command Pet companion to strike Yeak Thmor immediately
      if (this.bossAlive) {
        this.player.pet.trySpiritAutoAttack(
          now,
          this.boss.x,
          this.boss.y - 90,
          () => {
            if (this.bossAlive) {
              this.damageYeakThmor(dir, {
                bonusMult: 0.72 * (1 + bridge.petDamageBonusPct),
                tag: 'Spirit Bolt',
              });
            }
          },
          true,
          bridge.petAttackSpeedMult
        );
      }
      return;
    }

    if (cls === 'shadow') {
      const isShadowStrike = this.stealthPct >= 100;
      this.stealthPct = 0;
      this.player.paperDoll.setStealthTint(false);
      this.broadcastClassMeter();

      this.vfx.playShadowTwinSlash(this.player.x, this.player.y, dir, isShadowStrike);
      const slashBox = new Phaser.Geom.Rectangle(this.player.x + dir * 46 - 52, this.player.y - 46, 104, 92);
      if (this.bossAlive && Phaser.Geom.Intersects.RectangleToRectangle(slashBox, this.boss.getBounds())) {
        this.damageYeakThmor(dir, {
          bonusMult: isShadowStrike ? 1.55 : 1,
          guaranteedCrit: isShadowStrike,
          tag: isShadowStrike ? 'SHADOW STRIKE!' : undefined,
        });
      }
      return;
    }

    // Default: Lbokator Warrior 3-Hit Animal-Stance Combo (Lion -> Crocodile -> Hanuman)
    const stance = this.lbokatorStance;
    this.vfx.playLbokatorSlash(this.player.x, this.player.y, dir, stance);
    const swingBox = new Phaser.Geom.Rectangle(this.player.x + dir * 50 - 54, this.player.y - 48, 108, 96);
    if (this.bossAlive && Phaser.Geom.Intersects.RectangleToRectangle(swingBox, this.boss.getBounds())) {
      const stanceLabel = stance === 3 ? 'HANUMAN SLAM!' : stance === 2 ? 'CROCODILE PIERCE' : undefined;
      this.damageYeakThmor(dir, {
        bonusMult: stance === 3 ? 1.35 : 1,
        extraArmorPen: stance === 2 ? 6 : 0,
        tag: stanceLabel,
      });
    }
    this.lbokatorStance = stance >= 3 ? 1 : stance + 1;
    this.broadcastClassMeter();
  }

  private damageYeakThmor(
    knockDir: number,
    opts: { bonusMult?: number; guaranteedCrit?: boolean; extraArmorPen?: number; tag?: string } = {}
  ): void {
    if (this.player.state.activeClass === 'lbokator') {
      this.consecutiveMeleeHits = Math.min(10, this.consecutiveMeleeHits + 1);
    }

    const { weapon, armorDamagePct } = this.player.state;
    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now(), this.consecutiveMeleeHits);

    const hit = calculatePlayerDamage({
      weaponBase: weapon.baseDamage * (opts.bonusMult ?? 1),
      upgradeLevel: weapon.upgradeLevel,
      flatBonuses: bridge.flatDamageBonus,
      skillPct: bridge.classSkillDamagePct,
      armorPct: armorDamagePct,
      snackBuffPct: bridge.snackAttackPct,
      enemyDefense: 8,
      armorPen: weapon.armorPen + (opts.extraArmorPen ?? 0),
      bossDR: 0.05,
      critChance: bridge.effectiveCritChance,
      critMultiplier: bridge.critMultiplier,
      isCritOverride: opts.guaranteedCrit ? true : undefined,
    });

    let totalDamage = hit.finalDamage;

    // Cross-world Farming -> Dungeon Synergy: Botanical Venom poison proc!
    if (bridge.botanicalVenomChance > 0 && Math.random() < bridge.botanicalVenomChance) {
      const venomDmg = Math.max(4, Math.round(hit.finalDamage * bridge.botanicalVenomPowerPct));
      totalDamage += venomDmg;
      this.spawnFloatingText(
        this.boss.x + (Math.random() - 0.5) * 44,
        this.boss.y - 168,
        `☠ VENOM +${venomDmg}`,
        '#4ade80',
        '14px'
      );
    }

    // Melee Synergy: Seething Blade lifesteal
    if (bridge.seethingLifestealChance > 0 && Math.random() < bridge.seethingLifestealChance) {
      const heal = Math.max(3, Math.round(bridge.effectiveMaxHp * 0.03));
      this.player.state.hp = Math.min(bridge.effectiveMaxHp, this.player.state.hp + heal);
      this.spawnFloatingText(this.player.x, this.player.y - 44, `+${heal} HP`, '#34d399', '13px');
    }

    // Award live combat XP to equipped Khmer class skill (melee/ranged/magic/summoning/rogue)
    const combatSkillId = CLASS_TO_COMBAT_SKILL[this.player.state.activeClass];
    const hitSkillXp = hit.isCrit ? 14 : 9;
    const skillRes = awardSkillXp(this.player.state, combatSkillId, hitSkillXp, true);
    this.player.state = skillRes.state;
    if (skillRes.leveledUp) {
      this.spawnFloatingText(
        this.player.x,
        this.player.y - 62,
        `${combatSkillId.toUpperCase()} Lv.${skillRes.newLevel}!`,
        '#fde047',
        '15px'
      );
      if (this.cache.audio.exists('sfx_levelup')) {
        this.sound.play('sfx_levelup', { volume: 0.28 });
      }
    }

    this.bossHp = Math.max(0, this.bossHp - totalDamage);

    this.boss.setTintFill(0xffffff);
    this.tweens.add({
      targets: this.boss,
      x: BOSS_SPAWN_X + knockDir * 10,
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    this.time.delayedCall(95, () => {
      if (this.bossAlive) this.boss.clearTint();
    });

    const label = opts.tag
      ? `${opts.tag} ${hit.finalDamage}${hit.isCrit ? '!' : ''}`
      : hit.isCrit
      ? `${hit.finalDamage}! CRIT`
      : `${hit.finalDamage}`;

    this.spawnFloatingText(
      this.boss.x + (Math.random() - 0.5) * 62,
      this.boss.y - 140,
      label,
      opts.guaranteedCrit ? '#e879f9' : hit.isCrit ? '#facc15' : '#ffffff',
      hit.isCrit || opts.tag ? '22px' : '16px'
    );

    if (hit.isCrit) {
      this.cameras.main.shake(105, 0.006);
      this.physics.world.pause();
      window.setTimeout(() => {
        if (this.scene.isActive('DungeonBossScene')) {
          this.physics.world.resume();
        }
      }, 40);
    }

    EventBus.emit('player:state', {
      ...this.player.state,
      weapon: { ...this.player.state.weapon },
      loadout: { ...this.player.state.loadout },
      currencies: { ...this.player.state.currencies },
      lifeStats: { ...this.player.state.lifeStats },
      activeBuffs: [...this.player.state.activeBuffs],
      quickSnackSlots: [...this.player.state.quickSnackSlots],
    });
    EventBus.emit('combat:hit', { hit, dummyHp: this.bossHp, dummyMaxHp: BOSS_MAX_HP });

    if (this.bossHp <= 0) {
      this.defeatAndRespawnBoss();
    }
  }

  private addMysticYantStack(dir: number): void {
    if (!this.bossAlive) return;
    const sigil = this.vfx.createFloatingYantSigil(this.boss.x, this.boss.y, this.yantSigils.length);
    this.yantSigils.push(sigil);

    if (this.yantSigils.length >= 3) {
      this.clearYantSigils();
      this.vfx.playYantDetonationBeam(this.boss.x, FLOOR_Y);
      this.damageYeakThmor(dir, { bonusMult: 2.2, guaranteedCrit: true, tag: 'YANT DETONATION!' });
    }
    this.broadcastClassMeter();
  }

  private defeatAndRespawnBoss(): void {
    this.bossAlive = false;
    this.clearYantSigils();
    this.bossBreatheTween?.pause();
    this.boss.setVisible(false);
    this.bossShadow.setVisible(false);
    this.bossBarBg.setVisible(false);
    this.bossBarFill.setVisible(false);
    this.bossLabel.setText('Yeak Thmor Vanquished! Respawning in 3s...').setColor('#fbbf24');

    this.player.state.coins += 75;
    this.player.state.currencies.coins = this.player.state.coins;
    this.player.state.xp += 60;

    // Award Vitality XP on defeating enemy / boss!
    const vitRes = awardSkillXp(this.player.state, 'vitality', 45, true);
    this.player.state = vitRes.state;

    let leveledUp = vitRes.leveledUp;
    while (this.player.state.xp >= getXpForNextLevel(this.player.state.level)) {
      this.player.state.xp -= getXpForNextLevel(this.player.state.level);
      this.player.state.level += 1;
      this.player.state.maxHp += 15;
      const nextBridge = computeVillageToDungeonBridge(this.player.state);
      this.player.state.hp = nextBridge.effectiveMaxHp;
      leveledUp = true;
      this.spawnFloatingText(this.player.x, this.player.y - 54, `LEVEL UP! Lv.${this.player.state.level}`, '#fde047', '18px');
    }
    if (leveledUp && this.cache.audio.exists('sfx_levelup')) {
      this.sound.play('sfx_levelup', { volume: 0.35 });
    }
    EventBus.emit('player:state', {
      ...this.player.state,
      weapon: { ...this.player.state.weapon },
      loadout: { ...this.player.state.loadout },
      currencies: { ...this.player.state.currencies },
      lifeStats: { ...this.player.state.lifeStats },
      activeBuffs: [...this.player.state.activeBuffs],
      quickSnackSlots: [...this.player.state.quickSnackSlots],
    });
    this.spawnFloatingText(BOSS_SPAWN_X, BOSS_SPAWN_Y - 54, '+75 Coins · +60 XP · +45 Vitality XP', '#4ade80', '15px');

    this.time.delayedCall(3000, () => {
      if (!this.scene.isActive('DungeonBossScene')) return;
      this.bossHp = BOSS_MAX_HP;
      this.bossAlive = true;
      this.boss.setPosition(BOSS_SPAWN_X, FLOOR_Y);
      this.boss.clearTint();
      this.boss.setVisible(true);
      this.bossShadow.setVisible(true);
      this.bossBarBg.setVisible(true);
      this.bossBarFill.setVisible(true);
      this.bossBreatheTween?.resume();
      this.bossLabel.setText('យក្សថ្ម · Yeak Thmor (Stone Yaksha)').setColor('#fde047');
      this.spawnFloatingText(BOSS_SPAWN_X, BOSS_SPAWN_Y - 70, 'Yeak Thmor Awakens!', '#fde047', '15px');
    });
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, fontSize: string): void {
    const txt = this.add
      .text(x, y, text, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize,
        fontStyle: 'bold',
        color,
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(120);
    this.tweens.add({
      targets: txt,
      y: y - 44,
      alpha: 0,
      duration: 760,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  private isNearExitPortal(): boolean {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_PORTAL_X, EXIT_PORTAL_Y) < 105;
  }

  private returnToOverworld(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(220, 8, 12, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        playerState: {
          ...this.player.state,
          zone: 'overworld',
          weapon: { ...this.player.state.weapon },
          loadout: { ...this.player.state.loadout },
          currencies: { ...this.player.state.currencies },
          lifeStats: { ...this.player.state.lifeStats },
        },
      });
    });
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    const typing =
      document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (onGround) this.jumpsUsed = 0;

    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now(), this.consecutiveMeleeHits);

    // Shadow Hunter passive Stealth Meter recharge (turns 45% purple mist at 100%)
    const isShadow = this.player.state.activeClass === 'shadow';
    if (isShadow && time - this.lastAttackAt > 450 && this.stealthPct < 100) {
      this.stealthPct = Math.min(100, this.stealthPct + dt * 32 * (1 + bridge.stealthRateBonusPct));
      if (time - this.lastMeterBroadcast > 120) {
        this.lastMeterBroadcast = time;
        this.broadcastClassMeter();
      }
    }

    if (time < this.invulnerableUntil) {
      this.player.paperDoll.setAlpha(Math.floor(time / 55) % 2 === 0 ? 0.55 : 1);
    } else if (isShadow) {
      this.player.paperDoll.setStealthTint(this.stealthPct >= 100);
    } else {
      this.player.paperDoll.setAlpha(1);
    }

    // Barami Spirit Tamer passive companion auto-attack in Dungeon
    if (this.player.state.activeClass === 'tamer' && this.bossAlive) {
      this.player.pet.trySpiritAutoAttack(
        time,
        this.boss.x,
        this.boss.y - 90,
        () => {
          if (this.bossAlive) {
            this.damageYeakThmor(this.player.facingRight ? 1 : -1, {
              bonusMult: 0.6 * (1 + bridge.petDamageBonusPct),
              tag: 'Pet Spirit',
            });
          }
        },
        false,
        bridge.petAttackSpeedMult
      );
    }

    if (time > this.dashActiveUntil && !this.transitioning) {
      let moveX = this.joystick.x;
      if (!typing) {
        if (this.cursors.left.isDown || this.keys.A.isDown) moveX -= 1;
        if (this.cursors.right.isDown || this.keys.D.isDown) moveX += 1;

        if (
          Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
          Phaser.Input.Keyboard.JustDown(this.keys.W) ||
          Phaser.Input.Keyboard.JustDown(this.cursors.up)
        ) {
          this.performJump();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) || Phaser.Input.Keyboard.JustDown(this.keys.L)) {
          this.performClassDash();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
          this.performClassAttack();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.E) && this.isNearExitPortal()) {
          this.returnToOverworld();
        }
      }

      if (Math.abs(moveX) > 0.12) {
        const dir = moveX < 0 ? -1 : 1;
        this.player.facing = dir > 0 ? 'right' : 'left';
        this.player.body.setVelocityX(dir * 270 * (1 + bridge.moveSpeedBonusPct));
      } else {
        this.player.body.setVelocityX(0);
      }
    }

    if (time < this.attackAnimUntil) {
      this.player.playStateAnimation('attack');
    } else if (!onGround) {
      this.player.playStateAnimation('jump');
    } else if (Math.abs(this.player.body.velocity.x) > 15) {
      this.player.playStateAnimation('walk');
    } else {
      this.player.playStateAnimation('idle');
    }

    this.player.syncVisuals(time, onGround);

    // Update Archer Arrows & Mystic Orbs
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.node.x += p.vx * dt;
      p.node.y += p.vy * dt;

      let consumed = time > p.expiresAt || p.node.x < 20 || p.node.x > ARENA_W - 20;
      if (!consumed && this.bossAlive) {
        const bounds = this.boss.getBounds();
        if (Phaser.Geom.Rectangle.Contains(bounds, p.node.x, p.node.y)) {
          consumed = true;
          this.vfx.playImpactSparks(p.node.x, p.node.y, p.colorHex);
          const dir = p.vx >= 0 ? 1 : -1;
          this.damageYeakThmor(dir, { bonusMult: p.damageScale });
          if (p.kind === 'mystic_orb') {
            this.addMysticYantStack(dir);
          }
        }
      }
      if (consumed) {
        p.node.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    for (const m of this.dustMotes) {
      m.sprite.x += m.speedX * dt;
      if (m.sprite.x > ARENA_W) m.sprite.x = 0;
      m.sprite.y = m.baseY + Math.sin(time / 900 + m.phase) * 14;
    }

    if (this.bossAlive) {
      const ratio = Math.max(0, this.bossHp / BOSS_MAX_HP);
      this.bossShadow.setPosition(this.boss.x, FLOOR_Y - 2);
      this.bossBarBg.setPosition(this.boss.x, BOSS_SPAWN_Y - 104);
      this.bossBarFill.setPosition(this.boss.x - 71, BOSS_SPAWN_Y - 104);
      this.bossBarFill.width = 142 * ratio;
      this.bossLabel.setPosition(this.boss.x, BOSS_SPAWN_Y - 118);
    } else {
      this.bossLabel.setPosition(BOSS_SPAWN_X, BOSS_SPAWN_Y - 118);
    }

    const nearExit = this.isNearExitPortal();
    this.promptText.setVisible(nearExit);
    if (nearExit !== this.nearExitSent) {
      this.nearExitSent = nearExit;
      EventBus.emit('portal:proximity', {
        nearPortal: nearExit,
        label: nearExit ? 'EXIT' : '',
        targetZone: 'overworld',
      });
    }
  }
}
