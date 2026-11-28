import Phaser from 'phaser';
import { EventBus } from '../EventBus';

export type VfxQualityMode = 'high' | 'performance';

const VFX_STORAGE_KEY = 'phum_khnhom_vfx_quality_v1';
const SHOW_FPS_STORAGE_KEY = 'phum_khnhom_show_fps_v1';

const MAX_TEXT_POOL_PER_SCENE = 44;
const MAX_SPARK_POOL_PER_SCENE = 96;

interface PostFXCapable {
  postFX?: {
    addBloom?: (
      color?: number,
      offsetX?: number,
      offsetY?: number,
      blurStrength?: number,
      strength?: number,
      steps?: number
    ) => unknown;
    addGlow?: (
      color?: number,
      outerStrength?: number,
      innerStrength?: number,
      knockout?: boolean,
      quality?: number,
      distance?: number
    ) => unknown;
    clear?: () => void;
  };
}

interface PooledTextItem {
  node: Phaser.GameObjects.Text;
  inUse: boolean;
  tween: Phaser.Tweens.Tween | null;
}

interface PooledSparkItem {
  node: Phaser.GameObjects.Arc;
  inUse: boolean;
  tween: Phaser.Tweens.Tween | null;
}

export interface FpsSnapshot {
  fps: number;
  showFps: boolean;
  quality: VfxQualityMode;
  autoDowngraded: boolean;
}

/**
 * Update 1.7 + 1.9 — Global WebGL Bloom, Object-Pooled VFX & Auto-FPS Guard.
 * - Native Phaser 3.87 WebGL `postFX.addBloom` / `postFX.addGlow` in High mode
 * - Zero-GC Object Pooling for floating damage/XP popups and additive spark particles
 * - Auto-FPS Guard: drops VFX Quality to `performance` if rolling FPS < 40 for 3 seconds
 * - Clean per-scene pool/timer teardown via `cleanupScene(scene)` on `SHUTDOWN`
 */
class GlobalVFXManager {
  private quality: VfxQualityMode = 'high';
  private showFps = false;
  private currentFps = 60;
  private autoDowngraded = false;

  private listeners = new Set<(mode: VfxQualityMode) => void>();
  private fpsListeners = new Set<(snap: FpsSnapshot) => void>();

  private activeHitStopTimers = new WeakMap<Phaser.Scene, number>();
  private hitStopUntil = new WeakMap<Phaser.Scene, number>();
  private softwareWebGLCache = new WeakMap<Phaser.Game, boolean>();

  // Per-scene Object Pools (auto-cleared on SHUTDOWN)
  private textPools = new WeakMap<Phaser.Scene, PooledTextItem[]>();
  private sparkPools = new WeakMap<Phaser.Scene, PooledSparkItem[]>();
  private sceneCleanupBound = new WeakSet<Phaser.Scene>();

  // Auto-FPS Guard rolling sampler
  private sampleFrames = 0;
  private sampleElapsedMs = 0;
  private lowFpsAccumMs = 0;
  private lastBroadcastAt = 0;

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(VFX_STORAGE_KEY);
        if (saved === 'performance' || saved === 'high') {
          this.quality = saved;
        }
        const savedFps = window.localStorage.getItem(SHOW_FPS_STORAGE_KEY);
        if (savedFps === '1' || savedFps === 'true') {
          this.showFps = true;
        }
      } catch {
        // Ignore storage read errors
      }
    }
  }

  public getQuality(): VfxQualityMode {
    return this.quality;
  }

  public isBloomEnabled(): boolean {
    return this.quality === 'high';
  }

  public setQuality(mode: VfxQualityMode, fromAutoGuard = false): void {
    if (this.quality === mode) return;
    this.quality = mode;
    if (!fromAutoGuard) {
      this.autoDowngraded = false;
      this.lowFpsAccumMs = 0;
    } else {
      this.autoDowngraded = true;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(VFX_STORAGE_KEY, mode);
      } catch {
        // Ignore storage write errors
      }
    }
    this.listeners.forEach((fn) => fn(mode));
    this.emitFpsSnapshot();
  }

  public subscribe(fn: (mode: VfxQualityMode) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  public getShowFps(): boolean {
    return this.showFps;
  }

  public setShowFps(enabled: boolean): void {
    this.showFps = enabled;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(SHOW_FPS_STORAGE_KEY, enabled ? '1' : '0');
      } catch {
        // Ignore storage write errors
      }
    }
    this.emitFpsSnapshot();
  }

  public getFpsSnapshot(): FpsSnapshot {
    return {
      fps: this.currentFps,
      showFps: this.showFps,
      quality: this.quality,
      autoDowngraded: this.autoDowngraded,
    };
  }

  public subscribeFps(fn: (snap: FpsSnapshot) => void): () => void {
    this.fpsListeners.add(fn);
    fn(this.getFpsSnapshot());
    return () => {
      this.fpsListeners.delete(fn);
    };
  }

  private emitFpsSnapshot(): void {
    const snap = this.getFpsSnapshot();
    this.fpsListeners.forEach((fn) => fn(snap));
  }

  /**
   * Call once per frame from active scenes (`update(time, delta)`).
   * Tracks rolling FPS and automatically downgrades VFX Quality to `'performance'`
   * if average FPS stays below 40 for 3 continuous seconds while the tab is visible.
   */
  public tickPerformanceMonitor(scene: Phaser.Scene, deltaMs: number): void {
    if (typeof document !== 'undefined' && document.hidden) {
      this.sampleFrames = 0;
      this.sampleElapsedMs = 0;
      this.lowFpsAccumMs = 0;
      return;
    }
    const clampedDelta = Math.max(1, Math.min(250, deltaMs || 16.67));
    this.sampleFrames += 1;
    this.sampleElapsedMs += clampedDelta;

    if (this.sampleElapsedMs >= 500) {
      const measured = Math.round((this.sampleFrames * 1000) / this.sampleElapsedMs);
      const actual = scene?.game?.loop?.actualFps;
      this.currentFps =
        actual && Number.isFinite(actual) && actual > 0
          ? Math.min(144, Math.round((measured + actual) * 0.5))
          : Math.min(144, measured);

      if (this.quality === 'high' && this.currentFps > 0 && this.currentFps < 40) {
        this.lowFpsAccumMs += this.sampleElapsedMs;
        if (this.lowFpsAccumMs >= 3000) {
          this.lowFpsAccumMs = 0;
          this.setQuality('performance', true);
          EventBus.emit('ui:toast', {
            text: '⚡ Auto-FPS Guard: Switched VFX Quality to Performance Mode for smooth 60 FPS!',
          });
        }
      } else {
        this.lowFpsAccumMs = Math.max(0, this.lowFpsAccumMs - this.sampleElapsedMs);
      }

      this.sampleFrames = 0;
      this.sampleElapsedMs = 0;

      const now = performance.now();
      if (now - this.lastBroadcastAt >= 480) {
        this.lastBroadcastAt = now;
        this.emitFpsSnapshot();
      }
    }
  }

  private bindSceneCleanup(scene: Phaser.Scene): void {
    if (this.sceneCleanupBound.has(scene)) return;
    this.sceneCleanupBound.add(scene);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupScene(scene);
    });
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.cleanupScene(scene);
    });
  }

  /**
   * Cleanly destroys scene-local object pools and cancels any pending hit-stop timers
   * so memory stays flat across long play sessions and scene transitions.
   */
  public cleanupScene(scene: Phaser.Scene): void {
    const prevTimer = this.activeHitStopTimers.get(scene);
    if (prevTimer) {
      window.clearTimeout(prevTimer);
      this.activeHitStopTimers.delete(scene);
    }
    this.hitStopUntil.delete(scene);
    try {
      if (scene?.physics?.world?.isPaused) {
        scene.physics.world.resume();
      }
    } catch {
      // Scene already torn down
    }

    const texts = this.textPools.get(scene);
    if (texts) {
      for (const item of texts) {
        item.tween?.stop();
        item.tween = null;
        if (item.node?.scene) item.node.destroy();
      }
      this.textPools.delete(scene);
    }

    const sparks = this.sparkPools.get(scene);
    if (sparks) {
      for (const item of sparks) {
        item.tween?.stop();
        item.tween = null;
        if (item.node?.scene) item.node.destroy();
      }
      this.sparkPools.delete(scene);
    }
  }

  /**
   * Object-Pooled floating damage / XP / loot text popup.
   * Reuses Phaser Text objects across heavy combat waves to prevent GC stutters.
   */
  public spawnFloatingText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    color = '#fde047',
    fontSize = '15px',
    opts?: {
      riseY?: number;
      durationMs?: number;
      depth?: number;
      scale?: number;
    }
  ): void {
    if (!scene?.add || !scene.tweens) return;
    this.bindSceneCleanup(scene);

    let pool = this.textPools.get(scene);
    if (!pool) {
      pool = [];
      this.textPools.set(scene, pool);
    }

    let slot = pool.find((entry) => !entry.inUse && entry.node?.scene);
    if (!slot) {
      if (pool.length < MAX_TEXT_POOL_PER_SCENE) {
        const node = scene.add
          .text(x, y, text, {
            fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
            fontSize,
            fontStyle: 'bold',
            color,
            stroke: '#1e1b4b',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setResolution(2)
          .setVisible(false);
        slot = { node, inUse: false, tween: null };
        pool.push(slot);
      } else {
        // Recycle oldest active slot cleanly when saturated
        slot = pool.shift()!;
        slot.tween?.stop();
        slot.tween = null;
        pool.push(slot);
      }
    }

    if (!slot.node?.scene) {
      slot.node = scene.add
        .text(x, y, text, {
          fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
          fontSize,
          fontStyle: 'bold',
          color,
          stroke: '#1e1b4b',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setResolution(2);
    }

    slot.inUse = true;
    const baseScale = opts?.scale ?? 1;
    const depth = opts?.depth ?? 2500;
    const riseY = opts?.riseY ?? 38;
    const durationMs = opts?.durationMs ?? 760;

    slot.node
      .setPosition(x, y)
      .setText(text)
      .setColor(color)
      .setFontSize(fontSize)
      .setAlpha(1)
      .setScale(baseScale)
      .setDepth(depth)
      .setVisible(true);

    slot.tween?.stop();
    const targetSlot = slot;
    targetSlot.tween = scene.tweens.add({
      targets: targetSlot.node,
      y: y - riseY,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        targetSlot.inUse = false;
        targetSlot.tween = null;
        if (targetSlot.node?.scene) {
          targetSlot.node.setVisible(false);
        }
      },
    });
  }

  private isSoftwareWebGL(scene: Phaser.Scene): boolean {
    const game = scene?.game;
    if (!game) return true;
    const cached = this.softwareWebGLCache.get(game);
    if (cached !== undefined) return cached;

    let isSoft = false;
    try {
      const renderer = game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
      const gl = renderer?.gl;
      if (gl) {
        let gpuName = String(gl.getParameter(gl.RENDERER) ?? '');
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          const unmasked = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
          if (unmasked) gpuName += ` ${String(unmasked)}`;
        }
        isSoft = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpuName);
      }
    } catch {
      isSoft = false;
    }
    this.softwareWebGLCache.set(game, isSoft);
    return isSoft;
  }

  private canUseWebGLPostFX(scene: Phaser.Scene, target: unknown): target is PostFXCapable {
    if (!this.isBloomEnabled()) return false;
    if (!scene?.game || scene.game.renderer.type !== Phaser.WEBGL) return false;
    if (this.isSoftwareWebGL(scene)) return false;
    const fps = scene.game.loop?.actualFps ?? 60;
    if (fps > 0 && fps < 28) return false;
    if (!target || typeof target !== 'object') return false;
    const fx = (target as PostFXCapable).postFX;
    return Boolean(fx && (typeof fx.addBloom === 'function' || typeof fx.addGlow === 'function'));
  }

  /**
   * Subtle warm WebGL Bloom PostFX for portals, projectiles, campfires, Shimmer Spring & skills.
   */
  public applyBloom(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    opts?: { color?: number; offsetX?: number; offsetY?: number; blurStrength?: number; strength?: number; steps?: number }
  ): void {
    if (!this.canUseWebGLPostFX(scene, target)) return;
    try {
      target.postFX?.addBloom?.(
        opts?.color ?? 0xffffff,
        opts?.offsetX ?? 1,
        opts?.offsetY ?? 1,
        opts?.blurStrength ?? 1.0,
        opts?.strength ?? 1.25,
        opts?.steps ?? 2
      );
    } catch {
      // Never crash on software WebGL edge cases
    }
  }

  /**
   * Crisp outer WebGL Glow PostFX keeping pixel-art edges legible while lighting up magic/auras.
   */
  public applyGlow(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    color = 0xfacc15,
    outerStrength = 3.0,
    innerStrength = 0.35
  ): void {
    if (!this.canUseWebGLPostFX(scene, target)) return;
    try {
      target.postFX?.addGlow?.(color, outerStrength, innerStrength, false, 0.1, 6);
    } catch {
      // Ignore software WebGL edge cases
    }
  }

  /**
   * Directional camera shake with subtle kickback feel.
   */
  public directionalShake(
    scene: Phaser.Scene,
    dirX: number,
    dirY: number,
    intensity = 0.008,
    durationMs = 150
  ): void {
    if (!scene?.cameras?.main) return;
    const scale = this.quality === 'performance' ? 0.7 : 1;
    scene.cameras.main.shake(
      durationMs,
      new Phaser.Math.Vector2(
        Math.abs(dirX) * intensity * scale || intensity * scale * 0.5,
        Math.abs(dirY) * intensity * scale || intensity * scale * 0.5
      )
    );
  }

  /**
   * Crisp 45ms heavy hit-stop impact freeze frame (deduplicated & failsafe across multi-hit waves).
   */
  public hitStop(scene: Phaser.Scene, durationMs = 45): void {
    if (!scene?.physics?.world) return;
    const fps = scene.game?.loop?.actualFps ?? 60;
    if (fps < 20) return;
    this.bindSceneCleanup(scene);
    const clampedMs = Math.min(Math.max(durationMs, 15), 75);
    const prevTimer = this.activeHitStopTimers.get(scene);
    if (prevTimer) window.clearTimeout(prevTimer);

    this.hitStopUntil.set(scene, Date.now() + clampedMs);
    scene.physics.world.pause();
    const timer = window.setTimeout(() => {
      try {
        if (scene?.physics?.world) {
          scene.physics.world.resume();
        }
      } finally {
        this.activeHitStopTimers.delete(scene);
        this.hitStopUntil.delete(scene);
      }
    }, clampedMs);
    this.activeHitStopTimers.set(scene, timer);
  }

  /**
   * Frame-loop failsafe: guarantees Arcade Physics can never remain stuck paused past hit-stop window.
   */
  public ensurePhysicsResumed(scene: Phaser.Scene): void {
    if (!scene?.physics?.world?.isPaused) return;
    const until = this.hitStopUntil.get(scene);
    if (!until || Date.now() >= until + 25) {
      scene.physics.world.resume();
      this.hitStopUntil.delete(scene);
      const prevTimer = this.activeHitStopTimers.get(scene);
      if (prevTimer) {
        window.clearTimeout(prevTimer);
        this.activeHitStopTimers.delete(scene);
      }
    }
  }

  /**
   * Expanding glowing radial shockwave ring.
   */
  public radialShockwave(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color = 0xfacc15,
    maxRadius = 110,
    durationMs = 340,
    depth = 70
  ): void {
    if (!scene?.add || !scene.tweens) return;
    const ring = scene.add
      .circle(x, y, 16, color, 0.14)
      .setStrokeStyle(4, color, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth);
    this.applyGlow(scene, ring, color, 3.6, 0.5);

    const endScale = Math.max(1.5, maxRadius / 16);
    scene.tweens.add({
      targets: ring,
      scale: endScale,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Object-Pooled additive glowing spark burst particles (scaled smoothly in Performance mode).
   */
  public additiveSparkBurst(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color = 0xfef08a,
    count = 14,
    radius = 64,
    depth = 72
  ): void {
    if (!scene?.add || !scene.tweens) return;
    this.bindSceneCleanup(scene);

    let pool = this.sparkPools.get(scene);
    if (!pool) {
      pool = [];
      this.sparkPools.set(scene, pool);
    }

    const actualCount = this.quality === 'performance' ? Math.max(4, Math.floor(count * 0.45)) : count;
    for (let i = 0; i < actualCount; i++) {
      const ang = (Math.PI * 2 * i) / actualCount + (Math.random() - 0.5) * 0.35;
      const dist = radius * (0.45 + Math.random() * 0.65);

      let slot = pool.find((entry) => !entry.inUse && entry.node?.scene);
      if (!slot) {
        if (pool.length < MAX_SPARK_POOL_PER_SCENE) {
          const node = scene.add
            .circle(x, y, 3.5, color, 0.95)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setVisible(false);
          slot = { node, inUse: false, tween: null };
          pool.push(slot);
        } else {
          slot = pool.shift()!;
          slot.tween?.stop();
          slot.tween = null;
          pool.push(slot);
        }
      }

      if (!slot.node?.scene) {
        slot.node = scene.add
          .circle(x, y, 3.5, color, 0.95)
          .setBlendMode(Phaser.BlendModes.ADD);
      }

      slot.inUse = true;
      const startScale = 0.72 + Math.random() * 0.7;
      slot.node
        .setPosition(x, y)
        .setFillStyle(color, 0.95)
        .setScale(startScale)
        .setAlpha(0.95)
        .setDepth(depth)
        .setVisible(true);

      slot.tween?.stop();
      const targetSlot = slot;
      targetSlot.tween = scene.tweens.add({
        targets: targetSlot.node,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        scale: 0.16,
        alpha: 0,
        duration: 240 + Math.random() * 170,
        ease: 'Quad.easeOut',
        onComplete: () => {
          targetSlot.inUse = false;
          targetSlot.tween = null;
          if (targetSlot.node?.scene) {
            targetSlot.node.setVisible(false);
          }
        },
      });
    }
  }

  /**
   * Glowing translucent dash afterimage clone silhouette.
   */
  public spawnAfterimage(
    scene: Phaser.Scene,
    x: number,
    y: number,
    tint = 0xa855f7,
    scale = 1,
    durationMs = 300,
    depth = 52
  ): void {
    if (!scene?.add || !scene.tweens) return;
    const ghost = scene.add.container(x, y).setDepth(depth).setAlpha(0.75);
    const body = scene.add
      .ellipse(0, -10, 20 * scale, 32 * scale, tint, 0.65)
      .setBlendMode(Phaser.BlendModes.ADD);
    const head = scene.add
      .circle(0, -28 * scale, 10 * scale, tint, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD);
    ghost.add([body, head]);
    this.applyGlow(scene, ghost, tint, 3.2, 0.5);

    scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: 0.86,
      scaleY: 1.08,
      duration: durationMs,
      onComplete: () => ghost.destroy(),
    });
  }

  /**
   * Plays a preloaded multi-frame pixel-art VFX spritesheet animation at `(x, y)`
   * and auto-destroys on completion (zero leaks, graceful no-op if anim not yet ready).
   */
  public playSpriteVfx(
    scene: Phaser.Scene,
    animKey: string,
    x: number,
    y: number,
    opts?: {
      scale?: number;
      tint?: number;
      rotation?: number;
      flipX?: boolean;
      flipY?: boolean;
      alpha?: number;
      additive?: boolean;
      depth?: number;
      glowColor?: number;
      originY?: number;
    }
  ): Phaser.GameObjects.Sprite | null {
    if (!scene?.add || !scene.anims || !scene.anims.exists(animKey)) return null;
    const anim = scene.anims.get(animKey);
    const firstTexKey = anim?.frames?.[0]?.textureKey;
    if (!firstTexKey || !scene.textures.exists(firstTexKey)) return null;

    const spr = scene.add
      .sprite(x, y, firstTexKey, 0)
      .setOrigin(0.5, opts?.originY ?? 0.5)
      .setScale(opts?.scale ?? 1.5)
      .setRotation(opts?.rotation ?? 0)
      .setFlipX(Boolean(opts?.flipX))
      .setFlipY(Boolean(opts?.flipY))
      .setAlpha(opts?.alpha ?? 1)
      .setDepth(opts?.depth ?? 74);

    if (opts?.tint !== undefined) spr.setTint(opts.tint);
    if (opts?.additive) spr.setBlendMode(Phaser.BlendModes.ADD);
    if (opts?.glowColor !== undefined) {
      this.applyGlow(scene, spr, opts.glowColor, 2.6, 0.35);
    }

    spr.play(animKey);
    spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (spr.active) spr.destroy();
    });
    return spr;
  }

  /** Animated Healing / Blessing Lotus Spell burst */
  public playHealSpellVfx(scene: Phaser.Scene, x: number, y: number, depth = 78): void {
    this.playSpriteVfx(scene, 'vfx_spell_heal', x, y - 16, {
      scale: 1.35,
      tint: 0x4ade80,
      additive: true,
      depth,
      glowColor: 0x22c55e,
    });
  }

  /** Animated Golden Coin Jackpot Fountain (Deliveries, Trade Profits, Chests, Wheel) */
  public playCoinJackpotVfx(scene: Phaser.Scene, x: number, y: number, depth = 82): void {
    this.playSpriteVfx(scene, 'vfx_coin_burst', x, y - 18, {
      scale: 1.45,
      depth,
      glowColor: 0xfacc15,
    });
  }

  /** Animated Music Notes Burst (Khmer Instrument Jamming & Dance Emotes) */
  public playMusicBurstVfx(scene: Phaser.Scene, x: number, y: number, depth = 82): void {
    this.playSpriteVfx(scene, 'vfx_music_burst', x, y - 24, {
      scale: 1.2,
      depth,
    });
  }

  /** Animated Heart Burst (Pet Evolution, Feeding, Friendly XP & Social Emotes) */
  public playHeartBurstVfx(scene: Phaser.Scene, x: number, y: number, depth = 82): void {
    this.playSpriteVfx(scene, 'vfx_heart_burst', x, y - 22, {
      scale: 1.25,
      depth,
    });
  }

  /**
   * Golden vertical Level-Up Light Pillar with rising glowing motes & hand-pixeled Magic Burst.
   */
  public playLevelUpLightPillar(scene: Phaser.Scene, x: number, y: number, depth = 2200): void {
    if (!scene?.add || !scene.tweens) return;
    const pillar = scene.add
      .rectangle(x, y - 140, 44, 320, 0xfef08a, 0.52)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth);
    const core = scene.add
      .rectangle(x, y - 140, 16, 320, 0xffffff, 0.78)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth + 1);
    this.applyBloom(scene, pillar, { color: 0xfacc15, strength: 1.6 });

    scene.tweens.add({
      targets: [pillar, core],
      scaleX: 0.1,
      alpha: 0,
      duration: 780,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        pillar.destroy();
        core.destroy();
      },
    });

    this.playSpriteVfx(scene, 'vfx_round_light_burst', x, y - 24, {
      scale: 1.8,
      additive: true,
      depth: depth + 2,
      glowColor: 0xfacc15,
    });
    this.playSpriteVfx(scene, 'vfx_spell_attack_up', x, y - 16, {
      scale: 1.45,
      tint: 0xfef08a,
      additive: true,
      depth: depth + 3,
    });
    this.radialShockwave(scene, x, y, 0xfacc15, 78, 520, depth + 2);
    this.additiveSparkBurst(scene, x, y - 24, 0xfef08a, 14, 72, depth + 3);
  }
}

export const vfxManager = new GlobalVFXManager();
