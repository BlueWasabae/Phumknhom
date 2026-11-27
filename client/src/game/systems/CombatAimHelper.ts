import Phaser from 'phaser';

export const MAX_INTERACT_DISTANCE = 115;
export const MAX_FISHING_DISTANCE = 110;
export const MAX_GRAPPLE_RANGE = 340;
export const GRAPPLE_PULL_SPEED = 520;
export const GRAPPLE_MAX_DURATION_MS = 520;

export interface GrapplePlatformRect {
  x: number;
  y: number;
  w: number;
  h?: number;
}

export interface GrappleTargetResult {
  x: number;
  y: number;
  angle: number;
  hitKind: 'platform' | 'boss' | 'wall' | 'vine';
}

/**
 * Enforces strict interaction distance (`<= maxDist`, default 115px).
 * Returns true if within range; otherwise spawns a floating `"🚶 Move closer"` prompt and returns false.
 */
export function enforceInteractRange(
  scene: Phaser.Scene,
  playerX: number,
  playerY: number,
  targetX: number,
  targetY: number,
  maxDist = MAX_INTERACT_DISTANCE,
  message = '🚶 Move closer'
): boolean {
  const dist = Phaser.Math.Distance.Between(playerX, playerY, targetX, targetY);
  if (dist <= maxDist) return true;
  const zoom = scene.cameras?.main?.zoom ?? 1;
  const txt = scene.add
    .text(targetX, targetY - 18, message, {
      fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#fef08a',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      stroke: '#0f172a',
      strokeThickness: 3,
      padding: { x: 6, y: 2 },
    })
    .setResolution(2)
    .setScale(zoom > 1.5 ? 0.55 : 1)
    .setOrigin(0.5, 1)
    .setDepth(3200);
  scene.tweens.add({
    targets: txt,
    y: targetY - 38,
    alpha: 0,
    duration: 900,
    ease: 'Cubic.easeOut',
    onComplete: () => txt.destroy(),
  });
  return false;
}

/**
 * Computes exact 360° world-space aiming angle from origin `(ox, oy)` toward the active mouse pointer.
 * Falls back cleanly to horizontal facing direction on mobile touch controls when pointer is uninitialized.
 */
export function getCursorAimAngle(
  scene: Phaser.Scene,
  originX: number,
  originY: number,
  fallbackDir: number,
  overrideTarget?: { x: number; y: number }
): { angle: number; targetX: number; targetY: number; dir: number } {
  if (overrideTarget) {
    const angle = Phaser.Math.Angle.Between(originX, originY, overrideTarget.x, overrideTarget.y);
    const dir = Math.cos(angle) < 0 ? -1 : 1;
    return { angle, targetX: overrideTarget.x, targetY: overrideTarget.y, dir };
  }
  const ptr = scene.input?.activePointer;
  if (ptr && (ptr.x !== 0 || ptr.y !== 0)) {
    const cam = scene.cameras?.main;
    const worldPt = cam ? cam.getWorldPoint(ptr.x, ptr.y) : { x: ptr.worldX, y: ptr.worldY };
    const wx = Number.isFinite(worldPt.x) ? worldPt.x : ptr.worldX;
    const wy = Number.isFinite(worldPt.y) ? worldPt.y : ptr.worldY;
    if (Number.isFinite(wx) && Number.isFinite(wy) && Phaser.Math.Distance.Between(originX, originY, wx, wy) > 4) {
      const angle = Phaser.Math.Angle.Between(originX, originY, wx, wy);
      const dir = wx < originX ? -1 : 1;
      return { angle, targetX: wx, targetY: wy, dir };
    }
  }
  const dir = fallbackDir < 0 ? -1 : 1;
  const angle = dir < 0 ? Math.PI : 0;
  return { angle, targetX: originX + dir * 200, targetY: originY, dir };
}

/**
 * Ray-marches a Bamboo Vine Grapple hook strictly along the mouse cursor's `aimAngle` (up to `MAX_GRAPPLE_RANGE = 340px`).
 * Latches onto any platform, arena wall/ceiling, or boss body — and if fired into open cavern air,
 * anchors cleanly at the cursor ray tip (clamped inside arena bounds) so `Q` ALWAYS feels crisp and responsive!
 */
export function resolveCursorGrappleAnchor(opts: {
  originX: number;
  originY: number;
  aimAngle: number;
  arenaW: number;
  floorY: number;
  ceilingY?: number;
  platforms: GrapplePlatformRect[];
  bossRect?: Phaser.Geom.Rectangle | null;
  maxRange?: number;
}): GrappleTargetResult {
  const {
    originX,
    originY,
    aimAngle,
    arenaW,
    floorY,
    ceilingY = 72,
    platforms,
    bossRect,
    maxRange = MAX_GRAPPLE_RANGE,
  } = opts;

  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  const step = 12;

  for (let d = 44; d <= maxRange; d += step) {
    const rx = originX + cosA * d;
    const ry = originY + sinA * d;

    // Wall or ceiling latch
    if (rx <= 36 || rx >= arenaW - 36 || ry <= ceilingY) {
      return {
        x: Phaser.Math.Clamp(rx, 42, arenaW - 42),
        y: Phaser.Math.Clamp(ry, ceilingY, floorY - 28),
        angle: aimAngle,
        hitKind: 'wall',
      };
    }

    // Boss latch (pull player right toward the boss for aerial combos!)
    if (bossRect && Phaser.Geom.Rectangle.Contains(bossRect, rx, ry)) {
      return {
        x: Phaser.Math.Clamp(rx - cosA * 24, 48, arenaW - 48),
        y: Phaser.Math.Clamp(ry - 16, ceilingY, floorY - 32),
        angle: aimAngle,
        hitKind: 'boss',
      };
    }

    // Platform latch (generous 22px snap band so aiming near a ledge hooks cleanly on top of it)
    for (const p of platforms) {
      const halfW = p.w / 2 + 12;
      const halfH = (p.h ?? 22) / 2 + 14;
      if (rx >= p.x - halfW && rx <= p.x + halfW && ry >= p.y - halfH && ry <= p.y + halfH) {
        return {
          x: Phaser.Math.Clamp(rx, p.x - p.w / 2 + 18, p.x + p.w / 2 - 18),
          y: Math.max(ceilingY, p.y - 26),
          angle: aimAngle,
          hitKind: 'platform',
        };
      }
    }
  }

  // Open-air bamboo canopy latch along the exact cursor ray (up to maxRange, never into the floor)
  const fallbackDist = Math.min(maxRange, 285);
  const fx = Phaser.Math.Clamp(originX + cosA * fallbackDist, 44, arenaW - 44);
  const fy = Phaser.Math.Clamp(originY + sinA * fallbackDist, ceilingY, floorY - 34);
  return {
    x: fx,
    y: fy,
    angle: aimAngle,
    hitKind: 'vine',
  };
}

/**
 * Draws an animated segmented green Bamboo Vine tether + golden lotus hook knot and spawns fluttering leaf particles.
 */
export function drawBambooVineTether(
  scene: Phaser.Scene,
  gfx: Phaser.GameObjects.Graphics,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  time: number,
  spawnLeaves = false
): void {
  gfx.clear();
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / dist;
  const ny = dx / dist;

  // Outer deep-emerald bamboo stalk
  gfx.lineStyle(5, 0x14532d, 0.96);
  gfx.beginPath();
  gfx.moveTo(fromX, fromY);
  const segs = Math.max(4, Math.min(12, Math.floor(dist / 28)));
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const wave = Math.sin(t * Math.PI * 3 + time * 0.02) * 3.5 * Math.sin(t * Math.PI);
    gfx.lineTo(fromX + dx * t + nx * wave, fromY + dy * t + ny * wave);
  }
  gfx.lineTo(toX, toY);
  gfx.strokePath();

  // Bright bamboo highlight core
  gfx.lineStyle(2.2, 0x4ade80, 1);
  gfx.beginPath();
  gfx.moveTo(fromX, fromY);
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const wave = Math.sin(t * Math.PI * 3 + time * 0.02) * 3.5 * Math.sin(t * Math.PI);
    gfx.lineTo(fromX + dx * t + nx * wave, fromY + dy * t + ny * wave);
  }
  gfx.lineTo(toX, toY);
  gfx.strokePath();

  // Bamboo node joints & lotus hook tip
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    gfx.fillStyle(0xbef264, 0.95);
    gfx.fillCircle(fromX + dx * t, fromY + dy * t, 2.6);
  }
  gfx.fillStyle(0xf472b6, 1);
  gfx.fillCircle(toX, toY, 5.5);
  gfx.lineStyle(2, 0xfef08a, 1);
  gfx.strokeCircle(toX, toY, 7);

  if (spawnLeaves && Math.random() < 0.42) {
    const t = Math.random();
    const lx = fromX + dx * t + (Math.random() - 0.5) * 10;
    const ly = fromY + dy * t + (Math.random() - 0.5) * 10;
    const leaf = scene.add
      .ellipse(lx, ly, 8, 4, Math.random() < 0.5 ? 0x4ade80 : 0x86efac, 0.92)
      .setRotation(Math.random() * Math.PI)
      .setDepth(68);
    scene.tweens.add({
      targets: leaf,
      x: lx + (Math.random() - 0.5) * 32,
      y: ly + 18 + Math.random() * 16,
      angle: leaf.angle + Phaser.Math.Between(-90, 90),
      alpha: 0,
      duration: 340,
      onComplete: () => leaf.destroy(),
    });
  }
}

/**
 * Spawns an immediate burst of bamboo leaves when the Q grapple hook latches onto a surface.
 */
export function spawnGrappleLeafBurst(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
    const leaf = scene.add
      .ellipse(x, y, 9, 4.5, i % 2 === 0 ? 0x22c55e : 0xbef264, 0.95)
      .setRotation(a)
      .setDepth(70);
    scene.tweens.add({
      targets: leaf,
      x: x + Math.cos(a) * 34,
      y: y + Math.sin(a) * 28,
      alpha: 0,
      scale: 0.4,
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => leaf.destroy(),
    });
  }
}
