import Phaser from 'phaser';
import { soundManager } from './SoundManager';

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type DayPeriod = 'dawn' | 'day' | 'sunset' | 'night';

export interface SeasonDefinition {
  id: SeasonId;
  name: string;
  khmerName: string;
  shortLabel: string;
  weatherLabel: string;
  icon: string;
  festival: string;
  effectText: string;
  autoWatersFarm: boolean;
  tintHex: number;
  tintAlpha: number;
}

export interface SeasonClockSnapshot {
  season: SeasonDefinition;
  dayOfSeason: number; // 1..14
  period: DayPeriod;
  periodLabel: string;
  periodIcon: string;
  timeText: string; // e.g. "06:30 PM"
  nightIntensity: number; // 0 (bright day) -> 1 (deep indigo night)
  sunsetIntensity: number; // 0 -> 1 (warm amber sunset glow)
  /** Chankitek 12-phase Khmer Lunar Cycle */
  lunarPhaseIndex: number; // 0..11
  lunarIcon: string;
  lunarLabel: string;
  isFullMoon: boolean;
}

export const SEASONS: Record<SeasonId, SeasonDefinition> = {
  spring: {
    id: 'spring',
    name: 'Dry Bloom (Spring)',
    khmerName: 'រដូវផ្ការីក',
    shortLabel: 'Dry Bloom',
    weatherLabel: 'Lotus Breeze',
    icon: '🌸',
    festival: 'Khmer New Year Water Splash & Kite Contest',
    effectText: 'Drifting pink lotus petals across Phum Village.',
    autoWatersFarm: false,
    tintHex: 0xfbcfe8,
    tintAlpha: 0.05,
  },
  summer: {
    id: 'summer',
    name: 'Monsoon Rains (Summer)',
    khmerName: 'រដូវវស្សា',
    shortLabel: 'Monsoon',
    weatherLabel: 'Monsoon Rain',
    icon: '🌧️',
    festival: 'Riverside Boat Race',
    effectText: 'Animated tropical rain — automatically waters all farm plots (-20% grow time)!',
    autoWatersFarm: true,
    tintHex: 0x0284c7,
    tintAlpha: 0.09,
  },
  autumn: {
    id: 'autumn',
    name: 'Golden Harvest (Autumn)',
    khmerName: 'រដូវប្រមូលផល',
    shortLabel: 'Golden Harvest',
    weatherLabel: 'Amber Sun',
    icon: '🍂',
    festival: 'Moon Lantern Night & Harvest Fair',
    effectText: 'Warm amber harvest sunlight & drifting golden leaves.',
    autoWatersFarm: false,
    tintHex: 0xf59e0b,
    tintAlpha: 0.1,
  },
  winter: {
    id: 'winter',
    name: 'Cool Mist (Winter)',
    khmerName: 'រដូវរងា',
    shortLabel: 'Cool Mist',
    weatherLabel: 'Cool Mist',
    icon: '❄️',
    festival: 'Night Market Pier Bazaar',
    effectText: 'Crisp dawn mist & drifting cool fog particles.',
    autoWatersFarm: false,
    tintHex: 0x93c5fd,
    tintAlpha: 0.09,
  },
};

export const SEASON_ORDER: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];

// 1 in-game day = 150 seconds (2.5 minutes) for lively Day/Night & 14-day season progression
const DAY_DURATION_MS = 150_000;
const DAYS_PER_SEASON = 14;

type ClockListener = (snap: SeasonClockSnapshot) => void;

class SeasonClockEngine {
  private seasonOverride: SeasonId | null = null;
  private periodOverride: DayPeriod | null = null;
  private listeners = new Set<ClockListener>();

  public getSnapshot(now = Date.now()): SeasonClockSnapshot {
    const totalDays = Math.floor(now / DAY_DURATION_MS);
    const autoSeasonIdx = Math.floor(totalDays / DAYS_PER_SEASON) % SEASON_ORDER.length;
    const seasonId = this.seasonOverride ?? SEASON_ORDER[autoSeasonIdx];
    const season = SEASONS[seasonId];
    const dayOfSeason = (totalDays % DAYS_PER_SEASON) + 1;

    // Normalized day phase 0..1 (0.0 = 06:00 sunrise, 0.5 = 18:00 sunset, 0.75 = 00:00 midnight)
    let phase = (now % DAY_DURATION_MS) / DAY_DURATION_MS;
    if (this.periodOverride === 'dawn') phase = 0.04;
    else if (this.periodOverride === 'day') phase = 0.28;
    else if (this.periodOverride === 'sunset') phase = 0.52;
    else if (this.periodOverride === 'night') phase = 0.78;

    const hourFloat = (6 + phase * 24) % 24;
    const hour24 = Math.floor(hourFloat);
    const mins = Math.floor((hourFloat - hour24) * 60);
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const timeText = `${hour12}:${mins < 10 ? '0' : ''}${mins} ${ampm}`;

    let period: DayPeriod = 'day';
    let periodLabel = 'Day';
    let periodIcon = '☀️';
    let sunsetIntensity = 0;
    let nightIntensity = 0;

    if (phase < 0.1) {
      period = 'dawn';
      periodLabel = 'Dawn';
      periodIcon = '🌅';
      sunsetIntensity = Math.sin((phase / 0.1) * Math.PI) * 0.55;
      nightIntensity = (1 - phase / 0.1) * 0.35;
    } else if (phase < 0.46) {
      period = 'day';
      periodLabel = 'Day';
      periodIcon = '☀️';
    } else if (phase < 0.62) {
      period = 'sunset';
      periodLabel = 'Sunset';
      periodIcon = '🌇';
      const t = (phase - 0.46) / 0.16;
      sunsetIntensity = Math.sin(t * Math.PI);
      nightIntensity = t * 0.5;
    } else {
      period = 'night';
      periodLabel = 'Night';
      periodIcon = '🌙';
      const t = (phase - 0.62) / 0.38;
      nightIntensity = t < 0.8 ? 0.65 + Math.sin(t * Math.PI) * 0.35 : 0.65 * (1 - (t - 0.8) / 0.2);
    }

    // Chankitek 12-Phase Khmer Lunar Calendar (Full Moon Penh Boramey on Day 7 & Day 14!)
    const lunarPhaseIndex = ((dayOfSeason - 1) % 12 + 12) % 12;
    const isFullMoon = dayOfSeason === 7 || dayOfSeason === 14;
    const LUNAR_ICONS = ['🌑', '🌒', '🌒', '🌓', '🌔', '🌔', '🌕', '🌖', '🌖', '🌗', '🌘', '🌘'];
    const lunarIcon = isFullMoon ? '🌕' : LUNAR_ICONS[lunarPhaseIndex];
    const lunarLabel = isFullMoon
      ? 'Penh Boramey (Full Moon)'
      : lunarPhaseIndex === 0
        ? 'New Moon (Khmer Dark)'
        : lunarPhaseIndex < 6
          ? 'Waxing Moon (Kaeut)'
          : 'Waning Moon (Roch)';

    return {
      season,
      dayOfSeason,
      period,
      periodLabel,
      periodIcon,
      timeText,
      nightIntensity: Math.max(0, Math.min(1, nightIntensity)),
      sunsetIntensity: Math.max(0, Math.min(1, sunsetIntensity)),
      lunarPhaseIndex,
      lunarIcon,
      lunarLabel,
      isFullMoon,
    };
  }

  public setSeasonOverride(season: SeasonId | null): void {
    this.seasonOverride = season;
    this.notify();
  }

  public cycleSeason(): SeasonId {
    const current = this.getSnapshot().season.id;
    const idx = SEASON_ORDER.indexOf(current);
    const next = SEASON_ORDER[(idx + 1) % SEASON_ORDER.length];
    this.seasonOverride = next;
    this.notify();
    return next;
  }

  public setPeriodOverride(period: DayPeriod | null): void {
    this.periodOverride = period;
    this.notify();
  }

  public cyclePeriod(): DayPeriod | null {
    const order: Array<DayPeriod | null> = ['day', 'sunset', 'night', null];
    const idx = order.indexOf(this.periodOverride);
    const next = order[(idx + 1) % order.length];
    this.periodOverride = next;
    this.notify();
    return next;
  }

  public getOverrides(): { season: SeasonId | null; period: DayPeriod | null } {
    return { season: this.seasonOverride, period: this.periodOverride };
  }

  public subscribe(fn: ClockListener): () => void {
    this.listeners.add(fn);
    fn(this.getSnapshot());
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }
}

export const seasonClock = new SeasonClockEngine();

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  alpha: number;
}

/**
 * Reusable Phaser 3 Weather & Day/Night Atmosphere Controller for OverworldScene & FarmScene:
 * - Dry Bloom (Spring): drifting pink lotus petals
 * - Monsoon Rains (Summer): diagonal tropical rain streaks
 * - Golden Harvest (Autumn): warm amber sunlight tint + drifting golden leaves
 * - Cool Mist (Winter): drifting soft cool mist puffs
 * - Day/Night lighting tint overlay (warm sunset -> soft indigo night)
 */
export class SeasonAtmosphereOverlay {
  private scene: Phaser.Scene;
  private worldW: number;
  private worldH: number;
  private particleGfx: Phaser.GameObjects.Graphics;
  private seasonTintRect: Phaser.GameObjects.Rectangle;
  private sunsetRect: Phaser.GameObjects.Rectangle;
  private nightRect: Phaser.GameObjects.Rectangle;
  private lightningRect: Phaser.GameObjects.Rectangle;
  private skyLanterns: Array<{ x: number; y: number; vy: number; sway: number }> = [];
  private nextThunderAt = 0;
  private lightningAlpha = 0;
  private particles: WeatherParticle[] = [];
  private activeSeason: SeasonId;
  private lanternGlows: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, worldW: number, worldH: number) {
    this.scene = scene;
    this.worldW = worldW;
    this.worldH = worldH;
    this.activeSeason = seasonClock.getSnapshot().season.id;

    // World-space weather particles rendered cleanly above buildings/trees
    this.particleGfx = scene.add.graphics().setDepth(2150);

    // Subtle full-map atmospheric lighting layers (beneath interactive prompts at 2600+)
    this.seasonTintRect = scene.add
      .rectangle(worldW / 2, worldH / 2, worldW + 80, worldH + 80, 0xffffff, 0)
      .setDepth(2120);

    this.sunsetRect = scene.add
      .rectangle(worldW / 2, worldH / 2, worldW + 80, worldH + 80, 0xf97316, 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2125);

    this.nightRect = scene.add
      .rectangle(worldW / 2, worldH / 2, worldW + 80, worldH + 80, 0x1e1b4b, 0)
      .setDepth(2130);

    this.lightningRect = scene.add
      .rectangle(worldW / 2, worldH / 2, worldW + 80, worldH + 80, 0xe0f2fe, 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2135);

    this.nextThunderAt = scene.time.now + 7500;
    for (let i = 0; i < 12; i++) {
      this.skyLanterns.push({
        x: Math.random() * worldW,
        y: Math.random() * worldH,
        vy: 14 + Math.random() * 14,
        sway: Math.random() * Math.PI * 2,
      });
    }

    this.seedParticles(this.activeSeason);
  }

  public registerGlowLight(glow: Phaser.GameObjects.Image): void {
    this.lanternGlows.push(glow);
  }

  private seedParticles(season: SeasonId): void {
    this.activeSeason = season;
    this.particles = [];
    const count = season === 'summer' ? 78 : season === 'winter' ? 28 : 42;
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(season, true));
    }
  }

  private createParticle(season: SeasonId, randomY: boolean): WeatherParticle {
    const x = Math.random() * this.worldW;
    const y = randomY ? Math.random() * this.worldH : -12 - Math.random() * 60;
    if (season === 'summer') {
      return {
        x,
        y,
        vx: -75 - Math.random() * 35,
        vy: 260 + Math.random() * 95,
        size: 8 + Math.random() * 6,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.35,
      };
    }
    if (season === 'winter') {
      return {
        x,
        y: randomY ? Math.random() * this.worldH : Math.random() * this.worldH,
        vx: 10 + Math.random() * 14,
        vy: 3 + Math.random() * 6,
        size: 14 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.1 + Math.random() * 0.1,
      };
    }
    // Spring pink lotus petals & Autumn golden leaves
    return {
      x,
      y,
      vx: (season === 'autumn' ? 18 : 12) + Math.random() * 14,
      vy: 18 + Math.random() * 20,
      size: 2.2 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.65 + Math.random() * 0.3,
    };
  }

  public update(time: number, delta: number): SeasonClockSnapshot {
    const snap = seasonClock.getSnapshot();
    const dt = Math.min(0.05, delta / 1000);

    if (snap.season.id !== this.activeSeason) {
      this.seedParticles(snap.season.id);
    }

    // Update subtle season + sunset + indigo night overlays
    this.seasonTintRect.setFillStyle(snap.season.tintHex, snap.season.tintAlpha);
    this.sunsetRect.setAlpha(snap.sunsetIntensity * 0.16);
    this.nightRect.setAlpha(snap.nightIntensity * 0.34);

    // Brighten campfires & village lanterns dynamically during sunset & night!
    const nightBoost = snap.nightIntensity * 0.55 + snap.sunsetIntensity * 0.25;
    for (let i = 0; i < this.lanternGlows.length; i++) {
      const g = this.lanternGlows[i];
      if (!g.active) continue;
      const flicker = Math.sin(time * 0.008 + i * 1.9) * 0.07;
      g.setAlpha(Math.min(0.95, 0.35 + nightBoost + flicker));
    }

    // Live Monsoon Thunderstorms (periodic sky lightning flash + WebAudio rolling thunder!)
    if (snap.season.id === 'summer' && time >= this.nextThunderAt) {
      this.nextThunderAt = time + 11000 + Math.random() * 14000;
      this.lightningAlpha = 0.42;
      soundManager.playThunder();
    }
    if (this.lightningAlpha > 0) {
      this.lightningAlpha = Math.max(0, this.lightningAlpha - dt * 1.9);
      this.lightningRect.setAlpha(this.lightningAlpha);
    } else if (this.lightningRect.alpha !== 0) {
      this.lightningRect.setAlpha(0);
    }

    // Draw crisp weather particles
    this.particleGfx.clear();
    const s = this.activeSeason;
    // Full Moon Penh Boramey Sky Lanterns drifting gently across night sky!
    if (snap.nightIntensity > 0.3 && snap.isFullMoon) {
      for (const lan of this.skyLanterns) {
        lan.y -= lan.vy * dt;
        lan.x += Math.sin(time * 0.0015 + lan.sway) * 10 * dt;
        if (lan.y < -20) {
          lan.y = this.worldH + 20;
          lan.x = Math.random() * this.worldW;
        }
        this.particleGfx.fillStyle(0xf59e0b, 0.35);
        this.particleGfx.fillCircle(lan.x, lan.y, 9);
        this.particleGfx.fillStyle(0xfef08a, 0.9);
        this.particleGfx.fillRoundedRect(lan.x - 3, lan.y - 4, 6, 8, 2);
      }
    }
    for (const p of this.particles) {
      const sway = s === 'summer' ? 0 : Math.sin(time * 0.002 + p.phase) * 14;
      p.x += (p.vx + sway) * dt;
      p.y += p.vy * dt;

      if (p.y > this.worldH + 20) {
        p.y = -12;
        p.x = Math.random() * this.worldW;
      }
      if (p.x < -30) p.x = this.worldW + 20;
      if (p.x > this.worldW + 30) p.x = -20;

      if (s === 'summer') {
        this.particleGfx.lineStyle(1.1, 0xbae6fd, p.alpha);
        this.particleGfx.lineBetween(p.x, p.y, p.x - p.size * 0.32, p.y + p.size);
      } else if (s === 'spring') {
        // Pink Khmer lotus petals
        this.particleGfx.fillStyle(0xf472b6, p.alpha);
        this.particleGfx.fillEllipse(p.x, p.y, p.size * 1.6, p.size * 0.9);
        this.particleGfx.fillStyle(0xfce7f3, p.alpha * 0.85);
        this.particleGfx.fillRect(p.x - 0.5, p.y - 0.5, 1.2, 1.2);
      } else if (s === 'autumn') {
        // Golden harvest leaves
        const col = p.phase > 3.1 ? 0xf59e0b : 0xfacc15;
        this.particleGfx.fillStyle(col, p.alpha);
        this.particleGfx.fillEllipse(p.x, p.y, p.size * 1.7, p.size);
      } else {
        // Soft cool winter mist clouds
        this.particleGfx.fillStyle(0xe0f2fe, p.alpha);
        this.particleGfx.fillEllipse(p.x, p.y, p.size * 2.4, p.size * 0.9);
      }
    }

    return snap;
  }

  public destroy(): void {
    this.particleGfx.destroy();
    this.seasonTintRect.destroy();
    this.sunsetRect.destroy();
    this.nightRect.destroy();
    this.lightningRect.destroy();
    this.lanternGlows = [];
  }
}
