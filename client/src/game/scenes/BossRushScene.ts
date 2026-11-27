import Phaser from 'phaser';
import {
  INITIAL_PLAYER_STATE,
  type BossId,
  type DifficultyMode,
  type PlayerState,
} from '@shared/types';
import { calculateDamageTaken, calculatePlayerDamage } from '@shared/balanceFormulas';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
import { BOSS_RUSH_ORDER, KHMER_BOSSES } from '@shared/khmerBosses';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { BossController } from '../entities/BossController';
import {
  ClassCombatVFX,
  KHMER_SIGNATURE_SKILLS,
  type SpawnedProjectile,
} from '../animations/ClassCombatVFX';
import { vfxManager } from '../animations/VFXManager';
import { soundManager } from '../systems/SoundManager';

const ARENA_W = 1680;
const ARENA_H = 720;
const FLOOR_Y = 620;
const BOSS_SPAWN_X = 1220;
const EXIT_X = 115;

/**
 * Update 1.8 — Mythic Boss Rush 6-Boss Speedrun Gauntlet!
 * Fights all 6 Khmer Bosses back-to-back:
 *   Sdech Kongkaeb -> Arp Prey Chrov -> Yeak Thmor -> Neak Reach -> Ream Eyso & Moni Mekhala -> Krong Reap
 * Features a live Speedrun Timer on the HUD and a 5-second breather + full heal between bosses.
 */
export class BossRushScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private difficulty: DifficultyMode = 'mythic';
  private stageIndex = 0; // 0..5
  private runStartedAt = 0;
  private breatherEndsAt = 0;
  private inBreather = false;
  private completed = false;
  private defeated = false;
  private transitioning = false;

  private player!: Player;
  private bossCtrl!: BossController;
  private vfx!: ClassCombatVFX;
  private solidFloor!: Phaser.Physics.Arcade.StaticGroup;
  private elevatedPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private projectiles: SpawnedProjectile[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<
    'A' | 'D' | 'W' | 'E' | 'G' | 'J' | 'L' | 'F' | 'Q' | 'R' | 'SHIFT' | 'SPACE',
    Phaser.Input.Keyboard.Key
  >;
  private joystick: JoystickVector = { x: 0, y: 0 };
  private jumpsUsed = 0;
  private dashActiveUntil = 0;
  private dashCooldownUntil = 0;
  private invulnerableUntil = 0;
  private attackCooldownUntil = 0;
  private attackAnimUntil = 0;
  private signatureCooldownUntil = 0;
  private grappleActive = false;
  private grappleTargetX = 0;
  private grappleTargetY = 0;
  private grappleEndAt = 0;
  private grappleCooldownUntil = 0;
  private grappleGraphics!: Phaser.GameObjects.Graphics;
  private focusPct = 0;
  private focusActiveUntil = 0;
  private furyPct = 0;
  private furyActiveUntil = 0;
  private damageTakenTotal = 0;
  private lastHudAt = 0;

  private breatherBanner!: Phaser.GameObjects.Text;
  private arenaPlatforms: Array<{ x: number; y: number; w: number }> = [
    { x: 430, y: 500, w: 224 },
    { x: 760, y: 395, w: 240 },
    { x: 1100, y: 485, w: 224 },
    { x: 1400, y: 370, w: 220 },
  ];
  private unsubs: Array<() => void> = [];

  constructor() {
    super('BossRushScene');
  }

  init(data?: { playerState?: PlayerState; difficulty?: DifficultyMode }): void {
    this.difficulty = data?.difficulty ?? 'mythic';
    this.initialState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'dungeon',
          difficulty: this.difficulty,
          activeMount: null,
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
          currencies: { ...data.playerState.currencies },
          lifeStats: { ...data.playerState.lifeStats },
          activeBuffs: [...data.playerState.activeBuffs],
          quickSnackSlots: [...data.playerState.quickSnackSlots],
          clearedBosses: [...data.playerState.clearedBosses],
        }
      : { ...INITIAL_PLAYER_STATE, zone: 'dungeon', difficulty: this.difficulty, activeMount: null };

    this.stageIndex = 0;
    this.runStartedAt = Date.now();
    this.breatherEndsAt = 0;
    this.inBreather = false;
    this.completed = false;
    this.defeated = false;
    this.transitioning = false;
    this.projectiles = [];
    this.joystick = { x: 0, y: 0 };
    this.jumpsUsed = 0;
    this.focusPct = 0;
    this.focusActiveUntil = 0;
    this.furyPct = 0;
    this.furyActiveUntil = 0;
    this.damageTakenTotal = 0;
    this.signatureCooldownUntil = 0;
  }

  create(): void {
    this.physics.world.resume();
    this.physics.world.gravity.y = 820;
    this.physics.world.setBounds(0, 0, ARENA_W, ARENA_H);
    soundManager.playBgm('boss');

    this.vfx = new ClassCombatVFX(this);
    this.drawArena();
    this.buildPlatforms();

    const bridge = computeVillageToDungeonBridge(this.initialState);
    this.player = new Player(
      this,
      260,
      FLOOR_Y - 46,
      { ...this.initialState, hp: bridge.effectiveMaxHp },
      'dungeon'
    );
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
    this.breatherBanner = this.add
      .text(this.scale.width / 2, 200, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#3b0764',
        strokeThickness: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        padding: { x: 18, y: 8 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2400)
      .setVisible(false);

    this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, ARENA_W, ARENA_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.fadeIn(220, 12, 8, 24);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D,W,E,G,J,L,F,Q,R,SHIFT,SPACE', false) as Record<
      'A' | 'D' | 'W' | 'E' | 'G' | 'J' | 'L' | 'F' | 'Q' | 'R' | 'SHIFT' | 'SPACE',
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.clearCaptures();
    this.input.enabled = true;
    if (this.input.keyboard) {
      this.input.keyboard.enabled = true;
      this.input.keyboard.resetKeys();
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.defeated || this.transitioning) return;
      if (document.querySelector('dialog[open]')) return;
      if (pointer.leftButtonDown()) this.performClassAttack();
    });

    this.spawnBossStage(0);

    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.joystick = vec;
      }),
      EventBus.on('player:loadoutChanged', ({ loadout, playerState }) => {
        this.player.applyLoadoutUpdate(loadout, playerState);
      }),
      EventBus.on('player:stateSync', (nextState) => {
        this.player.syncPlayerState(nextState);
      }),
      EventBus.on('input:jump', () => this.performJump()),
      EventBus.on('input:attack', () => this.performClassAttack()),
      EventBus.on('input:signatureSkill', () => this.performSignatureSkill()),
      EventBus.on('input:dash', () => this.performDash()),
      EventBus.on('input:grapple', () => this.performGrapple()),
      EventBus.on('input:focus', () => this.activateFocus()),
      EventBus.on('input:fury', () => this.activateFury()),
      EventBus.on('input:exitDungeon', () => this.returnToVillage()),
      EventBus.on('travel:execute', () => this.returnToVillage())
    );

    EventBus.emit('scene:ready', { zone: 'dungeon' });
    EventBus.emit('player:state', this.player.state);
    EventBus.emit('ui:toast', {
      text: `⚡ MYTHIC BOSS RUSH STARTED (${this.difficulty.toUpperCase()})! Defeat all 6 Khmer Bosses for speedrun glory!`,
    });
    this.broadcastBossRushHud();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      vfxManager.cleanupScene(this);
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.bossCtrl?.destroy();
      this.player.destroy();
      EventBus.emit('boss:hudUpdate', {
        active: false,
        bossId: BOSS_RUSH_ORDER[0],
        khmerName: '',
        englishName: '',
        hp: 0,
        maxHp: 1,
        phase: 1,
        difficulty: this.difficulty,
        stageLabel: '',
        focusPct: 0,
        focusActive: false,
        furyPct: 0,
        furyActive: false,
        defenseCracked: false,
        damageTakenThisFight: 0,
      });
    });
  }

  private drawArena(): void {
    this.add
      .tileSprite(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 'lf_sky')
      .setTileScale(2.8, 2.8)
      .setTint(0x28102b)
      .setScrollFactor(0.1)
      .setDepth(0);
    this.add
      .tileSprite(ARENA_W / 2, 410, ARENA_W, 256, 'lf_parallax_far')
      .setTileScale(2.2, 2.2)
      .setTint(0x3b1236)
      .setScrollFactor(0.25)
      .setDepth(2);
    this.add
      .tileSprite(ARENA_W / 2, 445, ARENA_W, 256, 'lf_parallax_mid')
      .setTileScale(2.2, 2.2)
      .setTint(0x250e29)
      .setScrollFactor(0.5)
      .setDepth(4);

    for (const tx of [340, 740, 1140, 1500]) {
      this.add.image(tx, FLOOR_Y - 68, 'lf_pillar').setScale(1.6).setTint(0x7c2d12).setDepth(6);
      this.add.image(tx, FLOOR_Y - 125, 'lf_torch').setScale(2.2).setDepth(8);
      const glow = this.add
        .image(tx, FLOOR_Y - 134, 'torch_glow')
        .setTint(0xfacc15)
        .setScale(1.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(9);
      vfxManager.applyBloom(this, glow, { color: 0xfacc15, strength: 1.3 });
    }

    // Exit portal on left
    const exitGlow = this.add
      .image(EXIT_X, FLOOR_Y - 76, 'portal_vortex')
      .setScale(1.45)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(19);
    vfxManager.applyBloom(this, exitGlow, { color: 0x38bdf8, strength: 1.3 });
    this.add.image(EXIT_X, FLOOR_Y + 4, 'angkor_portal').setOrigin(0.5, 0.96).setScale(0.88).setDepth(20);
    this.add
      .text(EXIT_X, FLOOR_Y - 6, 'EXIT [E]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(24);
  }

  private buildPlatforms(): void {
    this.solidFloor = this.physics.add.staticGroup();
    this.elevatedPlatforms = this.physics.add.staticGroup();

    this.add.tileSprite(ARENA_W / 2, FLOOR_Y + 52, ARENA_W, 108, 'lf_cave_floor').setTileScale(1.8, 1.8).setDepth(10);
    this.add.tileSprite(ARENA_W / 2, FLOOR_Y + 10, ARENA_W, 34, 'lf_moss_top').setTileScale(1.8, 1.4).setTint(0xf59e0b).setDepth(11);
    const floorRect = this.add.rectangle(ARENA_W / 2, FLOOR_Y + 50, ARENA_W, 100, 0x000000, 0);
    this.solidFloor.add(floorRect);

    for (const p of this.arenaPlatforms) {
      this.add.tileSprite(p.x, p.y, p.w, 26, 'lf_plat_stone').setTileScale(1.6, 1.5).setDepth(14);
      const col = this.add.rectangle(p.x, p.y, p.w, 18, 0x000000, 0);
      this.elevatedPlatforms.add(col);
    }
  }

  private spawnBossStage(idx: number): void {
    this.bossCtrl?.destroy();
    this.stageIndex = idx;
    const bossId: BossId = BOSS_RUSH_ORDER[idx];
    const def = KHMER_BOSSES[bossId];

    this.bossCtrl = new BossController(
      this,
      bossId,
      this.difficulty,
      BOSS_SPAWN_X,
      FLOOR_Y,
      190,
      ARENA_W - 100,
      {
        onHitPlayer: (rawAtk, label, pullDir, isPoison) =>
          this.handlePlayerHit(rawAtk, label, pullDir, isPoison),
        onFloatingText: (x, y, text, color, fontSize) =>
          this.spawnFloatingText(x, y, text, color, fontSize ?? '16px'),
        onPhaseChange: (phase) => {
          EventBus.emit('ui:toast', {
            text: `⚡ Boss Rush ${idx + 1}/6 — ${def.khmerName} entered PHASE ${phase}!`,
          });
          this.broadcastBossRushHud();
        },
        onDefeated: () => this.handleStageBossDefeated(),
      }
    );

    // Boss Rush pacing: tune HP slightly (65%) so 6 consecutive bosses are thrilling & speedrunnable!
    this.bossCtrl.maxHp = Math.max(1200, Math.round(this.bossCtrl.maxHp * 0.65));
    this.bossCtrl.hp = this.bossCtrl.maxHp;

    this.breatherBanner.setVisible(false);
    this.inBreather = false;
    vfxManager.radialShockwave(this, BOSS_SPAWN_X, FLOOR_Y - 70, 0xfacc15, 160, 420, 72);
    this.spawnFloatingText(
      BOSS_SPAWN_X,
      FLOOR_Y - 190,
      `STAGE ${idx + 1}/6 · ${def.khmerName}`,
      '#fde047',
      '20px'
    );
    this.broadcastBossRushHud();
  }

  private handleStageBossDefeated(): void {
    soundManager.playSfx('victory');
    const clearedId = BOSS_RUSH_ORDER[this.stageIndex];
    if (!this.player.state.clearedBosses.includes(clearedId)) {
      this.player.state.clearedBosses = [...this.player.state.clearedBosses, clearedId];
    }

    // Track bounty progress on each boss kill
    EventBus.emit('bounty:progress', {
      category: this.difficulty === 'mythic' ? 'defeat_mythic_boss' : 'defeat_any_boss',
      amount: 1,
    });

    // Final Boss #6 cleared -> BOSS RUSH VICTORY!
    if (this.stageIndex >= BOSS_RUSH_ORDER.length - 1) {
      this.completed = true;
      const elapsedMs = Math.max(1000, Date.now() - this.runStartedAt);
      const secStr = this.formatSpeedrun(elapsedMs);
      vfxManager.playLevelUpLightPillar(this, this.player.x, this.player.y);
      this.breatherBanner
        .setText(`👑 MYTHIC BOSS RUSH CLEARED IN ${secStr}!\n+3,000 Coins · +15 Gold · Sovereign of Angkor Title & Radiant Wings!`)
        .setVisible(true);

      EventBus.emit('bossRush:completed', {
        elapsedMs,
        difficulty: this.difficulty,
        coins: 3000,
        gold: 15,
        unlockedSovereignTitle: true,
        unlockedSovereignWings: true,
      });

      this.time.delayedCall(3400, () => {
        if (this.sys?.isActive()) this.returnToVillage();
      });
      return;
    }

    // 5-Second Breather + Full Heal between Bosses!
    this.inBreather = true;
    this.breatherEndsAt = Date.now() + 5000;
    const bridge = computeVillageToDungeonBridge(this.player.state);
    this.player.state.hp = bridge.effectiveMaxHp;
    EventBus.emit('player:state', { ...this.player.state });
    soundManager.playSfx('heal');
    vfxManager.playLevelUpLightPillar(this, this.player.x, this.player.y);
    this.spawnFloatingText(this.player.x, this.player.y - 54, '💚 FULL HEAL · 5s BREATHER!', '#4ade80', '16px');
    this.broadcastBossRushHud();
  }

  private handlePlayerHit(rawAtk: number, label: string, pullDir?: number, isPoison = false): void {
    const now = this.time.now;
    if (this.defeated || this.transitioning || this.inBreather || now < this.invulnerableUntil) return;
    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now());
    if (isPoison && bridge.poisonImmune) {
      this.invulnerableUntil = now + 500;
      this.spawnFloatingText(this.player.x, this.player.y - 44, '🟢 POISON IMMUNE!', '#67e8f9', '14px');
      return;
    }
    const dmg = calculateDamageTaken({
      bossAttack: rawAtk,
      currentDefense: bridge.effectiveDefense,
      armorPrefix: this.player.state.armorPrefix,
      rawDR: bridge.rawDRBonus,
      difficulty: this.difficulty,
    });
    this.invulnerableUntil = now + 900;
    this.damageTakenTotal += dmg;
    this.focusPct = 0;
    this.furyPct = Math.min(100, this.furyPct + 26);
    this.player.state.hp = Math.max(0, this.player.state.hp - dmg);
    this.player.paperDoll.flashWhite(150);
    this.cameras.main.shake(110, 0.006);
    soundManager.playSfx('hit');
    const knock = pullDir ?? (this.player.x < this.bossCtrl.x ? -1 : 1);
    this.player.body.setVelocity(knock * 210, -180);
    this.spawnFloatingText(this.player.x, this.player.y - 40, `-${dmg} (${label})`, '#f87171', '14px');
    EventBus.emit('player:state', { ...this.player.state });

    if (this.player.state.hp <= 0) {
      this.defeated = true;
      this.breatherBanner
        .setText(`💀 Defeated on Boss Rush Stage ${this.stageIndex + 1}/6 — Returning to Temple District...`)
        .setVisible(true);
      this.player.state.hp = bridge.effectiveMaxHp;
      EventBus.emit('player:state', { ...this.player.state });
      this.time.delayedCall(1800, () => {
        if (this.sys?.isActive()) this.returnToVillage();
      });
    }
  }

  private damageBoss(dir: number, bonusMult = 1, guaranteedCrit = false, tag?: string): void {
    if (!this.bossCtrl?.alive || this.inBreather) return;
    const bridge = computeVillageToDungeonBridge(this.player.state, Date.now());
    const focusOn = this.time.now < this.focusActiveUntil;
    const furyOn = this.time.now < this.furyActiveUntil;
    const weapon = this.player.state.weapon;

    const hit = calculatePlayerDamage({
      weaponBase: weapon.baseDamage,
      upgradeLevel: weapon.upgradeLevel,
      flatBonuses: bridge.flatDamageBonus,
      skillPct: bridge.classSkillDamagePct,
      armorPct: this.player.state.armorDamagePct,
      snackBuffPct: bridge.snackAttackPct,
      enemyDefense: this.bossCtrl.def.defense,
      armorPen: weapon.armorPen,
      critChance: Math.min(0.95, bridge.effectiveCritChance + (furyOn ? 0.25 : 0)),
      critMultiplier: bridge.critMultiplier,
      isCritOverride: guaranteedCrit || focusOn ? true : undefined,
    });
    const focusMult = focusOn ? 2.2 : 1;
    const total = Math.max(1, Math.round(hit.finalDamage * bonusMult * focusMult));
    soundManager.playSfx(hit.isCrit || focusOn ? 'crit' : 'hit');
    if (hit.isCrit || focusOn) vfxManager.hitStop(this, 40);
    this.spawnFloatingText(
      this.bossCtrl.x + (Math.random() - 0.5) * 60,
      this.bossCtrl.y - 135,
      tag ? `${tag} ${total}!` : hit.isCrit ? `${total}! CRIT` : `${total}`,
      tag ? '#fde047' : hit.isCrit ? '#facc15' : '#ffffff',
      tag || hit.isCrit ? '20px' : '15px'
    );
    this.bossCtrl.takeDamage(total, dir, hit.isCrit || focusOn);
    this.broadcastBossRushHud();
  }

  private performJump(): void {
    if (this.defeated || this.transitioning) return;
    const bridge = computeVillageToDungeonBridge(this.player.state);
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (onGround) {
      this.jumpsUsed = 1;
      this.player.body.setVelocityY(-495 * (1 + bridge.jumpPowerBonusPct));
    } else if (this.jumpsUsed < 2) {
      this.jumpsUsed = 2;
      this.player.body.setVelocityY(-460 * (1 + bridge.jumpPowerBonusPct));
    }
  }

  private performDash(): void {
    const now = this.time.now;
    if (now < this.dashCooldownUntil || this.defeated) return;
    const dir = this.player.facingRight ? 1 : -1;
    this.dashCooldownUntil = now + 850;
    this.dashActiveUntil = now + 190;
    this.invulnerableUntil = Math.max(this.invulnerableUntil, now + 380);
    this.player.body.setVelocity(dir * 620, -40);
    vfxManager.spawnAfterimage(this, this.player.x, this.player.y, 0xfacc15, 1, 240, 52);
  }

  private performGrapple(): void {
    const now = this.time.now;
    if (now < this.grappleCooldownUntil || this.defeated) return;
    const px = this.player.x;
    const py = this.player.y;
    const best = this.arenaPlatforms.find((p) => py - p.y > 32 && Phaser.Math.Distance.Between(px, py, p.x, p.y) < 390);
    if (!best) return;
    this.grappleActive = true;
    this.grappleTargetX = best.x;
    this.grappleTargetY = best.y - 34;
    this.grappleEndAt = now + 360;
    this.grappleCooldownUntil = now + 1000;
    this.jumpsUsed = 1;
    soundManager.playSfx('swing');
  }

  private activateFocus(): void {
    if (this.focusPct < 100) return;
    this.focusPct = 0;
    this.focusActiveUntil = this.time.now + 5000;
    soundManager.playSfx('level_up');
    this.spawnFloatingText(this.player.x, this.player.y - 48, '⚡ FOCUS (+120% DMG)!', '#22d3ee', '16px');
  }

  private activateFury(): void {
    if (this.furyPct < 100) return;
    this.furyPct = 0;
    this.furyActiveUntil = this.time.now + 7000;
    soundManager.playSfx('level_up');
    this.spawnFloatingText(this.player.x, this.player.y - 48, '🔥 FURY (+40% SPD)!', '#fb7185', '16px');
  }

  private performClassAttack(): void {
    const now = this.time.now;
    if (now < this.attackCooldownUntil || this.defeated || this.inBreather) return;
    const cls = this.player.state.activeClass;
    const dir = this.bossCtrl?.alive ? (this.bossCtrl.x >= this.player.x ? 1 : -1) : this.player.facingRight ? 1 : -1;
    this.player.facing = dir > 0 ? 'right' : 'left';
    const furyMult = now < this.furyActiveUntil ? 1.4 : 1;
    this.attackCooldownUntil = now + Math.round(this.player.state.weapon.attackCooldownMs / furyMult);
    this.attackAnimUntil = now + 180;
    soundManager.playSfx('swing');

    if (cls === 'archer') {
      this.projectiles.push(this.vfx.spawnArcherArrow(this.player.x, this.player.y - 8, dir, 1.1));
    } else if (cls === 'mystic') {
      this.projectiles.push(this.vfx.spawnMysticOrb(this.player.x, this.player.y - 10, dir));
    } else {
      if (cls === 'tamer') this.vfx.playKramaWhipSnap(this.player.x, this.player.y, dir);
      else if (cls === 'shadow') this.vfx.playShadowTwinSlash(this.player.x, this.player.y, dir, false);
      else this.vfx.playLbokatorSlash(this.player.x, this.player.y, dir, 2);

      const hitBox = new Phaser.Geom.Rectangle(this.player.x + dir * 24 - 64, this.player.y - 54, 150, 96);
      if (this.bossCtrl?.alive && this.bossCtrl.intersectsHitbox(hitBox)) {
        this.damageBoss(dir, 1.05);
      }
    }
  }

  private performSignatureSkill(): void {
    const now = this.time.now;
    if (this.defeated || this.inBreather || now < this.signatureCooldownUntil) return;
    const cls = this.player.state.activeClass;
    const meta = KHMER_SIGNATURE_SKILLS[cls];
    this.signatureCooldownUntil = now + meta.cooldownMs;
    this.attackAnimUntil = now + 260;
    this.invulnerableUntil = Math.max(this.invulnerableUntil, now + 380);
    soundManager.playSfx('signature_skill');

    EventBus.emit('combat:signatureSkillState', {
      classId: cls,
      skillName: meta.name,
      khmerName: meta.khmerName,
      icon: meta.icon,
      accentColor: meta.accentColor,
      cooldownMs: meta.cooldownMs,
      readyAt: Date.now() + meta.cooldownMs,
    });

    const dir = this.bossCtrl?.alive ? (this.bossCtrl.x >= this.player.x ? 1 : -1) : 1;
    const targetX = this.bossCtrl?.alive ? this.bossCtrl.x : this.player.x + dir * 220;
    const targetY = this.bossCtrl?.alive ? this.bossCtrl.y - 72 : FLOOR_Y - 60;

    if (cls === 'lbokator') {
      this.player.body.setVelocityY(-450);
      this.vfx.playSignatureHanumanShatter(Phaser.Math.Clamp(this.player.x + dir * 90, 100, ARENA_W - 100), FLOOR_Y, () => {
        this.damageBoss(dir, meta.damageMult, true, '💥 HANUMAN SHATTER');
      });
    } else if (cls === 'archer') {
      this.vfx.playSignatureGoldenArrowRain(this.player.x, this.player.y, targetX, FLOOR_Y, (idx) => {
        this.damageBoss(dir, meta.damageMult / 3, idx === 11, idx === 11 ? '🏹 GOLDEN ARROWS' : '🏹 VOLLEY');
      });
    } else if (cls === 'mystic') {
      this.vfx.playSignatureSacredMandala(targetX, FLOOR_Y, (erupted) => {
        this.damageBoss(dir, erupted ? meta.damageMult * 0.72 : meta.damageMult * 0.35, erupted, erupted ? '☸️ MANDALA' : '☸️ PULSE');
      });
    } else if (cls === 'tamer') {
      this.vfx.playSignatureNagaSurge(this.player.x, this.player.y - 24, targetX, targetY, (pass) => {
        this.damageBoss(dir, meta.damageMult * 0.55, pass === 1, '🐉 NAGA SURGE');
      });
    } else {
      this.vfx.playSignaturePhantomLotus(this.player.x, this.player.y, targetX, targetY, () => {
        this.damageBoss(dir, meta.damageMult, true, '🌸 PHANTOM LOTUS');
      });
      this.player.sprite.setPosition(Phaser.Math.Clamp(targetX + dir * 82, 90, ARENA_W - 90), this.player.y);
    }
  }

  private formatSpeedrun(ms: number): string {
    const totalSec = Math.max(0, ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
  }

  private broadcastBossRushHud(): void {
    const elapsedMs = Date.now() - this.runStartedAt;
    const breatherSec = this.inBreather ? Math.max(0, Math.ceil((this.breatherEndsAt - Date.now()) / 1000)) : 0;
    const curId = BOSS_RUSH_ORDER[this.stageIndex];
    const def = KHMER_BOSSES[curId];
    EventBus.emit('boss:hudUpdate', {
      active: true,
      bossId: curId,
      khmerName: def.khmerName,
      englishName: def.englishName,
      hp: this.bossCtrl?.hp ?? 0,
      maxHp: this.bossCtrl?.maxHp ?? 1,
      phase: this.bossCtrl?.phase ?? 1,
      difficulty: this.difficulty,
      stageLabel: this.inBreather ? `BREATHER (${breatherSec}s)` : this.bossCtrl?.getStageLabel() ?? '',
      focusPct: Math.round(this.focusPct),
      focusActive: this.time.now < this.focusActiveUntil,
      furyPct: Math.round(this.furyPct),
      furyActive: this.time.now < this.furyActiveUntil,
      defenseCracked: false,
      damageTakenThisFight: this.damageTakenTotal,
      duoStatus: this.bossCtrl?.getDuoStatus(),
      bossRush: {
        active: true,
        stageIndex: this.stageIndex + 1,
        totalStages: BOSS_RUSH_ORDER.length,
        elapsedMs,
        breatherSec,
      },
    });
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, fontSize = '15px'): void {
    vfxManager.spawnFloatingText(this, x, y, text, color, fontSize, {
      riseY: 36,
      durationMs: 800,
      depth: 2300,
    });
  }

  private returnToVillage(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(220, 8, 12, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId: 'temple_district',
        spawnX: 800,
        spawnY: 460,
        playerState: { ...this.player.state, zone: 'overworld', currentMapId: 'temple_district' },
      });
    });
  }

  update(time: number, delta: number): void {
    vfxManager.ensurePhysicsResumed(this);
    vfxManager.tickPerformanceMonitor(this, delta);
    const modalOpen = Boolean(document.querySelector('dialog[open]'));
    if (this.input.enabled === modalOpen) this.input.enabled = !modalOpen;
    if (this.input.keyboard && this.input.keyboard.enabled === modalOpen) this.input.keyboard.enabled = !modalOpen;

    const dt = delta / 1000;
    const typing = modalOpen || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (onGround) this.jumpsUsed = 0;

    // 5-second breather countdown between Boss Rush stages
    if (this.inBreather && !this.completed && !this.defeated) {
      const remMs = this.breatherEndsAt - Date.now();
      const remSec = Math.max(0, Math.ceil(remMs / 1000));
      const nextBoss = KHMER_BOSSES[BOSS_RUSH_ORDER[this.stageIndex + 1]];
      this.breatherBanner
        .setText(`💚 FULL HEAL RESTORED!\nNEXT BOSS (${this.stageIndex + 2}/6): ${nextBoss.khmerName} in ${remSec}s...`)
        .setVisible(true);
      if (remMs <= 0) {
        this.spawnBossStage(this.stageIndex + 1);
      }
    }

    // Grapple line
    this.grappleGraphics.clear();
    if (this.grappleActive && !this.defeated) {
      const dx = this.grappleTargetX - this.player.x;
      const dy = this.grappleTargetY - this.player.y;
      const dist = Math.hypot(dx, dy);
      this.grappleGraphics.lineStyle(3, 0x4ade80, 0.95).lineBetween(this.player.x, this.player.y - 8, this.grappleTargetX, this.grappleTargetY + 12);
      if (dist < 24 || time >= this.grappleEndAt) {
        this.grappleActive = false;
        this.player.body.setVelocity(dx * 1.3, -210);
      } else {
        this.player.body.setVelocity((dx / dist) * 760, (dy / dist) * 760);
      }
    }

    if (!this.defeated && !this.transitioning && !this.inBreather && this.bossCtrl?.alive) {
      if (time >= this.focusActiveUntil && this.focusPct < 100) this.focusPct = Math.min(100, this.focusPct + dt * 5.8);
      if (time >= this.furyActiveUntil && Math.abs(this.player.x - this.bossCtrl.x) < 340 && this.furyPct < 100) {
        this.furyPct = Math.min(100, this.furyPct + dt * 5.2);
      }
    }

    if (!this.defeated && time > this.dashActiveUntil && !this.grappleActive && !this.transitioning) {
      let moveX = this.joystick.x;
      if (!typing) {
        if (this.cursors.left.isDown || this.keys.A.isDown) moveX -= 1;
        if (this.cursors.right.isDown || this.keys.D.isDown) moveX += 1;
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
          this.performJump();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.G)) this.performGrapple();
        if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) || Phaser.Input.Keyboard.JustDown(this.keys.L)) this.performDash();
        if (Phaser.Input.Keyboard.JustDown(this.keys.J)) this.performClassAttack();
        if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) this.performSignatureSkill();
        if (Phaser.Input.Keyboard.JustDown(this.keys.F)) this.activateFocus();
        if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this.activateFury();
        if (Phaser.Input.Keyboard.JustDown(this.keys.E) && Math.abs(this.player.x - EXIT_X) < 88) this.returnToVillage();
      }
      const bridge = computeVillageToDungeonBridge(this.player.state);
      if (Math.abs(moveX) > 0.12) {
        const dir = moveX < 0 ? -1 : 1;
        this.player.facing = dir > 0 ? 'right' : 'left';
        this.player.body.setVelocityX(dir * 275 * (1 + bridge.moveSpeedBonusPct));
      } else {
        this.player.body.setVelocityX(0);
      }
    }

    this.player.playStateAnimation(
      time < this.attackAnimUntil ? 'attack' : !onGround ? 'jump' : Math.abs(this.player.body.velocity.x) > 15 ? 'walk' : 'idle'
    );
    this.player.syncVisuals(time, onGround);

    if (!this.defeated && !this.inBreather && this.bossCtrl?.alive) {
      const playerBounds = new Phaser.Geom.Rectangle(this.player.x - 16, this.player.y - 26, 32, 48);
      this.bossCtrl.update(time, delta, this.player.x, this.player.y, playerBounds);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.node.x += p.vx * dt;
      p.node.y += p.vy * dt;
      const pBox = new Phaser.Geom.Rectangle(p.node.x - 14, p.node.y - 14, 28, 28);
      let hit = false;
      if (this.bossCtrl?.alive && !this.inBreather && this.bossCtrl.intersectsHitbox(pBox)) {
        this.vfx.playImpactSparks(p.node.x, p.node.y, p.colorHex);
        this.damageBoss(p.vx >= 0 ? 1 : -1, p.damageScale);
        hit = true;
      }
      if (hit || time >= p.expiresAt || p.node.x < 0 || p.node.x > ARENA_W) {
        p.node.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    if (time - this.lastHudAt > 120) {
      this.lastHudAt = time;
      this.broadcastBossRushHud();
    }
  }
}
