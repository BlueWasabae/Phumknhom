import Phaser from 'phaser';

export type VfxQualityMode = 'high' | 'performance';

const VFX_STORAGE_KEY = 'phum_khnhom_vfx_quality_v1';

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

/**
 * Update 1.7 — Global WebGL Bloom, PostFX & Combat Juice Manager.
 * Safely applies Phaser 3.87 native WebGL `postFX.addBloom` / `postFX.addGlow`
 * when `VFX Quality === 'high'` and provides a zero-overhead fallback in `'performance'` mode.
 */
class GlobalVFXManager {
  private quality: VfxQualityMode = 'high';
  private listeners = new Set<(mode: VfxQualityMode) => void>();
  private activeHitStopTimers = new WeakMap<Phaser.Scene, number>();
  private hitStopUntil = new WeakMap<Phaser.Scene, number>();
  private softwareWebGLCache = new WeakMap<Phaser.Game, boolean>();

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(VFX_STORAGE_KEY);
        if (saved === 'performance' || saved === 'high') {
          this.quality = saved;
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

  public setQuality(mode: VfxQualityMode): void {
    if (this.quality === mode) return;
    this.quality = mode;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(VFX_STORAGE_KEY, mode);
      } catch {
        // Ignore storage write errors
      }
    }
    this.listeners.forEach((fn) => fn(mode));
  }

  public subscribe(fn: (mode: VfxQualityMode) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
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
    scene.cameras.main.shake(durationMs, new Phaser.Math.Vector2(Math.abs(dirX) * intensity * scale || intensity * scale * 0.5, Math.abs(dirY) * intensity * scale || intensity * scale * 0.5));
  }

  /**
   * Crisp 45ms heavy hit-stop impact freeze frame (deduplicated & failsafe across multi-hit waves).
   */
  public hitStop(scene: Phaser.Scene, durationMs = 45): void {
    if (!scene?.physics?.world) return;
    const fps = scene.game?.loop?.actualFps ?? 60;
    if (fps < 20) return;
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
   * Additive glowing spark burst particles (scaled smoothly in Performance mode).
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
    const actualCount = this.quality === 'performance' ? Math.max(4, Math.floor(count * 0.45)) : count;
    for (let i = 0; i < actualCount; i++) {
      const ang = (Math.PI * 2 * i) / actualCount + (Math.random() - 0.5) * 0.35;
      const dist = radius * (0.45 + Math.random() * 0.65);
      const spark = scene.add
        .circle(x, y, 2.5 + Math.random() * 2.5, color, 0.95)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(depth);
      scene.tweens.add({
        targets: spark,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        scale: 0.2,
        alpha: 0,
        duration: 240 + Math.random() * 180,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
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
   * Golden vertical Level-Up Light Pillar with rising glowing motes.
   */
  public playLevelUpLightPillar(scene: Phaser.Scene, x: number, y: number, depth = 2200): void {
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

    this.radialShockwave(scene, x, y, 0xfacc15, 78, 520, depth + 2);
    this.additiveSparkBurst(scene, x, y - 24, 0xfef08a, 14, 72, depth + 3);
  }
}

export const vfxManager = new GlobalVFXManager();
