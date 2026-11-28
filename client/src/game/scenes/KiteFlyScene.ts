import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PlayerState } from '@shared/types';
import { KHLENG_EK_KITES, type KhlengEkKiteId } from '@shared/kitesAndParties';
import type { VillageMapId } from '@shared/worldMapData';
import { EventBus } from '../EventBus';
import { soundManager } from '../systems/SoundManager';
import { vfxManager } from '../animations/VFXManager';

export interface KiteFlySceneData {
  playerState?: PlayerState;
  kiteId?: KhlengEkKiteId;
  returnMapId?: VillageMapId;
  returnX?: number;
  returnY?: number;
}

interface SkyRing {
  node: Phaser.GameObjects.Container;
  x: number;
  y: number;
  collected: boolean;
}

interface StormCloud {
  node: Phaser.GameObjects.Container;
  x: number;
  y: number;
  radius: number;
  hit: boolean;
}

/**
 * Update 3.3 — Khleng Ek (Traditional Khmer Singing Kite) Sunset Wind-Gliding Mini-Game!
 * Hold/release Space or Pointer/Touch to ride sunset wind thermals, collect glowing Wind Chime Rings,
 * dodge dark storm clouds, hear the authentic bamboo-reed Khleng Ek hum at high altitude,
 * and earn Coins, Foraging XP & the Floating Khleng Ek back-slot vanity item!
 */
export class KiteFlyScene extends Phaser.Scene {
  private playerState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private kiteId: KhlengEkKiteId = 'kite_classic_bamboo';
  private returnMapId: VillageMapId = 'green_park';
  private returnX = 800;
  private returnY = 560;

  private kiteNode!: Phaser.GameObjects.Container;
  private stringGfx!: Phaser.GameObjects.Graphics;
  private kiteY = 260;
  private kiteVy = 0;
  private isHoldingLift = false;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private escKey?: Phaser.Input.Keyboard.Key;

  private rings: SkyRing[] = [];
  private clouds: StormCloud[] = [];
  private bgHillsFar!: Phaser.GameObjects.Graphics;
  private bgHillsNear!: Phaser.GameObjects.Graphics;
  private scrollX = 0;

  private timeLeft = 36;
  private hearts = 3;
  private ringsCollected = 0;
  private score = 0;
  private maxAltitudeM = 0;
  private finished = false;
  private lastRingSpawnAt = 0;
  private lastCloudSpawnAt = 0;
  private lastHumAt = 0;

  private hudText!: Phaser.GameObjects.Text;
  private tipText!: Phaser.GameObjects.Text;

  constructor() {
    super('KiteFlyScene');
  }

  init(data?: KiteFlySceneData): void {
    this.playerState = data?.playerState ? { ...data.playerState } : { ...INITIAL_PLAYER_STATE };
    this.kiteId = (data?.kiteId && data.kiteId in KHLENG_EK_KITES ? data.kiteId : 'kite_classic_bamboo') as KhlengEkKiteId;
    this.returnMapId = data?.returnMapId ?? 'green_park';
    this.returnX = data?.returnX ?? 800;
    this.returnY = data?.returnY ?? 560;

    this.rings = [];
    this.clouds = [];
    this.kiteY = 260;
    this.kiteVy = 0;
    this.isHoldingLift = false;
    this.timeLeft = 36;
    this.hearts = 3;
    this.ringsCollected = 0;
    this.score = 0;
    this.maxAltitudeM = 0;
    this.finished = false;
    this.scrollX = 0;
    this.lastRingSpawnAt = 0;
    this.lastCloudSpawnAt = 0;
    this.lastHumAt = 0;
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const kiteDef = KHLENG_EK_KITES[this.kiteId];

    // Golden-Sunset Khmer Sky Gradient Backdrop
    const sky = this.add.graphics().setDepth(0);
    const bands = [
      { frac: 0.0, hFrac: 0.24, col: 0x311042 },
      { frac: 0.24, hFrac: 0.24, col: 0x7c2d12 },
      { frac: 0.48, hFrac: 0.24, col: 0xd97706 },
      { frac: 0.72, hFrac: 0.28, col: 0xfde047 },
    ];
    for (const b of bands) {
      sky.fillStyle(b.col, 1);
      sky.fillRect(0, h * b.frac, w, h * b.hFrac + 4);
    }
    // Glowing Sunset Sun Disc
    const sun = this.add.circle(w * 0.76, h * 0.42, 56, 0xfef08a, 0.85).setDepth(1);
    this.add.circle(w * 0.76, h * 0.42, 84, 0xf59e0b, 0.24).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
    vfxManager.applyBloom(this, sun, { color: 0xfacc15, strength: 1.5 });

    // Scrolling Angkor Mountain & Sugar Palm Silhouettes
    this.bgHillsFar = this.add.graphics().setDepth(2);
    this.bgHillsNear = this.add.graphics().setDepth(3);
    this.drawParallaxHorizon(w, h);

    // Kite String anchored to bottom-left player ground point
    this.stringGfx = this.add.graphics().setDepth(18);

    // Build stylized Khleng Ek Kite Sprite Container
    this.kiteY = h * 0.48;
    const kiteX = Math.max(130, w * 0.22);
    this.kiteNode = this.add.container(kiteX, this.kiteY).setDepth(22);

    const primaryHex = Number(kiteDef.primaryColor.replace('#', '0x'));
    const accentHex = Number(kiteDef.accentColor.replace('#', '0x'));
    const kGfx = this.add.graphics();
    // Traditional Khleng Ek arched bamboo-reed bow hummer at nose!
    kGfx.lineStyle(3, 0xfef3c7, 0.95);
    kGfx.beginPath();
    kGfx.arc(20, 0, 14, -Math.PI * 0.45, Math.PI * 0.45, false);
    kGfx.strokePath();
    // Iconic crescent Khmer kite wings
    kGfx.fillStyle(primaryHex, 1);
    kGfx.lineStyle(2.5, 0x291308, 1);
    kGfx.fillTriangle(26, 0, -14, -22, -4, 0);
    kGfx.fillTriangle(26, 0, -14, 22, -4, 0);
    kGfx.strokeTriangle(26, 0, -14, -22, -4, 0);
    kGfx.strokeTriangle(26, 0, -14, 22, -4, 0);
    // Gold-red silk emblem & twin trailing ribbons
    kGfx.fillStyle(accentHex, 1);
    kGfx.fillCircle(6, 0, 6);
    kGfx.lineStyle(3, accentHex, 0.9);
    kGfx.lineBetween(-12, -10, -46, -16);
    kGfx.lineBetween(-12, 10, -48, 14);
    kGfx.lineStyle(2.5, 0xfef08a, 0.9);
    kGfx.lineBetween(-6, 0, -56, 2);
    this.kiteNode.add(kGfx);
    vfxManager.applyGlow(this, this.kiteNode, accentHex, 2.8, 0.35);

    // Top HUD Strip + Tip + Exit Button (positioned cleanly below the top React HUD bar & above snack dock)
    const hudCenterX = w >= 920 ? Math.max(w / 2, 460) : w / 2;
    this.hudText = this.add
      .text(hudCenterX, 156, '', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef9c3',
        backgroundColor: 'rgba(24, 14, 8, 0.88)',
        padding: { x: 14, y: 7 },
      })
      .setOrigin(0.5, 0)
      .setDepth(100);

    this.tipText = this.add
      .text(hudCenterX, 194, `🪁 ${kiteDef.name} (${kiteDef.khmerName}) · Hold [SPACE] or Mouse/Touch to Ride Sunset Thermals!`, {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef3c7',
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        padding: { x: 12, y: 5 },
      })
      .setOrigin(0.5, 0)
      .setDepth(100);

    const exitBtn = this.add
      .text(w - 18, 156, '✕ Land Kite', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#b91c1c',
        padding: { x: 12, y: 7 },
      })
      .setOrigin(1, 0)
      .setDepth(110)
      .setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => this.finishFlight(false));

    // Input handlers
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.input.on('pointerdown', () => {
      this.isHoldingLift = true;
    });
    this.input.on('pointerup', () => {
      this.isHoldingLift = false;
    });

    this.cameras.main.fadeIn(220, 40, 20, 10);
    EventBus.emit('scene:ready', { zone: 'overworld', mapId: this.returnMapId });
  }

  private drawParallaxHorizon(w: number, h: number): void {
    this.bgHillsFar.clear();
    this.bgHillsFar.fillStyle(0x451a03, 0.55);
    const offFar = (this.scrollX * 0.25) % 240;
    for (let x = -240; x < w + 240; x += 240) {
      this.bgHillsFar.fillTriangle(x - offFar, h, x + 120 - offFar, h - 135, x + 240 - offFar, h);
    }
    this.bgHillsNear.clear();
    this.bgHillsNear.fillStyle(0x1c0a03, 0.78);
    const offNear = (this.scrollX * 0.55) % 180;
    for (let x = -180; x < w + 180; x += 180) {
      this.bgHillsNear.fillRect(x - offNear, h - 46, 182, 46);
      // Distant Angkor stupa silhouette spire
      this.bgHillsNear.fillTriangle(x + 74 - offNear, h - 46, x + 90 - offNear, h - 88, x + 106 - offNear, h - 46);
    }
  }

  private spawnWindRing(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const y = Phaser.Math.Between(232, Math.max(290, h - 110));
    const c = this.add.container(w + 48, y).setDepth(19);
    const outer = this.add.circle(0, 0, 22, 0xfacc15, 0.2).setStrokeStyle(3.5, 0xfef08a, 0.98).setBlendMode(Phaser.BlendModes.ADD);
    const inner = this.add.circle(0, 0, 12, 0x38bdf8, 0.22).setStrokeStyle(2, 0x67e8f9, 0.9);
    c.add([outer, inner]);
    this.rings.push({ node: c, x: w + 48, y, collected: false });
  }

  private spawnStormCloud(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const y = Phaser.Math.Between(236, Math.max(290, h - 115));
    const c = this.add.container(w + 56, y).setDepth(20);
    const g = this.add.graphics();
    g.fillStyle(0x1e293b, 0.94);
    g.fillCircle(-14, 4, 18);
    g.fillCircle(4, -4, 22);
    g.fillCircle(20, 4, 16);
    g.lineStyle(2, 0x38bdf8, 0.85);
    g.lineBetween(0, 10, -5, 22);
    g.lineBetween(-5, 22, 4, 24);
    g.lineBetween(4, 24, -2, 34);
    c.add(g);
    this.clouds.push({ node: c, x: w + 56, y, radius: 26, hit: false });
  }

  update(time: number, delta: number): void {
    if (this.finished) return;
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.finishFlight(false);
      return;
    }

    const dt = Math.min(0.05, delta / 1000);
    const w = this.scale.width;
    const h = this.scale.height;
    const kiteDef = KHLENG_EK_KITES[this.kiteId];

    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft <= 0) {
      this.finishFlight(true);
      return;
    }

    const lifting = this.isHoldingLift || Boolean(this.spaceKey?.isDown);
    const liftAccel = lifting ? -540 * kiteDef.liftBonus : 430;
    this.kiteVy = Phaser.Math.Clamp(this.kiteVy + liftAccel * dt, -270, 260);
    this.kiteY = Phaser.Math.Clamp(this.kiteY + this.kiteVy * dt, 226, h - 92);

    this.kiteNode.setY(this.kiteY);
    this.kiteNode.setRotation(Phaser.Math.Clamp(this.kiteVy * 0.0018, -0.45, 0.45));

    // Draw flowing kite string from bottom-left ground anchor to kite
    this.stringGfx.clear();
    this.stringGfx.lineStyle(1.6, 0xfef3c7, 0.72);
    this.stringGfx.beginPath();
    this.stringGfx.moveTo(22, h - 18);
    const midX = (22 + this.kiteNode.x) * 0.5;
    const midY = (h - 18 + this.kiteY) * 0.5 + 24 + Math.sin(time / 220) * 8;
    this.stringGfx.lineTo(midX, midY);
    this.stringGfx.lineTo(this.kiteNode.x - 10, this.kiteY + 4);
    this.stringGfx.strokePath();

    // Parallax scroll + Wind speed
    const speed = 225;
    this.scrollX += speed * dt;
    this.drawParallaxHorizon(w, h);

    // Track altitude & play authentic resonant Khleng Ek bamboo-reed wind hum at high skies!
    const altPct = Phaser.Math.Clamp(1 - (this.kiteY - 226) / Math.max(120, h - 318), 0, 1);
    const altM = Math.round(25 + altPct * 275);
    if (altM > this.maxAltitudeM) this.maxAltitudeM = altM;
    if (altPct > 0.52 && time - this.lastHumAt > 1450) {
      this.lastHumAt = time;
      soundManager.playKhlengEkHum(altPct);
    }

    // Spawn Wind Chime Rings & Storm Clouds
    if (time - this.lastRingSpawnAt > 1150) {
      this.lastRingSpawnAt = time;
      this.spawnWindRing();
    }
    if (time - this.lastCloudSpawnAt > 1950) {
      this.lastCloudSpawnAt = time;
      this.spawnStormCloud();
    }

    // Update Wind Rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.x -= speed * dt;
      r.node.setX(r.x);
      if (!r.collected && Phaser.Math.Distance.Between(this.kiteNode.x, this.kiteY, r.x, r.y) < 38) {
        r.collected = true;
        this.ringsCollected += 1;
        const pts = Math.round(50 * kiteDef.scoreMult);
        this.score += pts;
        soundManager.playSfx('coin');
        vfxManager.playSpriteVfx(this, 'vfx_sparkle_blue', r.x, r.y, { scale: 1.5, tint: 0xfacc15, additive: true, depth: 30 });
        vfxManager.spawnFloatingText(this, r.x, r.y - 12, `+${pts} ✨`, '#fde047', '15px', { depth: 40 });
        r.node.destroy();
        this.rings.splice(i, 1);
        continue;
      }
      if (r.x < -60) {
        r.node.destroy();
        this.rings.splice(i, 1);
      }
    }

    // Update Storm Clouds
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cl = this.clouds[i];
      cl.x -= speed * 1.12 * dt;
      cl.node.setX(cl.x);
      if (!cl.hit && Phaser.Math.Distance.Between(this.kiteNode.x, this.kiteY, cl.x, cl.y) < cl.radius + 18) {
        cl.hit = true;
        this.hearts -= 1;
        soundManager.playSfx('hit');
        vfxManager.playSpriteVfx(this, 'vfx_lightning_burst', cl.x, cl.y, { scale: 1.5, additive: true, depth: 32 });
        this.cameras.main.shake(140, 0.009);
        cl.node.destroy();
        this.clouds.splice(i, 1);
        if (this.hearts <= 0) {
          this.finishFlight(false);
          return;
        }
        continue;
      }
      if (cl.x < -80) {
        cl.node.destroy();
        this.clouds.splice(i, 1);
      }
    }

    this.hudText.setText(
      `🪁 ${altM}m Altitude  ·  ✨ Rings: ${this.ringsCollected}  ·  🏆 ${this.score} pts  ·  ${'❤️'.repeat(this.hearts)}  ·  ⏱ ${Math.ceil(this.timeLeft)}s`
    );
  }

  private finishFlight(completedTimer: boolean): void {
    if (this.finished) return;
    this.finished = true;

    const coinsEarned = Math.max(40, Math.round(this.score * 0.45 + this.ringsCollected * 18 + (completedTimer ? 90 : 0)));
    const foragingXp = Math.max(15, this.ringsCollected * 14 + (completedTimer ? 30 : 10));
    const unlockedFloatingKite = this.ringsCollected >= 3 || this.maxAltitudeM >= 180 || completedTimer;

    soundManager.playSfx(completedTimer ? 'victory' : 'coin');
    EventBus.emit('kite:completed', {
      kiteId: this.kiteId,
      score: this.score,
      ringsCollected: this.ringsCollected,
      maxAltitudeM: this.maxAltitudeM,
      coinsEarned,
      foragingXp,
      unlockedFloatingKite,
    });

    this.cameras.main.fadeOut(240, 12, 16, 26);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId: this.returnMapId,
        spawnX: this.returnX,
        spawnY: this.returnY,
        playerState: { ...this.playerState, zone: 'overworld', currentMapId: this.returnMapId },
      });
    });
  }
}
