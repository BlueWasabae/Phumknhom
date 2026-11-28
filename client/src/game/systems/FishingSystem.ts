import Phaser from 'phaser';
import { soundManager } from './SoundManager';
import { vfxManager } from '../animations/VFXManager';
import { EventBus, type FishingBitePayload } from '../EventBus';
import { MAX_FISHING_DISTANCE } from './CombatAimHelper';
import { seasonClock } from './SeasonClock';

export type FishingStage = 'idle' | 'casting' | 'waiting' | 'reeling' | 'catching';

interface FishPoolEntry {
  fishId: string;
  label: string;
  khmerName: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'ancient';
  color: string;
  colorHex: number;
  fishingXp: number;
  weight: number;
  /** 1 (calm) .. 5 (erratic Mythic/Ancient darting speed) */
  difficulty: number;
}

const MEKONG_FISH_POOL: FishPoolEntry[] = [
  {
    fishId: 'fish_trey_riel',
    label: 'Trey Riel (Mekong Carp)',
    khmerName: 'ត្រីរៀល',
    emoji: '🐟',
    rarity: 'common',
    color: '#cbd5e1',
    colorHex: 0x94a3b8,
    fishingXp: 24,
    weight: 38,
    difficulty: 1.0,
  },
  {
    fishId: 'fish_trey_ros',
    label: 'Trey Ros (Snakehead)',
    khmerName: 'ត្រីរ៉ស់',
    emoji: '🐠',
    rarity: 'uncommon',
    color: '#4ade80',
    colorHex: 0x4ade80,
    fishingXp: 36,
    weight: 28,
    difficulty: 1.5,
  },
  {
    fishId: 'fish_mekong_prawn',
    label: 'Giant Mekong Prawn',
    khmerName: 'បង្កងទន្លេមេគង្គ',
    emoji: '🦐',
    rarity: 'rare',
    color: '#38bdf8',
    colorHex: 0x38bdf8,
    fishingXp: 52,
    weight: 18,
    difficulty: 2.1,
  },
  {
    fishId: 'fish_golden_catfish',
    label: 'Golden Tonle Sap Catfish',
    khmerName: 'ត្រីប្រាមាស',
    emoji: '🐡',
    rarity: 'epic',
    color: '#c084fc',
    colorHex: 0xc084fc,
    fishingXp: 78,
    weight: 10,
    difficulty: 2.8,
  },
  {
    fishId: 'fish_royal_giant_barb',
    label: 'Royal Khmer Giant Barb',
    khmerName: 'ត្រីគល់រាំងរាជ',
    emoji: '🦈',
    rarity: 'legendary',
    color: '#facc15',
    colorHex: 0xfacc15,
    fishingXp: 115,
    weight: 4.5,
    difficulty: 3.6,
  },
  {
    fishId: 'fish_naga_scale_koi',
    label: 'Mythic Naga-Scale Koi',
    khmerName: 'ត្រីនាគទេព',
    emoji: '🐉',
    rarity: 'mythic',
    color: '#fb7185',
    colorHex: 0xfb7185,
    fishingXp: 165,
    weight: 1.2,
    difficulty: 4.4,
  },
  {
    fishId: 'fish_ancient_mekong_leviathan',
    label: 'Ancient Angkor Spirit Carp',
    khmerName: 'ត្រីបុរាណអង្គរ',
    emoji: '✨',
    rarity: 'ancient',
    color: '#fef08a',
    colorHex: 0xfef08a,
    fishingXp: 240,
    weight: 0.3,
    difficulty: 5.0,
  },
];

const KOH_RONG_FISH_POOL: FishPoolEntry[] = [
  {
    fishId: 'fish_coral_snapper',
    label: 'Coral Snapper',
    khmerName: 'ត្រីក្រហមថ្មប៉ប្រះទឹក',
    emoji: '🐠',
    rarity: 'common',
    color: '#cbd5e1',
    colorHex: 0xfb7185,
    fishingXp: 34,
    weight: 34,
    difficulty: 1.2,
  },
  {
    fishId: 'fish_blue_crab',
    label: 'Koh Rong Blue Crab',
    khmerName: 'ក្តាមសេះសមុទ្រ',
    emoji: '🦀',
    rarity: 'uncommon',
    color: '#4ade80',
    colorHex: 0x38bdf8,
    fishingXp: 44,
    weight: 24,
    difficulty: 1.6,
  },
  {
    fishId: 'fish_tropical_squid',
    label: 'Tropical Squid',
    khmerName: 'មឹកសមុទ្រត្រូពិច',
    emoji: '🦑',
    rarity: 'uncommon',
    color: '#4ade80',
    colorHex: 0xf472b6,
    fishingXp: 48,
    weight: 18,
    difficulty: 1.9,
  },
  {
    fishId: 'fish_mekong_stingray',
    label: 'Mekong Stingray',
    khmerName: 'ត្រីបបែលយក្ស',
    emoji: '🐟',
    rarity: 'rare',
    color: '#38bdf8',
    colorHex: 0x0ea5e9,
    fishingXp: 68,
    weight: 14,
    difficulty: 2.5,
  },
  {
    fishId: 'fish_bioluminescent_jellyfish',
    label: 'Bioluminescent Jellyfish',
    khmerName: 'ខ្ញែរសមុទ្រពន្លឺខៀវ',
    emoji: '🪼',
    rarity: 'epic',
    color: '#c084fc',
    colorHex: 0x22d3ee,
    fishingXp: 96,
    weight: 7.95,
    difficulty: 3.1,
  },
  {
    fishId: 'fish_sapphire_turtle_shell',
    label: 'Sapphire Sea Turtle Shell',
    khmerName: 'ស្នូកអណ្តើកសមុទ្រត្បូងកណ្តៀង',
    emoji: '🐢',
    rarity: 'legendary',
    color: '#facc15',
    colorHex: 0x0284c7,
    fishingXp: 150,
    weight: 1.5,
    difficulty: 3.8,
  },
  {
    fishId: 'fish_starlight_manta',
    label: 'Starlight Manta Ray',
    khmerName: 'ត្រីបបែលពន្លឺផ្កាយ',
    emoji: '🦈',
    rarity: 'mythic',
    color: '#fb7185',
    colorHex: 0x38bdf8,
    fishingXp: 215,
    weight: 0.4,
    difficulty: 4.5,
  },
  {
    fishId: 'fish_ancient_golden_barb',
    label: 'Ancient Golden Giant Barb',
    khmerName: 'ត្រីគល់រាំងមាសបុរាណមហាសមុទ្រ',
    emoji: '👑',
    rarity: 'ancient',
    color: '#fef08a',
    colorHex: 0xfacc15,
    fishingXp: 320,
    weight: 0.15,
    difficulty: 5.0,
  },
];

function rollFishFromPool(pool: FishPoolEntry[], fishingLevel: number): FishPoolEntry {
  const baseLuck = Math.min(2.2, 1 + Math.max(0, fishingLevel - 1) * 0.06);
  // Update 3.1 — Monsoon Rain Synergy: +15% Rare/Mythic/Ancient Fishing Luck at Green Park & Koh Rong!
  const monsoonBoost = seasonClock.getSnapshot().synergy.monsoonActive ? 1.15 : 1.0;
  const weighted = pool.map((f) => {
    const isRarePlus =
      f.rarity === 'rare' ||
      f.rarity === 'epic' ||
      f.rarity === 'legendary' ||
      f.rarity === 'mythic' ||
      f.rarity === 'ancient';
    const mult = f.rarity === 'common' ? 1 : baseLuck * (isRarePlus ? monsoonBoost : 1);
    return { f, w: f.weight * mult };
  });
  const total = weighted.reduce((acc, e) => acc + e.w, 0);
  let r = Math.random() * total;
  for (const e of weighted) {
    r -= e.w;
    if (r <= 0) return e.f;
  }
  return pool[0];
}

/**
 * Full 4-Stage Animated In-World Mekong River Fishing System (Update 2.3):
 *  Stage 1: Cast Animation (bamboo rod swing, curved white fishing line, red-white bobber + ripple rings & splash SFX)
 *  Stage 2: Wait & Bite (2.0–4.5s gentle bobbing -> golden `!` overhead popup + heavy splash)
 *  Stage 3: Interactive Reeling Mini-Game (`FishingMiniGame.tsx`)
 *  Stage 4: Animated Catch (fish leaps in a glowing parabolic arc from river into player's hands + rarity sparkles!)
 */
export class FishingSystem {
  private scene: Phaser.Scene;
  private stage: FishingStage = 'idle';
  private rodGraphics: Phaser.GameObjects.Graphics;
  private lineGraphics: Phaser.GameObjects.Graphics;
  private bobberContainer: Phaser.GameObjects.Container | null = null;
  private biteMark: Phaser.GameObjects.Text | null = null;

  private anchorPlayerX = 0;
  private anchorPlayerY = 0;
  private bobberX = 440;
  private bobberY = 835;
  private castStartedAt = 0;
  private currentFish: FishPoolEntry | null = null;
  private pendingTimer: Phaser.Time.TimerEvent | null = null;
  private rippleTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.rodGraphics = scene.add.graphics().setDepth(2150);
    this.lineGraphics = scene.add.graphics().setDepth(2148);
  }

  public isActive(): boolean {
    return this.stage !== 'idle';
  }

  public getStage(): FishingStage {
    return this.stage;
  }

  /**
   * Checks whether the player stands within `MAX_FISHING_DISTANCE = 110px` of the active fishing pier/shoreline.
   */
  public canCastFrom(
    px: number,
    py: number,
    mode: 'mekong' | 'koh_rong' = 'mekong'
  ): { ok: boolean; waterX: number; waterY: number } {
    if (mode === 'koh_rong') {
      // Koh Rong Deep-Sea Pier (1220, 800) & southern ocean shoreline (y >= 740)
      const distToPier = Phaser.Math.Distance.Between(px, py, 1220, 815);
      const nearOcean = py >= 735;
      if (distToPier > MAX_FISHING_DISTANCE + 45 && !nearOcean) {
        return { ok: false, waterX: 1295, waterY: 880 };
      }
      const waterX = Phaser.Math.Clamp(px + (px > 1100 ? 75 : 0) + (Math.random() - 0.5) * 48, 260, 1460);
      const waterY = Phaser.Math.Clamp(Math.max(875, py + 72) + (Math.random() - 0.5) * 32, 870, 995);
      return { ok: true, waterX, waterY };
    }
    // Pier anchor & shoreline spots around the Green Park pond (center 440, 840; pier at 525, 825)
    const distToPier = Phaser.Math.Distance.Between(px, py, 525, 825);
    const distToPondEdge = Math.max(0, Phaser.Math.Distance.Between(px, py, 440, 840) - 96);
    if (distToPier > MAX_FISHING_DISTANCE && distToPondEdge > MAX_FISHING_DISTANCE) {
      return { ok: false, waterX: 435, waterY: 840 };
    }
    // Aim bobber into the open water of the Mekong Pond
    const waterX = Phaser.Math.Clamp(430 + (Math.random() - 0.5) * 62, 375, 485);
    const waterY = Phaser.Math.Clamp(838 + (Math.random() - 0.5) * 40, 804, 872);
    return { ok: true, waterX, waterY };
  }

  /**
   * Stage 1 -> Stage 2: Swings bamboo rod, arcs white fishing line, lands bobber with water ripples, then waits for bite!
   */
  public startCast(
    playerX: number,
    playerY: number,
    fishingLevel: number,
    onFaceWater?: (facing: 'left' | 'right' | 'down' | 'up') => void,
    mode: 'mekong' | 'koh_rong' = 'mekong'
  ): boolean {
    if (this.stage !== 'idle') return false;

    const check = this.canCastFrom(playerX, playerY, mode);
    if (!check.ok) {
      vfxManager.spawnFloatingText(
        this.scene,
        playerX,
        playerY - 26,
        mode === 'koh_rong' ? '🚶 Walk onto the Deep-Sea Pier' : '🚶 Move closer to the river',
        '#fde68a',
        '12px',
        { riseY: 22, durationMs: 800, depth: 3200 }
      );
      return false;
    }

    this.stage = 'casting';
    this.anchorPlayerX = playerX;
    this.anchorPlayerY = playerY;
    this.bobberX = check.waterX;
    this.bobberY = check.waterY;
    this.castStartedAt = this.scene.time.now;
    this.currentFish = rollFishFromPool(
      mode === 'koh_rong' ? KOH_RONG_FISH_POOL : MEKONG_FISH_POOL,
      fishingLevel
    );

    onFaceWater?.(this.bobberX < playerX ? 'left' : 'right');
    soundManager.playSfx('swing');

    vfxManager.spawnFloatingText(this.scene, playerX, playerY - 26, '🎣 Casting line...', '#bae6fd', '12px', {
      riseY: 20,
      durationMs: 750,
      depth: 3100,
    });

    // Spawn red-and-white bobber flying in a parabolic arc to water
    this.bobberContainer?.destroy();
    const bobber = this.scene.add.container(playerX, playerY - 12).setDepth(2145);
    const bTop = this.scene.add.circle(0, -2, 3.2, 0xef4444, 1).setStrokeStyle(1, 0x1e293b);
    const bBot = this.scene.add.circle(0, 1.5, 3.0, 0xffffff, 1).setStrokeStyle(1, 0x1e293b);
    const bPin = this.scene.add.rectangle(0, -5, 1.2, 4, 0xfef08a);
    bobber.add([bBot, bTop, bPin]);
    this.bobberContainer = bobber;

    const arcState = { t: 0 };
    this.scene.tweens.add({
      targets: arcState,
      t: 1,
      duration: 420,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        const t = arcState.t;
        const bx = Phaser.Math.Linear(playerX, this.bobberX, t);
        const by = Phaser.Math.Linear(playerY - 12, this.bobberY, t) - Math.sin(t * Math.PI) * 34;
        bobber.setPosition(bx, by);
      },
      onComplete: () => {
        if (this.stage !== 'casting') return;
        this.stage = 'waiting';
        soundManager.playSfx('splash');
        this.spawnWaterRipple(this.bobberX, this.bobberY, 0xbae6fd, 18);
        this.spawnWaterRipple(this.bobberX, this.bobberY, 0x38bdf8, 28, 120);
        this.beginWaitingForBite();
      },
    });

    return true;
  }

  private beginWaitingForBite(): void {
    this.clearTimers();
    // Subtle ambient ripple while bobber floats
    this.rippleTimer = this.scene.time.addEvent({
      delay: 720,
      loop: true,
      callback: () => {
        if (this.stage === 'waiting' || this.stage === 'reeling') {
          this.spawnWaterRipple(this.bobberX, this.bobberY, 0xe0f2fe, this.stage === 'reeling' ? 22 : 12);
        }
      },
    });

    // Stage 2: Random bite delay (2.0s – 4.2s)
    const biteDelay = Phaser.Math.Between(2000, 4200);
    this.pendingTimer = this.scene.time.delayedCall(biteDelay, () => {
      if (this.stage !== 'waiting' || !this.currentFish) return;
      this.triggerBiteAndStartReeling();
    });
  }

  private triggerBiteAndStartReeling(): void {
    if (!this.currentFish) return;
    this.stage = 'reeling';

    // Heavy splash + bright golden `!` popup above player's head!
    soundManager.playSfx('splash');
    soundManager.playSfx('magic');
    this.spawnWaterRipple(this.bobberX, this.bobberY, 0xfacc15, 26);
    this.spawnWaterRipple(this.bobberX, this.bobberY, 0xffffff, 36, 90);
    this.spawnSplashDroplets(this.bobberX, this.bobberY, 8);

    this.biteMark?.destroy();
    this.biteMark = this.scene.add
      .text(this.anchorPlayerX, this.anchorPlayerY - 34, '❗', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#facc15',
        stroke: '#451a03',
        strokeThickness: 5,
      })
      .setResolution(2)
      .setScale(0.55)
      .setOrigin(0.5)
      .setDepth(3250);
    this.scene.tweens.add({
      targets: this.biteMark,
      y: this.anchorPlayerY - 46,
      scale: 0.72,
      duration: 240,
      yoyo: true,
      repeat: 1,
    });

    // Stage 3: Open interactive Catch Bar mini-game overlay
    const payload: FishingBitePayload = {
      fishId: this.currentFish.fishId,
      label: this.currentFish.label,
      khmerName: this.currentFish.khmerName,
      emoji: this.currentFish.emoji,
      rarity: this.currentFish.rarity,
      color: this.currentFish.color,
      fishingXp: this.currentFish.fishingXp,
      difficulty: this.currentFish.difficulty,
    };
    EventBus.emit('fishing:biteReady', payload);
  }

  /**
   * Stage 4: Called when `FishingMiniGame.tsx` finishes reeling (success or escaped).
   */
  public resolveReelResult(success: boolean): void {
    if (this.stage === 'idle') return;
    const fish = this.currentFish;
    this.clearTimers();
    this.biteMark?.destroy();
    this.biteMark = null;

    if (!success || !fish) {
      soundManager.playSfx('splash');
      vfxManager.spawnFloatingText(
        this.scene,
        this.bobberX,
        this.bobberY - 12,
        '💨 Fish got away!',
        '#fca5a5',
        '12px',
        { riseY: 20, durationMs: 850, depth: 3200 }
      );
      this.resetVisuals();
      return;
    }

    this.stage = 'catching';
    soundManager.playSfx('splash');
    soundManager.playSfx('level_up');
    this.spawnSplashDroplets(this.bobberX, this.bobberY, 12);
    this.spawnWaterRipple(this.bobberX, this.bobberY, fish.colorHex, 34);

    // Leaping Fish Sprite arcing out of the river directly into the player's hands!
    const leapContainer = this.scene.add.container(this.bobberX, this.bobberY).setDepth(3200);
    const halo = this.scene.add.circle(0, 0, 12, fish.colorHex, 0.42).setBlendMode(Phaser.BlendModes.ADD);
    const fishTxt = this.scene.add
      .text(0, 0, fish.emoji, { fontSize: '24px' })
      .setResolution(2)
      .setScale(0.7)
      .setOrigin(0.5);
    leapContainer.add([halo, fishTxt]);

    const startX = this.bobberX;
    const startY = this.bobberY;
    const endX = this.anchorPlayerX;
    const endY = this.anchorPlayerY - 14;
    const arc = { t: 0 };

    this.scene.tweens.add({
      targets: arc,
      t: 1,
      duration: 620,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const t = arc.t;
        const lx = Phaser.Math.Linear(startX, endX, t);
        const ly = Phaser.Math.Linear(startY, endY, t) - Math.sin(t * Math.PI) * 58;
        leapContainer.setPosition(lx, ly);
        fishTxt.setRotation(Math.sin(t * Math.PI * 3) * 0.45);
      },
      onComplete: () => {
        // Rarity sparkle burst right in the player's hands!
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          const sp = this.scene.add.circle(endX, endY, 2.8, i % 2 === 0 ? fish.colorHex : 0xfef08a, 1).setDepth(3220);
          this.scene.tweens.add({
            targets: sp,
            x: endX + Math.cos(ang) * 28,
            y: endY + Math.sin(ang) * 22,
            alpha: 0,
            duration: 420,
            onComplete: () => sp.destroy(),
          });
        }
        vfxManager.spawnFloatingText(
          this.scene,
          endX,
          endY - 22,
          `${fish.emoji} ${fish.label}! (+${fish.fishingXp} XP)`,
          fish.color,
          '13px',
          { riseY: 28, durationMs: 1350, depth: 3260 }
        );
        this.scene.tweens.add({
          targets: leapContainer,
          y: endY - 16,
          alpha: 0,
          duration: 380,
          onComplete: () => leapContainer.destroy(),
        });
        this.resetVisuals();
      },
    });
  }

  /**
   * Cancels fishing cleanly if the player walks away (> 24px) during Stage 1/2.
   */
  public cancelIfMoved(playerX: number, playerY: number): void {
    if (this.stage === 'casting' || this.stage === 'waiting') {
      if (Phaser.Math.Distance.Between(playerX, playerY, this.anchorPlayerX, this.anchorPlayerY) > 22) {
        this.resetVisuals();
      }
    }
  }

  public update(time: number, playerX: number, playerY: number): void {
    this.rodGraphics.clear();
    this.lineGraphics.clear();
    if (this.stage === 'idle') return;

    const dir = this.bobberX < playerX ? -1 : 1;
    const castAge = Math.min(1, (time - this.castStartedAt) / 360);
    const swingAngle = this.stage === 'casting' ? -0.9 + castAge * 0.65 : -0.25;
    const tugShake = this.stage === 'reeling' ? Math.sin(time * 0.04) * 3.5 : 0;

    const handX = playerX + dir * 6;
    const handY = playerY - 6;
    const tipX = handX + dir * Math.cos(swingAngle) * 26 + tugShake;
    const tipY = handY + Math.sin(swingAngle) * 24 - 10 + Math.abs(tugShake) * 0.6;

    // Draw tapered bamboo fishing rod
    this.rodGraphics.lineStyle(3, 0x713f12, 1);
    this.rodGraphics.lineBetween(handX, handY, tipX, tipY);
    this.rodGraphics.lineStyle(1.4, 0xfacc15, 0.9);
    this.rodGraphics.lineBetween(handX, handY, tipX, tipY);

    // Animate bobber gently bobbing or thrashing when a fish is hooked
    if (this.bobberContainer) {
      if (this.stage === 'waiting') {
        this.bobberContainer.setPosition(this.bobberX, this.bobberY + Math.sin(time * 0.006) * 2.2);
      } else if (this.stage === 'reeling') {
        this.bobberContainer.setPosition(
          this.bobberX + Math.sin(time * 0.032) * 5,
          this.bobberY + Math.cos(time * 0.045) * 3
        );
      }

      // Draw curved white fishing line from rod tip to bobber
      const bx = this.bobberContainer.x;
      const by = this.bobberContainer.y - 3;
      const sag = this.stage === 'reeling' ? 4 : 16;
      const midX = (tipX + bx) / 2;
      const midY = (tipY + by) / 2 + sag;
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(tipX, tipY),
        new Phaser.Math.Vector2(midX, midY),
        new Phaser.Math.Vector2(bx, by)
      );
      this.lineGraphics.lineStyle(1.3, 0xf8fafc, 0.9);
      curve.draw(this.lineGraphics, 16);
    }
  }

  private spawnWaterRipple(x: number, y: number, colorHex: number, maxRadius: number, delay = 0): void {
    const start = () => {
      if (!this.scene?.add) return;
      const ring = this.scene.add
        .ellipse(x, y, 8, 4, colorHex, 0)
        .setStrokeStyle(1.5, colorHex, 0.85)
        .setDepth(2140);
      this.scene.tweens.add({
        targets: ring,
        displayWidth: maxRadius * 2,
        displayHeight: maxRadius,
        alpha: 0,
        duration: 540,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    };
    if (delay > 0) this.scene.time.delayedCall(delay, start);
    else start();
  }

  private spawnSplashDroplets(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const drop = this.scene.add.circle(x, y, 2, 0xe0f2fe, 0.95).setDepth(2152);
      const dx = (Math.random() - 0.5) * 32;
      const dy = -12 - Math.random() * 18;
      this.scene.tweens.add({
        targets: drop,
        x: x + dx,
        y: y + dy,
        alpha: 0,
        duration: 360,
        ease: 'Quad.easeOut',
        onComplete: () => drop.destroy(),
      });
    }
  }

  private clearTimers(): void {
    this.pendingTimer?.remove(false);
    this.pendingTimer = null;
    this.rippleTimer?.remove(false);
    this.rippleTimer = null;
  }

  private resetVisuals(): void {
    this.clearTimers();
    this.stage = 'idle';
    this.currentFish = null;
    this.rodGraphics.clear();
    this.lineGraphics.clear();
    this.bobberContainer?.destroy();
    this.bobberContainer = null;
    this.biteMark?.destroy();
    this.biteMark = null;
  }

  public destroy(): void {
    this.resetVisuals();
    this.rodGraphics.destroy();
    this.lineGraphics.destroy();
  }
}
