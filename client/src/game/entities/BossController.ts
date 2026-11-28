import Phaser from 'phaser';
import type { BossId, DifficultyMode } from '@shared/types';
import {
  KHMER_BOSSES,
  getDifficultySpeedMultiplier,
  getScaledBossMaxHp,
  type KhmerBossDef,
} from '@shared/khmerBosses';
import {
  TelegraphRenderer,
  type BossHazard,
  type TelegraphColor,
} from '../animations/TelegraphRenderer';
import { vfxManager } from '../animations/VFXManager';
import { WormBossEntity } from './WormBossEntity';

export type BossStage = 'idle' | 'windup' | 'active' | 'recovery' | 'phase_roar' | 'defeated';

export interface BossControllerCallbacks {
  onHitPlayer: (rawAttack: number, label: string, pullDir?: number, isPoison?: boolean) => void;
  onFloatingText: (x: number, y: number, text: string, color: string, fontSize?: string) => void;
  onPhaseChange: (phase: 2 | 3) => void;
  onDefeated: () => void;
}

/**
 * Reusable Multi-Phase Khmer Boss Rig Engine supporting ALL 4 Rigs from
 * docs/GDD_KHMER_LORE_AND_ANIMATION.md:
 * 1. QuadrupedHopperRig  -> Boss #1: Sdech Kongkaeb (King Frog)
 * 2. FloaterRig          -> Boss #2: Arp Prey Chrov (Dark Cavern Bioluminescent Ghost)
 * 3. HumanoidRig         -> Boss #5: Yeak Thmor (Stone Yaksha)
 * 4. MultiSegmentWormRig -> Boss #6: Neak Reach (10-Segment Shadow Naga + Poison Pools)
 *
 * Strictly enforces the 4-Stage Boss Telegraph Rule:
 *   Wind-Up (0.5s–0.8s) -> Active Strike -> Impact Juice -> Recovery Window (0.7s–1.1s)
 */
export class BossController {
  public readonly def: KhmerBossDef;
  public readonly difficulty: DifficultyMode;
  public maxHp: number;
  public hp: number;
  public phase: 1 | 2 | 3 = 1;
  public stage: BossStage = 'idle';
  public alive = true;
  public x: number;
  public y: number;
  public hazards: BossHazard[] = [];

  private scene: Phaser.Scene;
  private telegraphs: TelegraphRenderer;
  private callbacks: BossControllerCallbacks;
  private floorY: number;
  private arenaMinX: number;
  private arenaMaxX: number;
  private speedMult: number;

  private sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private throatGlow?: Phaser.GameObjects.Arc;
  private stageBadge: Phaser.GameObjects.Text;
  private baseScale: number;

  // FloaterRig (Arp Prey Chrov) Dark Cavern Veil + Bioluminescent Spotlight Aura + Orbiting Cyan Fire-Wisps
  private darkVeil?: Phaser.GameObjects.Rectangle;
  private arpSpotlight?: Phaser.GameObjects.Arc;
  private arpOuterGlow?: Phaser.GameObjects.Arc;
  private arpWisps: Phaser.GameObjects.Arc[] = [];
  private playerLanternGlow?: Phaser.GameObjects.Arc;
  private isFigure8Swooping = false;
  private swoopStartAt = 0;
  private swoopDurationMs = 1900;
  private swoopCenterX = 900;
  private swoopCenterY = 390;
  private isSpinning = false;
  private lastOrbDropAt = 0;

  // MultiSegmentWormRig (Neak Reach — Shadow Naga) 10-segment sinusoidal serpent body
  private wormEntity?: WormBossEntity;
  private wormVx = -180;
  private wormVy = 0;
  private wormTargetX = 900;
  private wormTargetY = 380;
  private wormLunging = false;

  // Update 1.8 — DuoStormCrystalRig (Ream Eyso & Moni Mekhala — Two Simultaneous Bosses!)
  private eysoHp = 0;
  private eysoMaxHp = 0;
  private mekhalaHp = 0;
  private mekhalaMaxHp = 0;
  private duoOverdriveName: string | null = null;
  private eysoAura?: Phaser.GameObjects.Arc;
  private mekhalaContainer?: Phaser.GameObjects.Container;
  private mekhalaX = 1120;
  private mekhalaY = 300;
  private mekhalaNextCastAt = 0;

  // Update 1.8 — SovereignYakshaRig (Krong Reap — 3-Phase Ten-Headed Yaksha Sovereign!)
  private sovereignAura?: Phaser.GameObjects.Arc;
  private sovereignCrownRing?: Phaser.GameObjects.Arc;
  private sovereignVignette?: Phaser.GameObjects.Rectangle;
  private yakshaMasks: Phaser.GameObjects.Container[] = [];
  private maskFireCooldownAt = 0;

  private nextStateAt = 0;
  private attackCounter = 0;
  private pendingAction?: () => void;
  private activeAttackHitApplied = false;
  private dashVelX = 0;
  private dashVelY = 0;
  private dashHitboxActive = false;
  private dashLabel = '';
  private leapTargetX = 0;
  private leapStartX = 0;
  private leapStartAt = 0;
  private leapDurationMs = 520;
  private isLeaping = false;

  constructor(
    scene: Phaser.Scene,
    bossId: BossId,
    difficulty: DifficultyMode,
    spawnX: number,
    floorY: number,
    arenaMinX: number,
    arenaMaxX: number,
    callbacks: BossControllerCallbacks
  ) {
    this.scene = scene;
    this.def = KHMER_BOSSES[bossId];
    this.difficulty = difficulty;
    this.maxHp = getScaledBossMaxHp(bossId, difficulty, 1);
    this.hp = this.maxHp;
    this.floorY = floorY;
    this.arenaMinX = arenaMinX;
    this.arenaMaxX = arenaMaxX;
    this.callbacks = callbacks;
    this.speedMult = getDifficultySpeedMultiplier(difficulty);
    this.telegraphs = new TelegraphRenderer(scene);

    const isAirborne = this.def.rig === 'FloaterRig' || this.def.rig === 'MultiSegmentWormRig';
    this.x = spawnX;
    this.y = isAirborne ? floorY - 210 : floorY;

    // Resolve REAL unique custom Khmer 16-bit pixel-art boss textures (6 distinct bosses — zero duplicates!)
    let resolvedTexKey = this.def.textureKey;
    let idleAnimKey: string | null = null;
    if (bossId === 'sdech_kongkaeb') {
      if (scene.textures.exists('boss_sdech_kongkaeb_hq')) {
        resolvedTexKey = 'boss_sdech_kongkaeb_hq';
        this.baseScale = 1.25;
      } else {
        resolvedTexKey = 'boss_giant_frog_idle';
        idleAnimKey = 'boss_frog_idle';
        this.baseScale = 3.4;
      }
    } else if (bossId === 'arp_prey_chrov') {
      if (scene.textures.exists('boss_arp_prey_chrov_hq')) {
        resolvedTexKey = 'boss_arp_prey_chrov_hq';
        this.baseScale = 1.18;
      } else {
        resolvedTexKey = 'boss_giant_spirit_idle';
        idleAnimKey = 'boss_spirit_idle';
        this.baseScale = 2.5;
      }
    } else if (bossId === 'neak_reach') {
      if (scene.textures.exists('boss_neak_reach_king')) {
        resolvedTexKey = 'boss_neak_reach_king';
        this.baseScale = 1.24;
      } else {
        resolvedTexKey = 'boss_dragon_head';
        this.baseScale = 2.15;
      }
    } else if (bossId === 'ream_eyso_moni_mekhala') {
      resolvedTexKey = scene.textures.exists('boss_ream_eyso_moni_mekhala')
        ? 'boss_ream_eyso_moni_mekhala'
        : 'boss_yeak_thmor';
      this.baseScale = 1.32;
    } else if (bossId === 'krong_reap' || bossId === 'rahu' || bossId === 'astral_warden_angkor') {
      resolvedTexKey = scene.textures.exists('boss_krong_reap') ? 'boss_krong_reap' : 'boss_yeak_thmor';
      this.baseScale = bossId === 'rahu' || bossId === 'astral_warden_angkor' ? 1.56 : 1.38;
    } else if (
      bossId === 'preay_krola_plerng' ||
      bossId === 'apsara_srong' ||
      bossId === 'garuda' ||
      bossId === 'kala' ||
      bossId === 'khmouch_chheam_prey' ||
      bossId === 'khmouch_daeum_chek' ||
      bossId === 'preay_teuk' ||
      bossId === 'baksey_meas'
    ) {
      resolvedTexKey = scene.textures.exists('boss_arp_prey_chrov_hq')
        ? 'boss_arp_prey_chrov_hq'
        : 'boss_giant_spirit_idle';
      this.baseScale = bossId === 'garuda' || bossId === 'kala' || bossId === 'baksey_meas' ? 1.32 : 1.18;
    } else if (bossId === 'kropeu_neang_kheng' || bossId === 'neak_plerng') {
      resolvedTexKey = scene.textures.exists('boss_neak_reach_king')
        ? 'boss_neak_reach_king'
        : 'boss_sdech_kongkaeb_hq';
      this.baseScale = 1.3;
    } else if (bossId === 'preah_ko_preah_keo' || bossId === 'maccha_tep') {
      resolvedTexKey = scene.textures.exists('boss_ream_eyso_moni_mekhala')
        ? 'boss_ream_eyso_moni_mekhala'
        : 'boss_yeak_thmor';
      this.baseScale = 1.36;
    } else if (
      bossId === 'reachsey' ||
      bossId === 'hanuman_shadow_general' ||
      bossId === 'yeak_prey' ||
      bossId === 'sdech_damrey_sor'
    ) {
      resolvedTexKey = 'boss_yeak_thmor';
      this.baseScale = 1.44;
    } else {
      // Boss #5: Yeak Thmor -> REAL cleaned transparent Khmer sprite (/assets/khmer/bosses/boss_yeak_thmor.png)
      resolvedTexKey = 'boss_yeak_thmor';
      this.baseScale = 1.45;
    }

    this.shadow = scene.add
      .image(spawnX, floorY - 2, 'soft_shadow')
      .setDisplaySize(bossId === 'sdech_kongkaeb' ? 168 : bossId === 'arp_prey_chrov' ? 116 : 176, 30)
      .setAlpha(isAirborne ? 0.5 : 1)
      .setDepth(40);

    // Build 9 trailing real DragonGreen body segments behind the head (10 segments total!)
    if (this.def.rig === 'MultiSegmentWormRig') {
      this.wormEntity = new WormBossEntity(scene, spawnX, this.y, {
        segmentCount: 9,
        baseScale: 1.85,
        bodyTextureKey: 'boss_dragon_body',
        tailTextureKey: 'boss_dragon_tail',
      });
    }

    this.sprite = scene.add
      .sprite(spawnX, this.y, resolvedTexKey, 0)
      .setOrigin(0.5, isAirborne ? 0.5 : 0.96)
      .setScale(this.baseScale)
      .setDepth(42);

    // Update 3.5 — Distinct Elemental Bloom, Solar Wings (Garuda), Time Visage Aura (Kala) & Sky Eclipse (Rahu)!
    const bossThemeTint: Partial<Record<BossId, number>> = {
      preay_krola_plerng: 0xfb923c,
      khmouch_chheam_prey: 0x34d399,
      kropeu_neang_kheng: 0x2dd4bf,
      apsara_srong: 0xfbbf24,
      reachsey: 0xfde047,
      hanuman_shadow_general: 0xe2e8f0,
      garuda: 0xfacc15,
      kala: 0x38bdf8,
      preah_ko_preah_keo: 0x34d399,
      rahu: 0xc084fc,
    };
    const themeTint = bossThemeTint[bossId];
    if (themeTint) {
      this.sprite.setTint(themeTint);
      vfxManager.applyGlow(scene, this.sprite, themeTint, bossId === 'rahu' ? 3.8 : 2.2, 0.35);
    }

    if (bossId === 'rahu') {
      // Calamity Superboss Rahu physically eclipses the arena sky with a blazing black-and-gold solar corona!
      scene.add.rectangle(900, 340, 2200, 920, 0x05020d, 0.44).setDepth(18);
      const eclipseCorona = scene.add
        .circle(900, 210, 128, 0xfacc15, 0.36)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(19);
      scene.add.circle(900, 210, 102, 0x090512, 0.98).setStrokeStyle(5, 0xfef08a, 0.96).setDepth(20);
      vfxManager.applyBloom(scene, eclipseCorona, { color: 0xfacc15, strength: 2.0 });
      scene.tweens.add({
        targets: eclipseCorona,
        scale: 1.14,
        alpha: 0.54,
        duration: 1650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (bossId === 'garuda') {
      // Garuda Solar Sky Sovereign blazing solar halo!
      const sunHalo = scene.add
        .circle(spawnX, this.y - 20, 96, 0xf59e0b, 0.28)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(41);
      vfxManager.applyBloom(scene, sunHalo, { color: 0xfacc15, strength: 1.8 });
      this.arpOuterGlow = sunHalo;
    } else if (bossId === 'kala') {
      // Kala Devourer of Time pulsing cyan chrono-ring!
      const chronoHalo = scene.add
        .circle(spawnX, this.y, 110, 0x06b6d4, 0.26)
        .setStrokeStyle(3, 0x67e8f9, 0.85)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(41);
      this.arpOuterGlow = chronoHalo;
    }

    if (idleAnimKey && scene.anims.exists(idleAnimKey)) {
      this.sprite.play(idleAnimKey);
    }

    if (bossId === 'sdech_kongkaeb') {
      this.throatGlow = scene.add
        .circle(spawnX, floorY - 36, 26, 0xef4444, 0)
        .setDepth(43);
    }

    // FloaterRig (Arp Prey Chrov): Darkened cavern veil + radial bioluminescent spotlight aura
    if (this.def.rig === 'FloaterRig') {
      this.darkVeil = scene.add
        .rectangle(900, 360, 2200, 960, 0x020617, 0.56)
        .setDepth(32);

      this.arpOuterGlow = scene.add
        .circle(spawnX, this.y, 170, 0x10b981, 0.22)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(33);

      this.arpSpotlight = scene.add
        .circle(spawnX, this.y, 92, 0x34d399, 0.34)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(34);

      this.playerLanternGlow = scene.add
        .circle(280, floorY - 46, 128, 0xfef08a, 0.18)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(33);

      // 4 Orbiting Cyan Fire-Wisps around Arp Prey Chrov
      for (let i = 0; i < 4; i++) {
        const wisp = scene.add
          .circle(spawnX, this.y, 8, 0x22d3ee, 0.9)
          .setStrokeStyle(2, 0xe0f2fe)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(45);
        vfxManager.applyGlow(scene, wisp, 0x22d3ee, 2.5, 0.4);
        this.arpWisps.push(wisp);
      }
    }

    // Update 1.8 — DuoStormCrystalRig: Ream Eyso (ground storm warrior) + Moni Mekhala (overhead crystal goddess)
    if (this.def.rig === 'DuoStormCrystalRig') {
      this.eysoMaxHp = Math.round(this.maxHp * 0.55);
      this.mekhalaMaxHp = Math.max(1, this.maxHp - this.eysoMaxHp);
      this.eysoHp = this.eysoMaxHp;
      this.mekhalaHp = this.mekhalaMaxHp;
      this.sprite.setTint(0xfde047);

      this.eysoAura = scene.add
        .circle(spawnX, floorY - 70, 74, 0xfacc15, 0.24)
        .setStrokeStyle(3, 0xa855f7, 0.78)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(41);
      vfxManager.applyGlow(scene, this.eysoAura, 0xfacc15, 3.0, 0.4);

      this.mekhalaX = Phaser.Math.Clamp(spawnX - 240, arenaMinX + 180, arenaMaxX - 180);
      this.mekhalaY = floorY - 265;
      this.mekhalaContainer = scene.add.container(this.mekhalaX, this.mekhalaY).setDepth(44);
      const crystalHalo = scene.add
        .circle(0, 0, 56, 0x38bdf8, 0.28)
        .setStrokeStyle(3, 0xe0f2fe, 0.92)
        .setBlendMode(Phaser.BlendModes.ADD);
      const mekhalaSprite = scene.add
        .sprite(0, 2, 'boss_giant_spirit_idle', 0)
        .setScale(2.1)
        .setTint(0x67e8f9);
      if (scene.anims.exists('boss_spirit_idle')) mekhalaSprite.play('boss_spirit_idle');
      const crystalOrb = scene.add
        .circle(26, -18, 12, 0xe0f2fe, 0.95)
        .setStrokeStyle(3, 0x38bdf8, 1)
        .setBlendMode(Phaser.BlendModes.ADD);
      const mekLabel = scene.add
        .text(0, -68, '✨ មណីមេខលា · MONI MEKHALA', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#bae6fd',
          backgroundColor: 'rgba(12, 74, 110, 0.88)',
          padding: { x: 6, y: 2 },
        })
        .setOrigin(0.5, 1);
      this.mekhalaContainer.add([crystalHalo, mekhalaSprite, crystalOrb, mekLabel]);
      vfxManager.applyBloom(scene, crystalHalo, { color: 0x38bdf8, strength: 1.5 });
      this.mekhalaNextCastAt = scene.time.now + 2200;
    }

    // Update 1.8 — SovereignYakshaRig: Krong Reap (Ten-Headed Yaksha Sovereign, 3-Phase Crimson-Gold Aura)
    if (this.def.rig === 'SovereignYakshaRig') {
      this.sprite.setTint(0xfca5a5);
      this.sovereignAura = scene.add
        .circle(spawnX, floorY - 96, 118, 0xe11d48, 0.26)
        .setStrokeStyle(4, 0xfacc15, 0.88)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(41);
      vfxManager.applyBloom(scene, this.sovereignAura, { color: 0xe11d48, strength: 1.5 });

      this.sovereignCrownRing = scene.add
        .circle(spawnX, floorY - 196, 46, 0xfacc15, 0.16)
        .setStrokeStyle(3, 0xfef08a, 0.95)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(43);

      this.sovereignVignette = scene.add
        .rectangle(900, 360, 2200, 960, 0x450a0a, 0)
        .setDepth(32);

      // Orbiting Glowing Yaksha Masks visible right from encounter start!
      this.spawnYakshaOrbitMasks();
    }

    this.stageBadge = scene.add
      .text(spawnX, this.y - 110, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 8, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(48)
      .setVisible(false);

    // Brief 1.1s intro readiness before first telegraph
    this.nextStateAt = scene.time.now + 1100;
  }

  public getBounds(): Phaser.Geom.Rectangle {
    return this.sprite.getBounds();
  }

  /**
   * Checks collision against the Boss Head OR any trailing segment of MultiSegmentWormRig!
   */
  public intersectsHitbox(rect: Phaser.Geom.Rectangle): boolean {
    if (!this.alive) return false;
    if (this.def.rig === 'DuoStormCrystalRig') {
      if (this.eysoHp > 0 && Phaser.Geom.Intersects.RectangleToRectangle(rect, this.sprite.getBounds())) {
        return true;
      }
      if (this.mekhalaHp > 0 && this.mekhalaContainer) {
        const mekRect = new Phaser.Geom.Rectangle(this.mekhalaX - 54, this.mekhalaY - 54, 108, 108);
        if (Phaser.Geom.Intersects.RectangleToRectangle(rect, mekRect)) {
          return true;
        }
      }
      return false;
    }
    if (Phaser.Geom.Intersects.RectangleToRectangle(rect, this.sprite.getBounds())) {
      return true;
    }
    if (this.wormEntity?.intersectsRect(rect)) {
      return true;
    }
    return false;
  }

  public getDuoStatus():
    | {
        eysoHp: number;
        eysoMaxHp: number;
        mekhalaHp: number;
        mekhalaMaxHp: number;
        overdriveName: string | null;
      }
    | undefined {
    if (this.def.rig !== 'DuoStormCrystalRig') return undefined;
    return {
      eysoHp: this.eysoHp,
      eysoMaxHp: this.eysoMaxHp,
      mekhalaHp: this.mekhalaHp,
      mekhalaMaxHp: this.mekhalaMaxHp,
      overdriveName: this.duoOverdriveName,
    };
  }

  public getStageLabel(): string {
    if (!this.alive) return 'DEFEATED';
    if (this.stage === 'phase_roar') return this.phase === 3 ? 'PHASE 3 · SOVEREIGN WRATH!' : 'PHASE 2 ROAR!';
    if (this.duoOverdriveName) return `⚡ ${this.duoOverdriveName.toUpperCase()} OVERDRIVE`;
    if (this.stage === 'windup') return 'TELEGRAPH!';
    if (this.stage === 'active') return 'STRIKING';
    if (this.stage === 'recovery') return 'PUNISH WINDOW';
    return 'STALKING';
  }

  /**
   * Synchronizes shared Co-op DungeonRoom boss HP, party-scaled Max HP, and Phase.
   */
  public applyCoopBossSync(hp: number, maxHp: number, phase: 1 | 2 | 3): void {
    this.maxHp = Math.max(1, maxHp);
    this.hp = Math.max(0, Math.min(this.maxHp, hp));
    if (this.def.rig === 'DuoStormCrystalRig') {
      const ratio = this.hp / Math.max(1, this.maxHp);
      this.eysoMaxHp = Math.round(this.maxHp * 0.55);
      this.mekhalaMaxHp = Math.max(1, this.maxHp - this.eysoMaxHp);
      this.eysoHp = Math.round(this.eysoMaxHp * ratio);
      this.mekhalaHp = Math.round(this.mekhalaMaxHp * ratio);
    }
    if (phase === 2 && this.phase === 1 && this.alive && this.hp > 0) {
      this.triggerPhase2Roar();
    } else if (phase === 3 && this.phase < 3 && this.alive && this.hp > 0) {
      this.triggerPhase3SovereignWrath();
    }
    if (this.hp <= 0 && this.alive) {
      this.die();
    }
  }

  public takeDamage(amount: number, knockDir: number, heavy = false): boolean {
    if (!this.alive) return false;

    if (this.def.rig === 'DuoStormCrystalRig') {
      // Distribute damage across the two simultaneous bosses (focusing Ream Eyso first, splash to Moni Mekhala!)
      if (this.eysoHp > 0 && this.mekhalaHp > 0) {
        const eysoShare = Math.round(amount * 0.65);
        const mekShare = Math.max(1, amount - eysoShare);
        this.eysoHp = Math.max(0, this.eysoHp - eysoShare);
        this.mekhalaHp = Math.max(0, this.mekhalaHp - mekShare);
      } else if (this.eysoHp > 0) {
        this.eysoHp = Math.max(0, this.eysoHp - amount);
      } else {
        this.mekhalaHp = Math.max(0, this.mekhalaHp - amount);
      }
      this.hp = this.eysoHp + this.mekhalaHp;

      // Enrage Mechanic: When one drops to 0 HP, survivor enters Storm Overdrive!
      if (!this.duoOverdriveName && this.hp > 0 && (this.eysoHp <= 0 || this.mekhalaHp <= 0)) {
        this.triggerDuoStormOverdrive(this.eysoHp <= 0 ? 'Moni Mekhala' : 'Ream Eyso');
      }
    } else {
      this.hp = Math.max(0, this.hp - amount);
    }

    // Stage 3: White flash + knock shudder
    if (this.sprite.visible) this.sprite.setTintFill(0xffffff);
    this.wormEntity?.setTintFill(0xffffff);

    const baseX = this.x;
    this.scene.tweens.add({
      targets: this.sprite,
      x: baseX + knockDir * (heavy ? 12 : 6),
      duration: 55,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    this.scene.time.delayedCall(85, () => {
      if (this.alive) {
        if (this.def.rig === 'DuoStormCrystalRig') this.sprite.setTint(this.duoOverdriveName ? 0xfacc15 : 0xfde047);
        else if (this.def.rig === 'SovereignYakshaRig') this.sprite.setTint(this.phase === 3 ? 0xf43f5e : 0xfca5a5);
        else this.sprite.clearTint();
        this.wormEntity?.clearTint();
      }
    });

    // Check Phase Transitions
    if (this.def.rig === 'SovereignYakshaRig') {
      if (this.hp > 0 && this.phase === 1 && this.hp <= this.maxHp * 0.65) {
        this.triggerPhase2Roar();
      } else if (this.hp > 0 && this.phase < 3 && this.hp <= this.maxHp * 0.3) {
        this.triggerPhase3SovereignWrath();
      }
    } else if (this.def.rig !== 'DuoStormCrystalRig') {
      if (this.hp > 0 && this.phase === 1 && this.hp <= this.maxHp * 0.5) {
        this.triggerPhase2Roar();
      }
    }

    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private triggerDuoStormOverdrive(survivorName: 'Ream Eyso' | 'Moni Mekhala'): void {
    this.duoOverdriveName = survivorName;
    this.phase = 2;
    this.speedMult *= 1.38;
    if (this.eysoHp <= 0) {
      this.sprite.setVisible(false);
      this.eysoAura?.setVisible(false);
      this.shadow.setVisible(false);
    }
    if (this.mekhalaHp <= 0 && this.mekhalaContainer) {
      this.mekhalaContainer.setVisible(false);
    }
    const burstX = survivorName === 'Moni Mekhala' ? this.mekhalaX : this.x;
    const burstY = survivorName === 'Moni Mekhala' ? this.mekhalaY : this.y - 60;
    vfxManager.radialShockwave(this.scene, burstX, burstY, 0x38bdf8, 175, 420, 74);
    vfxManager.additiveSparkBurst(this.scene, burstX, burstY, 0xfacc15, 22, 110, 75);
    this.telegraphs.playImpactJuice(burstX, burstY, 'purple', true);
    this.callbacks.onFloatingText(
      burstX,
      burstY - 70,
      `⚡ STORM OVERDRIVE! ${survivorName.toUpperCase()} ENRAGES!`,
      '#38bdf8',
      '20px'
    );
    this.callbacks.onPhaseChange(2);
  }

  private triggerPhase3SovereignWrath(): void {
    this.phase = 3;
    this.stage = 'phase_roar';
    this.pendingAction = undefined;
    this.dashVelX = 0;
    this.dashVelY = 0;
    this.dashHitboxActive = false;
    this.speedMult *= 1.24;
    this.telegraphs.clearAll();

    if (this.sovereignVignette) {
      this.scene.tweens.add({ targets: this.sovereignVignette, alpha: 0.42, duration: 520 });
    }
    this.sprite.setTint(0xf43f5e);
    vfxManager.radialShockwave(this.scene, this.x, this.y - 90, 0xe11d48, 220, 480, 75);
    vfxManager.radialShockwave(this.scene, this.x, this.y - 90, 0xfacc15, 165, 380, 76);
    this.telegraphs.playImpactJuice(this.x, this.y - 60, 'red', true);
    this.callbacks.onFloatingText(
      this.x,
      this.y - 165,
      '👑 PHASE 3 · KRONG REAP SOVEREIGN WRATH!',
      '#fda4af',
      '22px'
    );
    this.callbacks.onPhaseChange(3);

    this.scene.time.delayedCall(900, () => {
      if (!this.alive) return;
      this.stage = 'idle';
      this.nextStateAt = this.scene.time.now + 320;
    });
  }

  private spawnYakshaOrbitMasks(): void {
    if (this.yakshaMasks.length > 0) return;
    for (let i = 0; i < 3; i++) {
      const m = this.scene.add.container(this.x, this.y - 110).setDepth(46);
      const glow = this.scene.add.circle(0, 0, 22, 0xe11d48, 0.35).setBlendMode(Phaser.BlendModes.ADD);
      const face = this.scene.add.rectangle(0, 0, 22, 24, 0x991b1b, 0.96).setStrokeStyle(2.5, 0xfacc15);
      const eyes = this.scene.add.rectangle(0, -2, 14, 4, 0xfef08a, 1);
      const crown = this.scene.add.triangle(0, -16, -9, 4, 0, -8, 9, 4, 0xfacc15, 1);
      m.add([glow, face, eyes, crown]);
      vfxManager.applyGlow(this.scene, m, 0xe11d48, 2.8, 0.4);
      this.yakshaMasks.push(m);
    }
    this.maskFireCooldownAt = this.scene.time.now + 1800;
  }

  private triggerPhase2Roar(): void {
    this.phase = 2;
    this.stage = 'phase_roar';
    this.pendingAction = undefined;
    this.dashVelX = 0;
    this.dashVelY = 0;
    this.dashHitboxActive = false;
    this.isLeaping = false;
    this.isFigure8Swooping = false;
    this.isSpinning = false;
    this.wormLunging = false;
    if (this.def.rig !== 'FloaterRig' && this.def.rig !== 'MultiSegmentWormRig') {
      this.y = this.floorY;
    }
    this.telegraphs.clearAll();

    const p2Tint =
      this.def.id === 'sdech_kongkaeb'
        ? 0xf87171
        : this.def.id === 'arp_prey_chrov'
        ? 0xf43f5e
        : this.def.id === 'neak_reach'
        ? 0xc084fc
        : 0xf59e0b;
    this.sprite.setTint(p2Tint);
    if (this.arpSpotlight) this.arpSpotlight.setFillStyle(0xf43f5e, 0.42);
    if (this.arpOuterGlow) this.arpOuterGlow.setFillStyle(0xe11d48, 0.28);

    const p2Banner =
      this.def.id === 'sdech_kongkaeb'
        ? 'PHASE 2 · KING FROG ENRAGES!'
        : this.def.id === 'arp_prey_chrov'
        ? 'PHASE 2 · ARP CRIMSON HAUNT!'
        : this.def.id === 'neak_reach'
        ? 'PHASE 2 · SHADOW NAGA COILS!'
        : this.def.id === 'krong_reap'
        ? 'PHASE 2 · 3 SPECTRAL YAKSHA MASKS & MAGMA VENTS!'
        : 'PHASE 2 · STONE YAKSHA ROARS!';

    if (this.def.rig === 'SovereignYakshaRig') {
      this.spawnYakshaOrbitMasks();
    }

    this.telegraphs.playImpactJuice(this.x, this.y - 40, 'red', true);
    this.callbacks.onFloatingText(this.x, this.y - 120, p2Banner, '#f87171', '20px');
    this.callbacks.onPhaseChange(2);

    this.scene.time.delayedCall(950, () => {
      if (!this.alive) return;
      this.sprite.clearTint();
      this.stage = 'idle';
      this.nextStateAt = this.scene.time.now + 350;
    });
  }

  private die(): void {
    this.alive = false;
    this.stage = 'defeated';
    this.pendingAction = undefined;
    this.dashVelX = 0;
    this.dashVelY = 0;
    this.dashHitboxActive = false;
    this.isLeaping = false;
    this.isFigure8Swooping = false;
    this.isSpinning = false;
    this.wormLunging = false;
    this.telegraphs.clearAll();
    this.clearHazards();
    this.stageBadge.setVisible(false);
    if (this.throatGlow) this.throatGlow.setAlpha(0);

    // Lift Arp's / Krong Reap's cavern darkness cleanly on victory!
    if (this.darkVeil) {
      this.scene.tweens.add({ targets: this.darkVeil, alpha: 0, duration: 500 });
    }
    if (this.sovereignVignette) {
      this.scene.tweens.add({ targets: this.sovereignVignette, alpha: 0, duration: 500 });
    }
    this.eysoAura?.setVisible(false);
    this.mekhalaContainer?.setVisible(false);
    this.sovereignAura?.setVisible(false);
    this.sovereignCrownRing?.setVisible(false);
    this.yakshaMasks.forEach((m) => m.setVisible(false));
    if (this.arpSpotlight) this.arpSpotlight.setVisible(false);
    if (this.arpOuterGlow) this.arpOuterGlow.setVisible(false);
    if (this.playerLanternGlow) this.playerLanternGlow.setVisible(false);

    this.telegraphs.playImpactJuice(this.x, this.y - 30, 'yellow', true);
    const fadeTargets: Phaser.GameObjects.GameObject[] = [
      this.sprite,
      this.shadow,
      ...(this.wormEntity?.segments ?? []),
    ];
    this.scene.tweens.add({
      targets: fadeTargets,
      alpha: 0,
      scaleX: this.baseScale * 1.25,
      scaleY: 0.2,
      duration: 420,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.sprite.setVisible(false);
        this.shadow.setVisible(false);
        this.wormEntity?.segments.forEach((s) => s.setVisible(false));
      },
    });
    this.callbacks.onDefeated();
  }

  public clearHazards(): void {
    for (const h of this.hazards) {
      if (h.sprite.active) h.sprite.destroy();
    }
    this.hazards = [];
  }

  private startWindup(
    color: TelegraphColor,
    windupMs: number,
    badgeText: string,
    onExecute: () => void
  ): void {
    const adjustedWindup = Math.max(460, Math.round(windupMs / this.speedMult));
    this.stage = 'windup';
    this.activeAttackHitApplied = false;
    this.pendingAction = onExecute;
    this.nextStateAt = this.scene.time.now + adjustedWindup;

    const tintHex =
      color === 'yellow'
        ? 0xfef08a
        : color === 'red'
        ? 0xfca5a5
        : color === 'green'
        ? 0x86efac
        : 0xe879f9;
    this.sprite.setTint(tintHex);
    this.stageBadge.setText(badgeText).setVisible(true);

    // Subtle telegraph squash
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: this.baseScale * 0.86,
      scaleX: this.baseScale * 1.12,
      duration: Math.min(260, adjustedWindup * 0.5),
      ease: 'Quad.easeOut',
    });
  }

  private enterRecovery(recoveryMs: number): void {
    const adjusted = Math.max(680, Math.round(recoveryMs / this.speedMult));
    this.stage = 'recovery';
    this.dashVelX = 0;
    this.dashVelY = 0;
    this.dashHitboxActive = false;
    this.isFigure8Swooping = false;
    this.isSpinning = false;
    this.wormLunging = false;
    this.sprite.setAngle(0);
    this.sprite.clearTint();
    if (this.throatGlow) this.throatGlow.setAlpha(0);
    this.sprite.setScale(this.baseScale);
    this.stageBadge.setText('OPENING!').setColor('#86efac').setVisible(true);
    this.nextStateAt = this.scene.time.now + adjusted;
  }

  private chooseNextAttack(playerX: number, playerY: number, now: number): void {
    this.attackCounter += 1;
    this.stageBadge.setColor('#fef08a');
    const dir = playerX < this.x ? -1 : 1;
    this.sprite.setFlipX(dir > 0);

    if (this.def.rig === 'QuadrupedHopperRig') {
      this.runKingFrogAttack(playerX, dir, now);
    } else if (this.def.rig === 'FloaterRig') {
      this.runArpFloaterAttack(playerX, playerY, dir, now);
    } else if (this.def.rig === 'MultiSegmentWormRig') {
      this.runNeakReachWormAttack(playerX, playerY, dir, now);
    } else if (this.def.rig === 'DuoStormCrystalRig') {
      this.runDuoStormCrystalAttack(playerX, playerY, dir, now);
    } else if (this.def.rig === 'SovereignYakshaRig') {
      this.runKrongReapSovereignAttack(playerX, playerY, dir, now);
    } else {
      this.runStoneYakshaAttack(playerX, dir, now);
    }
  }

  // ==================== BOSS #7: REAM EYSO & MONI MEKHALA (DuoStormCrystalRig) ====================
  private runDuoStormCrystalAttack(playerX: number, playerY: number, dir: number, _now: number): void {
    const overdrive = Boolean(this.duoOverdriveName);

    // If Ream Eyso has fallen, Moni Mekhala solo-leads Storm Overdrive crystal barrages!
    if (this.eysoHp <= 0) {
      const windup = 540;
      this.telegraphs.showLineTelegraph(this.mekhalaX, this.mekhalaY, playerX, 26, 'purple', windup);
      this.startWindup('purple', windup, '⚡ CRYSTAL OVERDRIVE!', () => {
        this.stage = 'active';
        this.fireMekhalaCrystalBeam(playerX, true);
        this.scene.time.delayedCall(280, () => {
          if (this.alive) this.fireMekhalaCrystalBeam(Phaser.Math.Clamp(playerX + 140, this.arenaMinX + 80, this.arenaMaxX - 80), true);
        });
        this.nextStateAt = this.scene.time.now + 520;
        this.pendingAction = () => this.enterRecovery(650);
      });
      return;
    }

    if (this.attackCounter % 2 === 1) {
      // Ream Eyso throws his blooming golden lightning axe (Phkak) that boomerangs back + thunder pillars!
      const windup = overdrive ? 520 : 660;
      const tipX = Phaser.Math.Clamp(this.x + dir * 560, this.arenaMinX + 60, this.arenaMaxX - 60);
      this.telegraphs.showLineTelegraph(this.x, this.floorY - 62, tipX, 28, 'yellow', windup);
      this.startWindup('yellow', windup, overdrive ? '⚡ STORM OVERDRIVE PHKAK!' : '⚡ LIGHTNING AXE THROW!', () => {
        this.stage = 'active';
        const axe = this.scene.add.container(this.x + dir * 24, this.floorY - 62).setDepth(64);
        const glow = this.scene.add.circle(0, 0, 28, 0xfacc15, 0.34).setBlendMode(Phaser.BlendModes.ADD);
        axe.add(glow);
        if (this.scene.textures.exists('vfx_lightning_burst') && this.scene.anims.exists('vfx_lightning_burst_anim')) {
          const spark = this.scene.add
            .sprite(0, 0, 'vfx_lightning_burst', 0)
            .setScale(1.4)
            .setBlendMode(Phaser.BlendModes.ADD)
            .play({ key: 'vfx_lightning_burst_anim', repeat: -1 });
          axe.add(spark);
        }
        if (this.scene.textures.exists('wp_axe')) {
          const axeSpr = this.scene.add.image(0, 0, 'wp_axe').setScale(2.7).setTint(0xfde047);
          axe.add(axeSpr);
        } else {
          const axeGfx = this.scene.add.graphics();
          axeGfx.fillStyle(0xfef08a, 1);
          axeGfx.fillRoundedRect(-18, -4, 34, 8, 3);
          axeGfx.fillStyle(0xfacc15, 1);
          axeGfx.fillCircle(14, 0, 12);
          axe.add(axeGfx);
        }
        vfxManager.applyGlow(this.scene, axe, 0xfacc15, 3.2, 0.45);

        const nowMs = this.scene.time.now;
        this.hazards.push({
          kind: 'boomerang_axe',
          sprite: axe,
          x: this.x + dir * 24,
          y: this.floorY - 62,
          vx: dir * (510 * this.speedMult),
          vy: 0,
          width: 44,
          height: 36,
          damage: Math.round(this.def.baseAttack * (overdrive ? 1.25 : 1.05)),
          expiresAt: nowMs + 2200,
          boomerangReturnAt: nowMs + 720,
          boomerangOriginX: this.x,
          alive: true,
          label: 'Lightning Axe Phkak',
        });

        // Trigger vertical crackling jagged thunderbolts!
        const strikeCount = overdrive ? 3 : 2;
        for (let i = 0; i < strikeCount; i++) {
          const sx = Phaser.Math.Clamp(playerX + (i - (strikeCount - 1) / 2) * 150, this.arenaMinX + 90, this.arenaMaxX - 90);
          this.telegraphs.showGroundZone(sx, this.floorY, 72, 24, 'yellow', 520 + i * 160);
          this.scene.time.delayedCall(520 + i * 160, () => {
            if (!this.alive) return;
            const pillar = this.scene.add
              .rectangle(sx, this.floorY - 220, 40, 440, 0xfef08a, 0.72)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setDepth(66);
            // Jagged crackling lightning bolt line down the pillar
            const bolt = this.scene.add.graphics().setDepth(67);
            bolt.lineStyle(4, 0xffffff, 1);
            bolt.beginPath();
            bolt.moveTo(sx, 60);
            for (let by = 110; by <= this.floorY; by += 45) {
              bolt.lineTo(sx + (Math.random() - 0.5) * 34, by);
            }
            bolt.strokePath();
            vfxManager.applyBloom(this.scene, pillar, { color: 0xfacc15, strength: 1.6 });
            vfxManager.radialShockwave(this.scene, sx, this.floorY - 12, 0xfacc15, 92, 260, 68);
            this.telegraphs.playImpactJuice(sx, this.floorY - 10, 'yellow', false);
            this.checkAreaHit(sx, 54, this.def.baseAttack * 0.95, 'Thunderbolt Strike', playerX);
            this.scene.tweens.add({
              targets: [pillar, bolt],
              alpha: 0,
              duration: 300,
              onComplete: () => {
                pillar.destroy();
                bolt.destroy();
              },
            });
          });
        }

        this.nextStateAt = this.scene.time.now + 780;
        this.pendingAction = () => this.enterRecovery(overdrive ? 660 : 880);
      });
    } else {
      // Ream Eyso storm dash charge across arena!
      const windup = overdrive ? 480 : 620;
      const targetX = Phaser.Math.Clamp(this.x + dir * 480, this.arenaMinX + 90, this.arenaMaxX - 90);
      this.telegraphs.showLineTelegraph(this.x, this.floorY - 64, targetX, 34, 'red', windup);
      this.startWindup('red', windup, '⚡ STORM CHARGE!', () => {
        this.stage = 'active';
        this.dashVelX = dir * (610 * this.speedMult);
        this.dashVelY = 0;
        this.dashHitboxActive = true;
        this.dashLabel = 'Ream Eyso Storm Charge';
        vfxManager.additiveSparkBurst(this.scene, this.x, this.floorY - 56, 0xfacc15, 14, 72, 68);
        this.nextStateAt = this.scene.time.now + Math.round(620 / this.speedMult);
        this.pendingAction = () => {
          this.dashVelX = 0;
          this.dashHitboxActive = false;
          this.telegraphs.playImpactJuice(this.x, this.floorY - 12, 'yellow', true);
          this.enterRecovery(overdrive ? 650 : 860);
        };
      });
    }
    void playerY;
  }

  private fireMekhalaCrystalBeam(targetX: number, overdrive: boolean): void {
    if (!this.alive || this.mekhalaHp <= 0) return;
    const beamX = Phaser.Math.Clamp(targetX, this.arenaMinX + 80, this.arenaMaxX - 80);
    this.telegraphs.showGroundZone(beamX, this.floorY, 76, 22, 'purple', 480);
    this.scene.time.delayedCall(480, () => {
      if (!this.alive || this.mekhalaHp <= 0) return;
      const beamH = Math.abs(this.floorY - this.mekhalaY) + 40;
      const beamY = (this.mekhalaY + this.floorY) / 2;
      const beam = this.scene.add.container(beamX, beamY).setDepth(65);
      const outer = this.scene.add
        .rectangle(0, 0, overdrive ? 46 : 34, beamH, 0x38bdf8, 0.72)
        .setBlendMode(Phaser.BlendModes.ADD);
      const prism = this.scene.add
        .rectangle(0, 0, overdrive ? 22 : 16, beamH, 0xe879f9, 0.85)
        .setBlendMode(Phaser.BlendModes.ADD);
      const core = this.scene.add
        .rectangle(0, 0, 8, beamH, 0xffffff, 0.98)
        .setBlendMode(Phaser.BlendModes.ADD);
      beam.add([outer, prism, core]);
      vfxManager.applyBloom(this.scene, outer, { color: 0x38bdf8, strength: 1.6 });
      this.hazards.push({
        kind: 'crystal_beam',
        sprite: beam,
        x: beamX,
        y: this.floorY - 40,
        vx: 0,
        vy: 0,
        width: overdrive ? 44 : 34,
        height: 110,
        damage: Math.round(this.def.baseAttack * (overdrive ? 1.15 : 0.88)),
        expiresAt: this.scene.time.now + 280,
        alive: true,
        label: 'Prismatic Crystal Laser',
      });
      vfxManager.radialShockwave(this.scene, beamX, this.floorY - 10, 0x38bdf8, 88, 260, 67);
      vfxManager.additiveSparkBurst(this.scene, beamX, this.floorY - 14, 0xfef08a, 12, 68, 68);
    });
  }

  // ==================== BOSS #8: KRONG REAP (SovereignYakshaRig — 3-Phase Final Sovereign) ====================
  private runKrongReapSovereignAttack(playerX: number, playerY: number, dir: number, _now: number): void {
    // PHASE 3 (<30%): Sovereign Wrath — Rhythmic Bullet-Hell Lotus Rings + Sword Slams!
    if (this.phase === 3 && this.attackCounter % 2 === 1) {
      const windup = 600;
      this.startWindup('red', windup, '🪷 SOVEREIGN LOTUS WRATH!', () => {
        this.stage = 'active';
        const fireRing = (ringIdx: number) => {
          if (!this.alive) return;
          const petals = 10;
          const baseOffset = ringIdx * 0.28;
          const cx = this.x;
          const cy = this.floorY - 115;
          vfxManager.radialShockwave(this.scene, cx, cy, 0xe11d48, 120, 260, 66);
          for (let i = 0; i < petals; i++) {
            const ang = baseOffset + (i / petals) * Math.PI * 2;
            const spd = (240 + ringIdx * 35) * this.speedMult;
            const orb = this.scene.add
              .circle(cx, cy, 10, i % 2 === 0 ? 0xf43f5e : 0xfacc15, 0.96)
              .setStrokeStyle(2, 0xfef08a)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setDepth(65);
            this.hazards.push({
              kind: 'chakram',
              sprite: orb,
              x: cx,
              y: cy,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              width: 18,
              height: 18,
              damage: Math.round(this.def.baseAttack * 0.85),
              expiresAt: this.scene.time.now + 3200,
              alive: true,
              label: 'Sovereign Lotus Ring',
            });
          }
        };
        fireRing(0);
        this.scene.time.delayedCall(460, () => fireRing(1));
        this.nextStateAt = this.scene.time.now + 900;
        this.pendingAction = () => this.enterRecovery(740);
      });
      return;
    }

    // PHASE 2 (65%–30%): Arena Floor Magma Vents + Synchronized Yaksha Mask Cross-Beams!
    if (this.phase >= 2 && this.attackCounter % 3 === 0) {
      const windup = 660;
      const ventXs = [
        Phaser.Math.Clamp(playerX - 180, this.arenaMinX + 90, this.arenaMaxX - 90),
        Phaser.Math.Clamp(playerX, this.arenaMinX + 90, this.arenaMaxX - 90),
        Phaser.Math.Clamp(playerX + 180, this.arenaMinX + 90, this.arenaMaxX - 90),
      ];
      ventXs.forEach((vx) => this.telegraphs.showGroundZone(vx, this.floorY, 82, 24, 'red', windup));
      this.startWindup('red', windup, '🌋 MAGMA VENTS & MASK BEAMS!', () => {
        this.stage = 'active';
        ventXs.forEach((vx) => {
          const vent = this.scene.add
            .rectangle(vx, this.floorY - 90, 48, 180, 0xf97316, 0.88)
            .setStrokeStyle(3, 0xfef08a)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(64);
          vfxManager.applyBloom(this.scene, vent, { color: 0xe11d48, strength: 1.5 });
          this.telegraphs.playImpactJuice(vx, this.floorY - 12, 'red', false);
          this.hazards.push({
            kind: 'magma_vent',
            sprite: vent,
            x: vx,
            y: this.floorY - 80,
            vx: 0,
            vy: 0,
            width: 48,
            height: 170,
            damage: Math.round(this.def.baseAttack * 1.05),
            expiresAt: this.scene.time.now + 440,
            alive: true,
            label: 'Sovereign Magma Vent',
          });
        });
        this.nextStateAt = this.scene.time.now + 560;
        this.pendingAction = () => this.enterRecovery(780);
      });
      return;
    }

    // PHASE 1 & ALL PHASES: Multi-Directional Golden Chakram Volley OR Giant Sovereign Sword Slam!
    if (this.attackCounter % 2 === 1) {
      const windup = 620;
      this.startWindup('yellow', windup, '✦ GOLDEN CHAKRAM VOLLEY!', () => {
        this.stage = 'active';
        const baseAng = Phaser.Math.Angle.Between(this.x, this.floorY - 110, playerX, playerY - 16);
        const spreads = [-0.46, -0.23, 0, 0.23, 0.46];
        for (const offset of spreads) {
          const ang = baseAng + offset;
          const spd = 340 * this.speedMult;
          const ring = this.scene.add
            .circle(this.x, this.floorY - 110, 14, 0xfacc15, 0.25)
            .setStrokeStyle(4, 0xfef08a, 1)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(64);
          vfxManager.applyGlow(this.scene, ring, 0xfacc15, 2.6, 0.4);
          this.hazards.push({
            kind: 'chakram',
            sprite: ring,
            x: this.x,
            y: this.floorY - 110,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            width: 24,
            height: 24,
            damage: Math.round(this.def.baseAttack * 0.92),
            expiresAt: this.scene.time.now + 2800,
            alive: true,
            label: 'Golden Sovereign Chakram',
          });
        }
        this.nextStateAt = this.scene.time.now + 480;
        this.pendingAction = () => this.enterRecovery(820);
      });
    } else {
      const windup = 680;
      const slamX = Phaser.Math.Clamp(this.x + dir * 130, this.arenaMinX + 90, this.arenaMaxX - 90);
      this.telegraphs.showGroundZone(slamX, this.floorY, 240, 30, 'red', windup);
      this.startWindup('red', windup, '⚔️ GIANT SOVEREIGN SWORD SLAM!', () => {
        this.stage = 'active';
        this.telegraphs.playImpactJuice(slamX, this.floorY - 14, 'red', true);
        vfxManager.radialShockwave(this.scene, slamX, this.floorY - 14, 0xe11d48, 160, 340, 68);
        this.checkAreaHit(slamX, 130, this.def.baseAttack * 1.25, 'Giant Sovereign Sword Slam', playerX);
        const waveSpd = 350 * this.speedMult;
        this.hazards.push(
          this.telegraphs.createGroundShockwave(slamX - 30, this.floorY, -1, waveSpd, Math.round(this.def.baseAttack * 0.85), 'red', this.scene.time.now, 'Sovereign Shockwave'),
          this.telegraphs.createGroundShockwave(slamX + 30, this.floorY, 1, waveSpd, Math.round(this.def.baseAttack * 0.85), 'red', this.scene.time.now, 'Sovereign Shockwave')
        );
        this.nextStateAt = this.scene.time.now + 380;
        this.pendingAction = () => this.enterRecovery(840);
      });
    }
  }

  // ==================== BOSS #1: SDECH KONGKAEB (QuadrupedHopperRig) ====================
  private runKingFrogAttack(playerX: number, dir: number, now: number): void {
    if (this.phase === 1) {
      if (this.attackCounter % 2 === 1) {
        const targetX = Phaser.Math.Clamp(playerX, this.arenaMinX + 120, this.arenaMaxX - 120);
        const windup = 640;
        this.telegraphs.showGroundZone(targetX, this.floorY, 170, 26, 'red', windup + 420);
        this.startWindup('yellow', windup, 'LEAP SLAM!', () => {
          this.stage = 'active';
          this.sprite.clearTint();
          this.sprite.setScale(this.baseScale);
          this.isLeaping = true;
          this.leapStartX = this.x;
          this.leapTargetX = targetX;
          this.leapStartAt = this.scene.time.now;
          this.leapDurationMs = Math.round(520 / this.speedMult);
          this.nextStateAt = this.leapStartAt + this.leapDurationMs;
          this.pendingAction = () => {
            this.isLeaping = false;
            this.x = targetX;
            this.y = this.floorY;
            // Elastic squash-and-stretch landing + toxic green acid-bubble splashes!
            this.sprite.setScale(this.baseScale * 1.38, this.baseScale * 0.64);
            this.scene.tweens.add({
              targets: this.sprite,
              scaleX: this.baseScale,
              scaleY: this.baseScale,
              duration: 280,
              ease: 'Elastic.easeOut',
            });
            for (let b = 0; b < 9; b++) {
              const bx = this.x + (Math.random() - 0.5) * 150;
              const bub = this.scene.add
                .circle(bx, this.floorY - 8, Phaser.Math.Between(6, 12), 0x4ade80, 0.88)
                .setStrokeStyle(2, 0xbef264)
                .setDepth(62);
              this.scene.tweens.add({
                targets: bub,
                y: this.floorY - Phaser.Math.Between(55, 125),
                x: bx + (Math.random() - 0.5) * 70,
                scale: 0.2,
                alpha: 0,
                duration: 460 + b * 35,
                ease: 'Quad.easeOut',
                onComplete: () => bub.destroy(),
              });
            }
            this.telegraphs.playImpactJuice(this.x, this.floorY - 12, 'green', true);
            this.checkAreaHit(this.x, 105, this.def.baseAttack * 1.15, 'Frog Acid Leap Slam', playerX);
            this.enterRecovery(900);
          };
        });
      } else {
        const reach = 320;
        const tipX = Phaser.Math.Clamp(this.x + dir * reach, this.arenaMinX, this.arenaMaxX);
        const windup = 620;
        this.telegraphs.showLineTelegraph(this.x, this.floorY - 56, tipX, 24, 'yellow', windup);
        this.startWindup('yellow', windup, 'TONGUE LASH!', () => {
          this.stage = 'active';
          this.sprite.clearTint();
          const len = Math.abs(tipX - this.x);
          const midX = (this.x + tipX) / 2;
          const tongueRect = this.scene.add
            .rectangle(midX, this.floorY - 56, len, 18, 0xf472b6, 0.95)
            .setStrokeStyle(2, 0xbe185d)
            .setDepth(60);

          this.hazards.push({
            kind: 'tongue',
            sprite: tongueRect,
            x: midX,
            y: this.floorY - 56,
            vx: 0,
            vy: 0,
            width: len,
            height: 24,
            damage: Math.round(this.def.baseAttack * 0.9),
            expiresAt: this.scene.time.now + 240,
            alive: true,
            label: 'Sticky Tongue Lash',
          });

          this.nextStateAt = this.scene.time.now + 280;
          this.pendingAction = () => this.enterRecovery(820);
        });
      }
      return;
    }

    if (this.attackCounter % 2 === 1) {
      const windup = 760;
      if (this.throatGlow) {
        this.throatGlow.setPosition(this.x, this.floorY - 40).setAlpha(0.75);
        this.scene.tweens.add({
          targets: this.throatGlow,
          scale: 1.75,
          duration: Math.round(windup / this.speedMult),
          ease: 'Sine.easeInOut',
        });
      }
      this.telegraphs.showGroundZone(this.x, this.floorY, 260, 28, 'red', windup);
      this.startWindup('red', windup, 'DOUBLE BELLY-FLOP!', () => {
        this.stage = 'active';
        this.sprite.clearTint();
        if (this.throatGlow) this.throatGlow.setAlpha(0).setScale(1);

        const doFlop = (waveIdx: number) => {
          if (!this.alive) return;
          this.telegraphs.playImpactJuice(this.x, this.floorY - 10, 'red', true);
          const waveSpeed = (320 + waveIdx * 60) * this.speedMult;
          this.hazards.push(
            this.telegraphs.createGroundShockwave(
              this.x - 36,
              this.floorY,
              -1,
              waveSpeed,
              this.def.baseAttack,
              'red',
              this.scene.time.now,
              'Belly-Flop Shockwave'
            ),
            this.telegraphs.createGroundShockwave(
              this.x + 36,
              this.floorY,
              1,
              waveSpeed,
              this.def.baseAttack,
              'red',
              this.scene.time.now,
              'Belly-Flop Shockwave'
            )
          );
        };

        doFlop(0);
        this.scene.time.delayedCall(Math.round(420 / this.speedMult), () => doFlop(1));
        this.nextStateAt = this.scene.time.now + Math.round(700 / this.speedMult);
        this.pendingAction = () => this.enterRecovery(950);
      });
    } else {
      const windup = 580;
      this.startWindup('green', windup, 'TADPOLE SWARM!', () => {
        this.stage = 'active';
        this.sprite.clearTint();
        const activeTads = this.hazards.filter((h) => h.kind === 'tadpole' && h.alive).length;
        const toSpawn = Math.max(0, 2 - activeTads);
        for (let i = 0; i < toSpawn; i++) {
          const spawnDir = i === 0 ? dir : -dir;
          const tad = this.scene.add.container(this.x + spawnDir * 44, this.floorY - 38).setDepth(56);
          if (this.scene.textures.exists('vfx_poison_orb') && this.scene.anims.exists('vfx_poison_orb_anim')) {
            const aura = this.scene.add
              .sprite(0, 0, 'vfx_poison_orb', 0)
              .setScale(1.15)
              .setAlpha(0.75)
              .setBlendMode(Phaser.BlendModes.ADD)
              .play('vfx_poison_orb_anim');
            tad.add(aura);
          }
          // Detailed pixel-art swamp froglet minion with crouched legs, spotted back & glowing golden eyes
          const frogGfx = this.scene.add.graphics();
          frogGfx.fillStyle(0x14532d, 1);
          frogGfx.fillRoundedRect(-14, 2, 10, 8, 3);
          frogGfx.fillRoundedRect(4, 2, 10, 8, 3);
          frogGfx.fillStyle(0x16a34a, 1);
          frogGfx.fillEllipse(0, 0, 26, 20);
          frogGfx.lineStyle(2, 0x052e16, 1);
          frogGfx.strokeEllipse(0, 0, 26, 20);
          frogGfx.fillStyle(0x86efac, 0.9);
          frogGfx.fillEllipse(0, 4, 15, 7);
          frogGfx.fillStyle(0x15803d, 1);
          frogGfx.fillCircle(-6, -5, 3);
          frogGfx.fillCircle(4, -6, 2.5);
          // Raised amphibian eyes + tiny brass crown glint
          frogGfx.fillStyle(0x22c55e, 1);
          frogGfx.fillCircle(spawnDir * 6 - 3, -9, 4.5);
          frogGfx.fillCircle(spawnDir * 6 + 3, -9, 4.5);
          frogGfx.fillStyle(0xfef08a, 1);
          frogGfx.fillCircle(spawnDir * 6 - 3, -9, 2.6);
          frogGfx.fillCircle(spawnDir * 6 + 3, -9, 2.6);
          frogGfx.fillStyle(0x09090b, 1);
          frogGfx.fillCircle(spawnDir * 7 - 3, -9, 1.2);
          frogGfx.fillCircle(spawnDir * 7 + 3, -9, 1.2);
          tad.add(frogGfx);
          vfxManager.applyGlow(this.scene, tad, 0x22c55e, 1.6, 0.25);

          this.hazards.push({
            kind: 'tadpole',
            sprite: tad,
            x: this.x + spawnDir * 44,
            y: this.floorY - 38,
            vx: spawnDir * (145 + i * 35) * this.speedMult,
            vy: -280,
            width: 30,
            height: 28,
            damage: Math.round(this.def.baseAttack * 0.7),
            expiresAt: now + 9500,
            hp: 120,
            alive: true,
            label: 'Swamp Froglet',
          });
        }
        vfxManager.playSpriteVfx(this.scene, 'vfx_poison_orb', this.x, this.floorY - 52, { scale: 1.5, additive: true, depth: 62 });
        this.callbacks.onFloatingText(this.x, this.floorY - 130, 'Swamp Froglets Spawned!', '#4ade80', '14px');
        this.nextStateAt = this.scene.time.now + 300;
        this.pendingAction = () => this.enterRecovery(880);
      });
    }
  }

  // ==================== BOSS #2: ARP PREY CHROV (FloaterRig) ====================
  private runArpFloaterAttack(playerX: number, playerY: number, dir: number, _now: number): void {
    if (this.attackCounter % 2 === 1) {
      // Attack A: Bioluminescent Figure-8 Swoop dropping glowing spirit embers!
      const windup = this.phase === 2 ? 520 : 620;
      this.swoopCenterX = Phaser.Math.Clamp((this.x + playerX) / 2, this.arenaMinX + 260, this.arenaMaxX - 260);
      this.swoopCenterY = Phaser.Math.Clamp(playerY - 110, 260, 440);
      this.telegraphs.showLineTelegraph(
        this.swoopCenterX - 280,
        this.swoopCenterY,
        this.swoopCenterX + 280,
        36,
        this.phase === 2 ? 'red' : 'green',
        windup
      );
      this.startWindup(this.phase === 2 ? 'red' : 'green', windup, 'FIGURE-8 SWOOP!', () => {
        this.stage = 'active';
        this.sprite.clearTint();
        this.sprite.setScale(this.baseScale);
        this.isFigure8Swooping = true;
        this.swoopStartAt = this.scene.time.now;
        this.swoopDurationMs = Math.round((this.phase === 2 ? 1550 : 1950) / this.speedMult);
        this.dashHitboxActive = true;
        this.dashLabel = 'Arp Figure-8 Swoop';
        this.lastOrbDropAt = 0;
        this.nextStateAt = this.swoopStartAt + this.swoopDurationMs;
        this.pendingAction = () => {
          this.isFigure8Swooping = false;
          if (this.phase === 2) {
            this.spawnArpOrbRing(6);
          }
          this.enterRecovery(this.phase === 2 ? 780 : 900);
        };
      });
    } else {
      // Attack B: Laughing Spinning Dash across the darkened cavern!
      const targetY = Phaser.Math.Clamp(playerY - 14, 240, this.floorY - 64);
      const dashEndX = Phaser.Math.Clamp(this.x + dir * 560, this.arenaMinX + 100, this.arenaMaxX - 100);
      const windup = this.phase === 2 ? 500 : 620;
      this.y = Phaser.Math.Linear(this.y, targetY, 0.45);
      this.telegraphs.showLineTelegraph(this.x, this.y, dashEndX, 46, 'yellow', windup);
      this.isSpinning = true;
      this.startWindup('yellow', windup, 'SONIC SCREAM DASH!', () => {
        this.stage = 'active';
        this.sprite.clearTint();
        // Expanding screaming cyan-emerald sonic-ring waves!
        for (let r = 0; r < 3; r++) {
          this.scene.time.delayedCall(r * 130, () => {
            if (!this.alive) return;
            vfxManager.radialShockwave(
              this.scene,
              this.x,
              this.y,
              this.phase === 2 ? 0xf43f5e : 0x22d3ee,
              155 + r * 35,
              360,
              64
            );
          });
        }
        const speed = (this.phase === 2 ? 760 : 620) * this.speedMult;
        const dx = dashEndX - this.x;
        const dy = targetY - this.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        this.dashVelX = (dx / dist) * speed;
        this.dashVelY = (dy / dist) * speed * 0.55;
        this.dashHitboxActive = true;
        this.dashLabel = 'Arp Spinning Dash';
        this.nextStateAt = this.scene.time.now + Math.round(620 / this.speedMult);
        this.pendingAction = () => {
          this.isSpinning = false;
          this.spawnArpOrbRing(this.phase === 2 ? 6 : 4);
          this.enterRecovery(860);
        };
      });
    }
  }

  private spawnArpOrbRing(count: number): void {
    const color = this.phase === 2 ? 0xf43f5e : 0x34d399;
    const stroke = this.phase === 2 ? 0xfecdd3 : 0xa7f3d0;
    const speed = (this.phase === 2 ? 255 : 205) * this.speedMult;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + 0.25;
      const orb = this.scene.add
        .circle(this.x, this.y, 11, color, 0.92)
        .setStrokeStyle(2.5, stroke)
        .setDepth(60);
      this.hazards.push({
        kind: 'orb',
        sprite: orb,
        x: this.x,
        y: this.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        width: 20,
        height: 20,
        damage: Math.round(this.def.baseAttack * 0.8),
        expiresAt: this.scene.time.now + 2600,
        alive: true,
        label: 'Arp Spirit Ember',
      });
    }
  }

  // ==================== BOSS #5: YEAK THMOR (HumanoidRig) ====================
  private runStoneYakshaAttack(playerX: number, dir: number, _now: number): void {
    if (this.phase === 1) {
      if (this.attackCounter % 2 === 1) {
        const slamX = Phaser.Math.Clamp(this.x + dir * 92, this.arenaMinX + 80, this.arenaMaxX - 80);
        const windup = 720;
        this.telegraphs.showGroundZone(slamX, this.floorY, 190, 32, 'red', windup);
        this.startWindup('red', windup, 'SEISMIC LATERITE SLAM!', () => {
          this.stage = 'active';
          this.sprite.clearTint();
          this.sprite.setScale(this.baseScale);
          // Heavy camera shake + glowing magma floor fissure + flying laterite boulders!
          this.scene.cameras.main.shake(240, 0.011);
          const fissure = this.scene.add.graphics().setDepth(55);
          fissure.lineStyle(5, 0xf97316, 0.95);
          fissure.lineBetween(slamX - 110, this.floorY - 2, slamX + 110, this.floorY - 2);
          fissure.lineStyle(2, 0xfef08a, 1);
          fissure.lineBetween(slamX - 85, this.floorY - 4, slamX + 85, this.floorY - 4);
          this.scene.tweens.add({ targets: fissure, alpha: 0, duration: 900, onComplete: () => fissure.destroy() });
          for (let shard = 0; shard < 6; shard++) {
            const rockShard = this.scene.add
              .rectangle(slamX + (shard - 2.5) * 24, this.floorY - 10, 14, 12, 0x9a3412, 1)
              .setStrokeStyle(2, 0xf59e0b)
              .setDepth(63);
            this.scene.tweens.add({
              targets: rockShard,
              x: rockShard.x + (shard - 2.5) * 55,
              y: this.floorY - Phaser.Math.Between(90, 165),
              angle: 360,
              alpha: 0,
              duration: 540,
              ease: 'Quad.easeOut',
              onComplete: () => rockShard.destroy(),
            });
          }
          this.telegraphs.playImpactJuice(slamX, this.floorY - 12, 'red', true);
          this.checkAreaHit(slamX, 115, this.def.baseAttack * 1.1, 'Yaksha Seismic Slam', playerX);
          this.hazards.push(
            this.telegraphs.createGroundShockwave(
              slamX,
              this.floorY,
              dir,
              340 * this.speedMult,
              Math.round(this.def.baseAttack * 0.85),
              'red',
              this.scene.time.now,
              'Rolling Stone Shockwave'
            )
          );
          this.nextStateAt = this.scene.time.now + 320;
          this.pendingAction = () => this.enterRecovery(960);
        });
      } else {
        const chargeEnd = Phaser.Math.Clamp(this.x + dir * 340, this.arenaMinX + 120, this.arenaMaxX - 120);
        const windup = 640;
        this.telegraphs.showLineTelegraph(this.x, this.floorY - 56, chargeEnd, 54, 'yellow', windup);
        this.startWindup('yellow', windup, 'STONE CHARGE!', () => {
          this.stage = 'active';
          this.sprite.clearTint();
          this.dashVelX = dir * 470 * this.speedMult;
          this.dashHitboxActive = true;
          this.dashLabel = 'Stone Yaksha Charge';
          this.nextStateAt = this.scene.time.now + Math.round(620 / this.speedMult);
          this.pendingAction = () => this.enterRecovery(920);
        });
      }
      return;
    }

    if (this.attackCounter % 2 === 1) {
      const windup = 750;
      const count = this.difficulty === 'mythic' ? 4 : 3;
      const dropXs: number[] = [];
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * 165 + (Math.random() - 0.5) * 45;
        const bx = Phaser.Math.Clamp(playerX + offset, this.arenaMinX + 90, this.arenaMaxX - 90);
        dropXs.push(bx);
        this.telegraphs.showFallingShadow(bx, this.floorY, 34, windup + 320);
      }

      this.startWindup('red', windup, 'CEILING BOULDERS!', () => {
        this.stage = 'active';
        this.sprite.clearTint();
        this.scene.cameras.main.shake(150, 0.007);
        for (const bx of dropXs) {
          const rock = this.scene.add.container(bx, 110).setDepth(60);
          if (this.scene.textures.exists('vfx_fire_trail') && this.scene.anims.exists('vfx_fire_trail_anim')) {
            const trail = this.scene.add
              .sprite(0, -18, 'vfx_fire_trail', 0)
              .setScale(1.1)
              .setAngle(-90)
              .setBlendMode(Phaser.BlendModes.ADD)
              .play({ key: 'vfx_fire_trail_anim', repeat: -1 });
            rock.add(trail);
          }
          const rg = this.scene.add.graphics();
          rg.fillStyle(0x44403c, 1);
          rg.fillPoints(
            [
              new Phaser.Geom.Point(-18, -10),
              new Phaser.Geom.Point(-6, -22),
              new Phaser.Geom.Point(14, -16),
              new Phaser.Geom.Point(22, 2),
              new Phaser.Geom.Point(12, 20),
              new Phaser.Geom.Point(-12, 18),
              new Phaser.Geom.Point(-22, 4),
            ],
            true
          );
          rg.lineStyle(2.5, 0xf59e0b, 0.95);
          rg.strokePoints(
            [
              new Phaser.Geom.Point(-18, -10),
              new Phaser.Geom.Point(-6, -22),
              new Phaser.Geom.Point(14, -16),
              new Phaser.Geom.Point(22, 2),
              new Phaser.Geom.Point(12, 20),
              new Phaser.Geom.Point(-12, 18),
              new Phaser.Geom.Point(-22, 4),
            ],
            true
          );
          rg.lineStyle(2, 0xfef08a, 0.85);
          rg.lineBetween(-8, -8, 4, 2);
          rg.lineBetween(4, 2, -2, 12);
          rock.add(rg);
          this.hazards.push({
            kind: 'boulder',
            sprite: rock,
            x: bx,
            y: 110,
            vx: 0,
            vy: 640 * this.speedMult,
            width: 44,
            height: 44,
            damage: Math.round(this.def.baseAttack * 0.95),
            expiresAt: this.scene.time.now + 2400,
            alive: true,
            label: 'Falling Laterite Boulder',
          });
        }
        this.nextStateAt = this.scene.time.now + 450;
        this.pendingAction = () => this.enterRecovery(950);
      });
    } else {
      const chargeEnd = Phaser.Math.Clamp(this.x + dir * 440, this.arenaMinX + 110, this.arenaMaxX - 110);
      const windup = 540;
      this.telegraphs.showLineTelegraph(this.x, this.floorY - 60, chargeEnd, 62, 'yellow', windup);
      this.startWindup('yellow', windup, 'ARMORED DASH!', () => {
        this.stage = 'active';
        this.sprite.clearTint();
        this.dashVelX = dir * 610 * this.speedMult;
        this.dashHitboxActive = true;
        this.dashLabel = 'Armored Yaksha Rush';
        this.nextStateAt = this.scene.time.now + Math.round(620 / this.speedMult);
        this.pendingAction = () => {
          this.telegraphs.playImpactJuice(this.x, this.floorY - 12, 'red', true);
          this.hazards.push(
            this.telegraphs.createGroundShockwave(
              this.x,
              this.floorY,
              dir,
              380 * this.speedMult,
              Math.round(this.def.baseAttack * 0.85),
              'red',
              this.scene.time.now,
              'Armored Dash Shockwave'
            )
          );
          this.enterRecovery(980);
        };
      });
    }
  }

  // ==================== BOSS #6: NEAK REACH (MultiSegmentWormRig) ====================
  private runNeakReachWormAttack(playerX: number, playerY: number, dir: number, _now: number): void {
    if (this.attackCounter % 2 === 1) {
      // Attack A: Venom Spit Volley -> splashes into Green Poison Pools (Countered by Coconut Anti-Venom!)
      const windup = this.phase === 2 ? 560 : 680;
      const spitCount = this.phase === 2 ? 3 : 2;
      for (let i = 0; i < spitCount; i++) {
        const tx = Phaser.Math.Clamp(
          playerX + (i - (spitCount - 1) / 2) * 145,
          this.arenaMinX + 100,
          this.arenaMaxX - 100
        );
        this.telegraphs.showGroundZone(tx, this.floorY, 118, 22, 'green', windup + 360);
      }
      this.startWindup('green', windup, 'NAGA VENOM SPIT!', () => {
        this.stage = 'active';
        this.sprite.clearTint();
        this.sprite.setScale(this.baseScale);
        for (let i = 0; i < spitCount; i++) {
          const tx = Phaser.Math.Clamp(
            playerX + (i - (spitCount - 1) / 2) * 145,
            this.arenaMinX + 100,
            this.arenaMaxX - 100
          );
          const flightSec = 0.62;
          const vx = (tx - this.x) / flightSec;
          const vy = (this.floorY - 16 - this.y - 0.5 * 740 * flightSec * flightSec) / flightSec;
          const glob = this.scene.add
            .circle(this.x, this.y, 13, 0x22c55e, 0.95)
            .setStrokeStyle(2.5, 0xbef264)
            .setDepth(60);
          this.hazards.push({
            kind: 'venom_glob',
            sprite: glob,
            x: this.x,
            y: this.y,
            vx,
            vy,
            width: 24,
            height: 24,
            damage: Math.round(this.def.baseAttack * 0.78),
            expiresAt: this.scene.time.now + 2400,
            isPoison: true,
            alive: true,
            label: 'Naga Venom Spit',
          });
        }
        this.nextStateAt = this.scene.time.now + 440;
        this.pendingAction = () => this.enterRecovery(880);
      });
    } else {
      // Attack B: Serpentine Platform Lunge weaving smoothly across the arena!
      const windup = this.phase === 2 ? 520 : 620;
      const destX = Phaser.Math.Clamp(playerX + dir * 220, this.arenaMinX + 140, this.arenaMaxX - 140);
      const destY = Phaser.Math.Clamp(playerY - 24, 240, this.floorY - 70);
      this.telegraphs.showLineTelegraph(this.x, destY, destX, 48, 'purple', windup);
      this.startWindup('purple', windup, 'NAGA GEYSER & WHIRLPOOL!', () => {
        this.stage = 'active';
        this.sprite.clearTint();
        // Rising Water-Geyser Columns + Swirling Whirlpool Projectile!
        const geyserXs = [
          Phaser.Math.Clamp(playerX - 110, this.arenaMinX + 80, this.arenaMaxX - 80),
          Phaser.Math.Clamp(playerX + 110, this.arenaMinX + 80, this.arenaMaxX - 80),
        ];
        geyserXs.forEach((gx) => {
          const geyser = this.scene.add
            .rectangle(gx, this.floorY - 125, 42, 250, 0x0ea5e9, 0.78)
            .setStrokeStyle(3, 0xbae6fd)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(62);
          vfxManager.radialShockwave(this.scene, gx, this.floorY - 8, 0x38bdf8, 76, 280, 63);
          this.hazards.push({
            kind: 'crystal_beam',
            sprite: geyser,
            x: gx,
            y: this.floorY - 110,
            vx: 0,
            vy: 0,
            width: 40,
            height: 220,
            damage: Math.round(this.def.baseAttack * 0.85),
            expiresAt: this.scene.time.now + 380,
            alive: true,
            label: 'Naga Water Geyser',
          });
        });
        // Swirling Whirlpool Vortex Projectile
        const vortex = this.scene.add
          .circle(this.x, this.y, 18, 0x0284c7, 0.55)
          .setStrokeStyle(4, 0x7dd3fc, 0.95)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(64);
        const vang = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY - 16);
        this.hazards.push({
          kind: 'chakram',
          sprite: vortex,
          x: this.x,
          y: this.y,
          vx: Math.cos(vang) * 320 * this.speedMult,
          vy: Math.sin(vang) * 320 * this.speedMult,
          width: 30,
          height: 30,
          damage: Math.round(this.def.baseAttack * 0.8),
          expiresAt: this.scene.time.now + 2400,
          alive: true,
          label: 'Mekong Whirlpool Vortex',
        });

        this.wormTargetX = destX;
        this.wormTargetY = destY;
        this.wormLunging = true;
        this.dashHitboxActive = true;
        this.dashLabel = 'Shadow Naga Lunge';
        this.nextStateAt = this.scene.time.now + Math.round((this.phase === 2 ? 980 : 1150) / this.speedMult);
        this.pendingAction = () => {
          this.wormLunging = false;
          this.enterRecovery(920);
        };
      });
    }
  }

  private spawnPoisonPool(x: number): void {
    const pool = this.scene.add
      .ellipse(x, this.floorY - 8, 114, 20, 0x16a34a, 0.72)
      .setStrokeStyle(2.5, 0x86efac, 0.95)
      .setDepth(54);

    this.scene.tweens.add({
      targets: pool,
      scaleX: 1.08,
      scaleY: 0.88,
      duration: 420,
      yoyo: true,
      repeat: -1,
    });

    this.hazards.push({
      kind: 'poison_pool',
      sprite: pool,
      x,
      y: this.floorY - 10,
      vx: 0,
      vy: 0,
      width: 108,
      height: 22,
      damage: Math.round(this.def.baseAttack * 0.65),
      expiresAt: this.scene.time.now + 5600,
      isPoison: true,
      alive: true,
      label: 'Naga Poison Pool',
    });
  }

  private checkAreaHit(
    cx: number,
    radius: number,
    damage: number,
    label: string,
    playerX: number
  ): void {
    if (Math.abs(playerX - cx) <= radius) {
      this.callbacks.onHitPlayer(Math.round(damage), label);
    }
  }

  private updateWormTrailAndSegments(time: number): void {
    this.wormEntity?.update(time, this.x, this.y);
  }

  public update(
    time: number,
    delta: number,
    playerX: number,
    playerY: number,
    playerBounds: Phaser.Geom.Rectangle
  ): void {
    const dt = delta / 1000;

    if (this.alive) {
      // 1. QuadrupedHopperRig Elastic Squash-and-Stretch Leap Arc
      if (this.isLeaping) {
        const t = Math.min(1, (time - this.leapStartAt) / Math.max(1, this.leapDurationMs));
        this.x = Phaser.Math.Linear(this.leapStartX, this.leapTargetX, t);
        const arcH = Math.sin(t * Math.PI) * 235;
        this.y = this.floorY - arcH;
        const stretch = 1 + Math.sin(t * Math.PI) * 0.28;
        this.sprite.setScale(this.baseScale / stretch, this.baseScale * stretch);
      }

      // 2. FloaterRig Figure-8 Swoop & Spinning Dash
      if (this.def.rig === 'FloaterRig') {
        if (this.isFigure8Swooping) {
          const t = (time - this.swoopStartAt) / Math.max(1, this.swoopDurationMs);
          const ang = t * Math.PI * 2;
          this.x = Phaser.Math.Clamp(
            this.swoopCenterX + Math.sin(ang) * 320,
            this.arenaMinX + 90,
            this.arenaMaxX - 90
          );
          this.y = Phaser.Math.Clamp(
            this.swoopCenterY + Math.sin(ang * 2) * 115,
            210,
            this.floorY - 76
          );
          if (time - this.lastOrbDropAt > (this.phase === 2 ? 320 : 480)) {
            this.lastOrbDropAt = time;
            const orb = this.scene.add
              .circle(this.x, this.y, 10, this.phase === 2 ? 0xf43f5e : 0x10b981, 0.9)
              .setStrokeStyle(2, 0xfef08a)
              .setDepth(60);
            this.hazards.push({
              kind: 'orb',
              sprite: orb,
              x: this.x,
              y: this.y,
              vx: (Math.random() - 0.5) * 60,
              vy: 155 * this.speedMult,
              width: 18,
              height: 18,
              damage: Math.round(this.def.baseAttack * 0.72),
              expiresAt: time + 2200,
              alive: true,
              label: 'Bioluminescent Ember',
            });
          }
          if (this.dashHitboxActive && !this.activeAttackHitApplied) {
            if (Phaser.Geom.Intersects.RectangleToRectangle(this.getBounds(), playerBounds)) {
              this.activeAttackHitApplied = true;
              this.callbacks.onHitPlayer(this.def.baseAttack, this.dashLabel);
            }
          }
        }
        if (this.isSpinning) {
          this.sprite.angle += 760 * dt;
        } else {
          this.sprite.angle = Math.sin(time * 0.005) * 6;
        }
      }

      // 3. MultiSegmentWormRig Smooth Sinusoidal Platform Weaving
      if (this.def.rig === 'MultiSegmentWormRig') {
        const targetX = this.wormLunging
          ? this.wormTargetX
          : Phaser.Math.Clamp(
              playerX + Math.sin(time * 0.0014) * 310,
              this.arenaMinX + 140,
              this.arenaMaxX - 140
            );
        const targetY = this.wormLunging
          ? this.wormTargetY
          : Phaser.Math.Clamp(360 + Math.sin(time * 0.0028) * 135, 220, this.floorY - 95);

        const maxSpd = (this.wormLunging ? 460 : 210) * this.speedMult;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const desiredVx = (dx / dist) * maxSpd;
        const desiredVy = (dy / dist) * maxSpd;
        const steer = this.wormLunging ? 6.2 : 3.1;
        this.wormVx = Phaser.Math.Linear(this.wormVx, desiredVx, Math.min(1, steer * dt));
        this.wormVy = Phaser.Math.Linear(this.wormVy, desiredVy, Math.min(1, steer * dt));
        this.x = Phaser.Math.Clamp(this.x + this.wormVx * dt, this.arenaMinX + 90, this.arenaMaxX - 90);
        this.y = Phaser.Math.Clamp(this.y + this.wormVy * dt, 190, this.floorY - 68);
        this.sprite.setFlipX(this.wormVx > 0);

        if (this.wormLunging && this.dashHitboxActive && !this.activeAttackHitApplied) {
          if (this.intersectsHitbox(playerBounds)) {
            this.activeAttackHitApplied = true;
            this.callbacks.onHitPlayer(this.def.baseAttack, this.dashLabel);
          }
        }
        this.updateWormTrailAndSegments(time);
      }

      // 4. Linear Dash Charge (HumanoidRig & FloaterRig Spinning Dash)
      if (this.dashVelX !== 0 || this.dashVelY !== 0) {
        this.x = Phaser.Math.Clamp(
          this.x + this.dashVelX * dt,
          this.arenaMinX + 90,
          this.arenaMaxX - 90
        );
        if (this.dashVelY !== 0) {
          this.y = Phaser.Math.Clamp(this.y + this.dashVelY * dt, 200, this.floorY - 64);
        }
        if (this.dashHitboxActive && !this.activeAttackHitApplied) {
          if (Phaser.Geom.Intersects.RectangleToRectangle(this.getBounds(), playerBounds)) {
            this.activeAttackHitApplied = true;
            this.callbacks.onHitPlayer(this.def.baseAttack, this.dashLabel);
          }
        }
      }

      // 5. Idle subtle stalking toward player
      if (this.stage === 'idle' && !this.isLeaping && this.def.rig !== 'MultiSegmentWormRig') {
        const dist = playerX - this.x;
        this.sprite.setFlipX(dist > 0);
        if (this.def.rig === 'FloaterRig') {
          const desiredX = Phaser.Math.Clamp(playerX + (dist > 0 ? -240 : 240), this.arenaMinX + 110, this.arenaMaxX - 110);
          const desiredY = Phaser.Math.Clamp(playerY - 125 + Math.sin(time * 0.004) * 32, 230, this.floorY - 110);
          this.x = Phaser.Math.Linear(this.x, desiredX, Math.min(1, 1.8 * dt));
          this.y = Phaser.Math.Linear(this.y, desiredY, Math.min(1, 2.2 * dt));
        } else if (Math.abs(dist) > 220) {
          const stepSpeed = (this.def.id === 'sdech_kongkaeb' ? 56 : 44) * this.speedMult;
          this.x = Phaser.Math.Clamp(
            this.x + Math.sign(dist) * stepSpeed * dt,
            this.arenaMinX + 95,
            this.arenaMaxX - 95
          );
        }
      }

      // State Machine Tick
      if (this.stage !== 'phase_roar' && time >= this.nextStateAt) {
        if (this.stage === 'idle') {
          this.chooseNextAttack(playerX, playerY, time);
        } else if (this.stage === 'windup' || this.stage === 'active') {
          const fn = this.pendingAction;
          this.pendingAction = undefined;
          if (fn) fn();
        } else if (this.stage === 'recovery') {
          this.stage = 'idle';
          this.stageBadge.setVisible(false);
          this.nextStateAt = time + Math.round(420 / this.speedMult);
        }
      }

      // Sync Boss Visual Position, Living Stage Animations & Aura Lights
      const isAirborne = this.def.rig === 'FloaterRig' || this.def.rig === 'MultiSegmentWormRig';
      const breathe = this.stage === 'idle' || this.stage === 'recovery' ? Math.sin(time / 270) * (isAirborne ? 8 : 3.2) : 0;
      const windupShakeX = this.stage === 'windup' ? Math.sin(time * 0.065) * 4.5 : 0;
      this.sprite.setPosition(this.x + windupShakeX, this.y + breathe);

      // Living boss squash-and-stretch / anticipation crouch / attack lunge / recovery stagger animations!
      if (!this.isLeaping && !this.isSpinning) {
        if (this.stage === 'windup') {
          const pulse = Math.sin(time * 0.03) * 0.06;
          this.sprite.setScale(this.baseScale * (1.1 + pulse), this.baseScale * (0.88 - pulse));
          this.sprite.setRotation((this.sprite.flipX ? -1 : 1) * 0.07);
        } else if (this.stage === 'active') {
          const lunge = Math.sin(time * 0.025) * 0.05;
          this.sprite.setScale(this.baseScale * (0.94 + lunge), this.baseScale * (1.1 + Math.abs(lunge)));
          this.sprite.setRotation((this.sprite.flipX ? 1 : -1) * 0.09);
        } else if (this.stage === 'recovery') {
          const sway = Math.sin(time * 0.012) * 0.08;
          this.sprite.setScale(this.baseScale * 1.05, this.baseScale * 0.94);
          this.sprite.setRotation(sway);
        } else if (this.stage === 'phase_roar') {
          const roar = Math.sin(time * 0.04) * 0.1;
          this.sprite.setScale(this.baseScale * (1.14 + roar), this.baseScale * (1.14 - roar * 0.5));
          this.sprite.setRotation(0);
        } else {
          // Idle living breath cycle
          const breathWave = Math.sin(time / 320);
          this.sprite.setScale(
            this.baseScale * (1 + breathWave * 0.035),
            this.baseScale * (1 - breathWave * 0.035)
          );
          this.sprite.setRotation(isAirborne ? Math.sin(time * 0.004) * 0.06 : Math.sin(time / 440) * 0.025);
        }
      }

      this.shadow.setPosition(this.x, this.floorY - 2);
      const heightFactor = Math.max(0.35, 1 - (this.floorY - this.y) / 390);
      this.shadow.setScale(heightFactor, heightFactor);

      if (this.throatGlow) {
        this.throatGlow.setPosition(this.x, this.y - 42);
      }
      if (this.arpSpotlight && this.arpOuterGlow) {
        const pulse = 1 + Math.sin(time * 0.008) * 0.09;
        this.arpSpotlight.setPosition(this.x, this.y + breathe).setScale(pulse);
        this.arpOuterGlow.setPosition(this.x, this.y + breathe).setScale(pulse * 1.05);
      }
      if (this.arpWisps.length > 0) {
        this.arpWisps.forEach((w, idx) => {
          const ang = time * 0.0038 + (idx * Math.PI * 2) / this.arpWisps.length;
          w.setPosition(this.x + Math.cos(ang) * 76, this.y + Math.sin(ang) * 46);
        });
      }
      if (this.playerLanternGlow) {
        this.playerLanternGlow.setPosition(playerX, playerY - 12);
      }

      // DuoStormCrystalRig Live Update: Moni Mekhala overhead glide + autonomous cyan crystal beams & healing orbs!
      if (this.def.rig === 'DuoStormCrystalRig') {
        if (this.eysoAura && this.eysoHp > 0) {
          this.eysoAura.setPosition(this.x, this.y - 72).setScale(1 + Math.sin(time * 0.009) * 0.08);
        }
        if (this.mekhalaContainer && this.mekhalaHp > 0) {
          const desiredMekX = Phaser.Math.Clamp(
            playerX + Math.sin(time * 0.0016) * 280,
            this.arenaMinX + 120,
            this.arenaMaxX - 120
          );
          const desiredMekY = 235 + Math.sin(time * 0.0032) * 44;
          this.mekhalaX = Phaser.Math.Linear(this.mekhalaX, desiredMekX, Math.min(1, 2.2 * dt));
          this.mekhalaY = Phaser.Math.Linear(this.mekhalaY, desiredMekY, Math.min(1, 2.6 * dt));
          this.mekhalaContainer.setPosition(this.mekhalaX, this.mekhalaY);

          if (time >= this.mekhalaNextCastAt) {
            const overdrive = Boolean(this.duoOverdriveName);
            this.mekhalaNextCastAt = time + Math.round((overdrive ? 2300 : 3400) / this.speedMult);
            if (this.eysoHp > 0 && this.eysoHp < this.eysoMaxHp * 0.85 && Math.random() < 0.35) {
              // Healing Crystal Orb drifting down toward Ream Eyso!
              const healAmt = Math.round(this.eysoMaxHp * 0.03);
              const orb = this.scene.add
                .circle(this.mekhalaX, this.mekhalaY + 24, 14, 0x34d399, 0.9)
                .setStrokeStyle(2, 0xe0f2fe)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setDepth(62);
              this.scene.tweens.add({
                targets: orb,
                x: this.x,
                y: this.y - 68,
                duration: 680,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                  orb.destroy();
                  if (this.alive && this.eysoHp > 0) {
                    this.eysoHp = Math.min(this.eysoMaxHp, this.eysoHp + healAmt);
                    this.hp = this.eysoHp + this.mekhalaHp;
                    this.callbacks.onFloatingText(this.x, this.y - 125, `+${healAmt} ✨ CRYSTAL HEAL`, '#6ee7b7', '13px');
                  }
                },
              });
            } else {
              this.fireMekhalaCrystalBeam(playerX, overdrive);
            }
          }
        }
      }

      // SovereignYakshaRig Live Update: Crimson-Gold Aura + 3 Orbiting Spectral Yaksha Masks firing cross-beams!
      if (this.def.rig === 'SovereignYakshaRig') {
        const pulse = 1 + Math.sin(time * 0.008) * 0.1;
        this.sovereignAura?.setPosition(this.x, this.y - 96).setScale(pulse);
        this.sovereignCrownRing?.setPosition(this.x, this.y - 196).setScale(1 + Math.cos(time * 0.01) * 0.08);
        if (this.yakshaMasks.length > 0) {
          this.yakshaMasks.forEach((m, idx) => {
            const ang = time * 0.0024 + (idx * Math.PI * 2) / 3;
            m.setPosition(this.x + Math.cos(ang) * 145, this.y - 125 + Math.sin(ang) * 62);
          });
          if (time >= this.maskFireCooldownAt) {
            this.maskFireCooldownAt = time + Math.round((this.phase === 3 ? 2500 : 3500) / this.speedMult);
            const mask = this.yakshaMasks[Math.floor(time / 1000) % this.yakshaMasks.length];
            const ang = Phaser.Math.Angle.Between(mask.x, mask.y, playerX, playerY - 14);
            const spd = 330 * this.speedMult;
            const beamOrb = this.scene.add
              .circle(mask.x, mask.y, 11, 0xe11d48, 0.95)
              .setStrokeStyle(2, 0xfacc15)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setDepth(64);
            this.hazards.push({
              kind: 'orb',
              sprite: beamOrb,
              x: mask.x,
              y: mask.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              width: 20,
              height: 20,
              damage: Math.round(this.def.baseAttack * 0.78),
              expiresAt: time + 2400,
              alive: true,
              label: 'Yaksha Mask Cross-Beam',
            });
          }
        }
      }

      this.stageBadge.setPosition(this.x, this.y - (isAirborne ? 82 : 175));
    }

    // Update Active Boss Hazards (Shockwaves, Boulders, Mini Tadpoles, Tongue, Orbs, Venom, Poison Pools)
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (!h) continue;
      if (!h.alive || time >= h.expiresAt) {
        if (h.sprite?.active) h.sprite.destroy();
        this.hazards.splice(i, 1);
        continue;
      }

      if (h.kind === 'tadpole') {
        h.vy += 760 * dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        if (h.y >= this.floorY - 14) {
          h.y = this.floorY - 14;
          h.vy = -340;
          h.vx = Math.sign(playerX - h.x || 1) * (150 * this.speedMult);
        }
        if (h.x < this.arenaMinX + 30 || h.x > this.arenaMaxX - 30) {
          h.vx *= -1;
        }
      } else if (h.kind === 'venom_glob') {
        h.vy += 740 * dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        if (h.y >= this.floorY - 14) {
          const splashX = Phaser.Math.Clamp(h.x, this.arenaMinX + 60, this.arenaMaxX - 60);
          this.telegraphs.playImpactJuice(splashX, this.floorY - 8, 'green', false);
          this.spawnPoisonPool(splashX);
          h.alive = false;
          if (h.sprite?.active) h.sprite.destroy();
          this.hazards.splice(i, 1);
          continue;
        }
      } else if (h.kind === 'boomerang_axe') {
        if (h.boomerangReturnAt && time >= h.boomerangReturnAt) {
          h.boomerangReturnAt = undefined;
          const backDir = Math.sign((h.boomerangOriginX ?? this.x) - h.x) || -Math.sign(h.vx || 1);
          h.vx = backDir * (560 * this.speedMult);
        }
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.sprite.angle += 720 * dt;
      } else if (h.kind === 'chakram') {
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.sprite.angle += 540 * dt;
      } else {
        h.x += h.vx * dt;
        h.y += h.vy * dt;
      }

      h.sprite.setPosition(h.x, h.y);

      if (h.kind === 'boulder' && h.y >= this.floorY - 18) {
        this.telegraphs.playImpactJuice(h.x, this.floorY - 10, 'red', false);
        h.alive = false;
        if (h.sprite?.active) h.sprite.destroy();
        this.hazards.splice(i, 1);
        continue;
      }

      const hRect = new Phaser.Geom.Rectangle(
        h.x - h.width / 2,
        h.y - h.height / 2,
        h.width,
        h.height
      );
      if (Phaser.Geom.Intersects.RectangleToRectangle(hRect, playerBounds)) {
        const pullDir = h.kind === 'tongue' ? Math.sign(this.x - playerX) : undefined;
        this.callbacks.onHitPlayer(h.damage, h.label, pullDir, h.isPoison);
        if (h.kind !== 'tadpole' && h.kind !== 'poison_pool') {
          h.alive = false;
          if (h.sprite?.active) h.sprite.destroy();
          const curIdx = this.hazards.indexOf(h);
          if (curIdx !== -1) this.hazards.splice(curIdx, 1);
        }
        if (this.hazards.length === 0) break;
      }
    }
  }

  public destroy(): void {
    this.telegraphs.clearAll();
    this.clearHazards();
    this.sprite.destroy();
    this.shadow.destroy();
    this.throatGlow?.destroy();
    this.stageBadge.destroy();
    this.darkVeil?.destroy();
    this.arpSpotlight?.destroy();
    this.arpOuterGlow?.destroy();
    this.arpWisps.forEach((w) => w.destroy());
    this.arpWisps = [];
    this.playerLanternGlow?.destroy();
    this.eysoAura?.destroy();
    this.mekhalaContainer?.destroy();
    this.sovereignAura?.destroy();
    this.sovereignCrownRing?.destroy();
    this.sovereignVignette?.destroy();
    this.yakshaMasks.forEach((m) => m.destroy());
    this.yakshaMasks = [];
    this.wormEntity?.destroy();
    this.wormEntity = undefined;
  }
}
