import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PlayerState } from '@shared/types';
import { EventBus } from '../EventBus';
import { soundManager } from '../systems/SoundManager';

const COURSE_DISTANCE = 1550;

interface RacerBoat {
  id: string;
  name: string;
  isPlayer: boolean;
  laneY: number;
  distance: number;
  speed: number;
  hullColor: number;
  trimColor: number;
  container: Phaser.GameObjects.Container;
  oars: Phaser.GameObjects.Rectangle[];
  label: Phaser.GameObjects.Text;
  finishedAt: number | null;
  aiBaseSpeed: number;
  aiPhase: number;
}

/**
 * Update 1.5 — Bon Om Touk (Water Festival) Khmer Longboat Racing Mini-Game!
 * Paddle rhythmically ([Space] / Click / Tap) down a lantern-lit Mekong River course
 * against 3 rival village crews to win Coins, Gold, Fishing XP & the Water Festival Rowing Paddle!
 */
export class FestivalRaceScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE, zone: 'festival_race' };
  private boats: RacerBoat[] = [];
  private waterStreaks: Phaser.GameObjects.Rectangle[] = [];
  private riverLanterns: Phaser.GameObjects.Container[] = [];

  private phase: 'countdown' | 'racing' | 'finished' = 'countdown';
  private countdownStartedAt = 0;
  private lastCountdownStep = 3;
  private raceStartedAt = 0;
  private lastStrokeAt = 0;
  private rhythmCombo = 0;
  private countdownText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private finishLineGfx!: Phaser.GameObjects.Graphics;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private dKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private transitioning = false;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('FestivalRaceScene');
  }

  init(data?: { playerState?: PlayerState }): void {
    this.initialState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'festival_race',
          activeMount: null,
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
          currencies: { ...data.playerState.currencies },
          lifeStats: { ...data.playerState.lifeStats },
        }
      : { ...INITIAL_PLAYER_STATE, zone: 'festival_race', activeMount: null };
    this.boats = [];
    this.waterStreaks = [];
    this.riverLanterns = [];
    this.phase = 'countdown';
    this.rhythmCombo = 0;
    this.lastStrokeAt = 0;
    this.transitioning = false;
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    soundManager.playBgm('village');

    // 1. Lantern-Lit Twilight Mekong River Course
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x0c1938, 0x0c1938, 0x0369a1, 0x0369a1, 1);
    bg.fillRect(0, 0, w, h);

    // Top & bottom festival riverbanks
    bg.fillStyle(0x14532d, 1);
    bg.fillRect(0, 0, w, Math.max(118, h * 0.17));
    bg.fillRect(0, h - Math.max(96, h * 0.14), w, Math.max(96, h * 0.14));
    bg.lineStyle(3, 0xfacc15, 0.85);
    bg.lineBetween(0, Math.max(118, h * 0.17), w, Math.max(118, h * 0.17));
    bg.lineBetween(0, h - Math.max(96, h * 0.14), w, h - Math.max(96, h * 0.14));

    // Animated water current streaks
    const riverTop = Math.max(132, h * 0.19);
    const riverBottom = h - Math.max(108, h * 0.16);
    for (let i = 0; i < 28; i++) {
      const rx = Phaser.Math.Between(0, w);
      const ry = Phaser.Math.Between(riverTop, riverBottom);
      const streak = this.add.rectangle(rx, ry, Phaser.Math.Between(24, 62), 2, 0x7dd3fc, 0.28).setDepth(2);
      this.waterStreaks.push(streak);
    }

    // Glowing floating Bon Om Touk lanterns along riverbanks
    for (let lx = 60; lx < w; lx += 120) {
      for (const ly of [riverTop - 16, riverBottom + 16]) {
        const cont = this.add.container(lx, ly).setDepth(6);
        const halo = this.add.circle(0, 0, 14, 0xf59e0b, 0.28);
        const bulb = this.add.circle(0, 0, 5, 0xfef08a, 0.95).setStrokeStyle(1.5, 0xea580c);
        cont.add([halo, bulb]);
        this.riverLanterns.push(cont);
      }
    }

    this.finishLineGfx = this.add.graphics().setDepth(5);

    // 2. Spawn 4 Traditional Khmer Racing Longboats (Tuk Ngo)
    const laneSpan = riverBottom - riverTop;
    const laneStep = laneSpan / 4;
    const tagPrefix = this.initialState.kromTag ? `[${this.initialState.kromTag}] ` : '';
    const racerSpecs = [
      { id: 'player', name: `${tagPrefix}${this.initialState.name} (You)`, isPlayer: true, hull: 0xb91c1c, trim: 0xfacc15, aiSpeed: 0 },
      { id: 'rival_1', name: 'Prey Veng Tigers', isPlayer: false, hull: 0x0f766e, trim: 0xfde047, aiSpeed: 192 },
      { id: 'rival_2', name: 'Kampong Cham Swans', isPlayer: false, hull: 0x7e22ce, trim: 0xf472b6, aiSpeed: 184 },
      { id: 'rival_3', name: 'Siem Reap Nagas', isPlayer: false, hull: 0x1d4ed8, trim: 0x38bdf8, aiSpeed: 176 },
    ];

    racerSpecs.forEach((spec, idx) => {
      const laneY = riverTop + laneStep * (idx + 0.5);
      const boat = this.createLongboat(spec, laneY, idx);
      this.boats.push(boat);
    });

    // 3. Top Race HUD Bar + Progress Meter
    const cx = w / 2;
    this.hudText = this.add
      .text(cx, 88, '🛶 BON OM TOUK · MEKONG LONGBOAT RACE (Tap [SPACE] or Click PADDLE!)', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        padding: { x: 12, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setDepth(100);

    // Race course progress bar
    this.add.rectangle(cx, 126, 360, 12, 0x0f172a, 0.85).setStrokeStyle(2, 0xfacc15).setDepth(100);
    this.progressFill = this.add.rectangle(cx - 178, 126, 4, 8, 0x38bdf8).setOrigin(0, 0.5).setDepth(101);

    this.comboText = this.add
      .text(cx, h - 78, '🔥 Tap [SPACE] or Click Anywhere in Rhythm to Surge Forward!', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(100);

    // Big clickable Paddle Button (Desktop & Mobile friendly)
    const paddleBtn = this.add
      .rectangle(cx, h - 38, 220, 40, 0xd97706, 0.96)
      .setStrokeStyle(3, 0xfef08a)
      .setDepth(110)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx, h - 38, '🛶 PADDLE! [SPACE]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fffbeb',
      })
      .setOrigin(0.5)
      .setDepth(111);
    paddleBtn.on('pointerdown', () => this.triggerPlayerStroke());

    // Return to Green Park button (bottom-right unobstructed safe exit)
    const exitBtn = this.add
      .text(w - 22, h - 38, '← Exit to Green Park [ESC]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#e0f2fe',
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        padding: { x: 11, y: 6 },
      })
      .setOrigin(1, 0.5)
      .setDepth(120)
      .setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => this.exitToGreenPark());

    // Countdown banner (wall-clock synced so 3-2-1-GO is crisp even under software rendering)
    this.countdownStartedAt = performance.now();
    this.lastCountdownStep = 3;
    this.countdownText = this.add
      .text(cx, h / 2 - 16, '3', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '54px',
        fontStyle: 'bold',
        color: '#facc15',
        stroke: '#0f172a',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(200);

    // 4. Controls
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.dKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (currentlyOver.length > 0) return;
      this.triggerPlayerStroke();
    });

    this.unsubs.push(
      EventBus.on('input:attack', () => this.triggerPlayerStroke()),
      EventBus.on('input:jump', () => this.triggerPlayerStroke()),
      EventBus.on('travel:execute', () => this.exitToGreenPark())
    );

    EventBus.emit('scene:ready', { zone: 'festival_race' });
    EventBus.emit('player:state', this.initialState);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
    });
  }

  private createLongboat(
    spec: { id: string; name: string; isPlayer: boolean; hull: number; trim: number; aiSpeed: number },
    laneY: number,
    idx: number
  ): RacerBoat {
    const startX = 150;
    const container = this.add.container(startX, laneY).setDepth(30 + idx);

    // Ornate curved Khmer Tuk Ngo wooden racing hull
    const g = this.add.graphics();
    g.fillStyle(spec.hull, 1);
    g.fillRoundedRect(-58, -11, 116, 22, 10);
    g.lineStyle(2.5, spec.trim, 1);
    g.strokeRoundedRect(-58, -11, 116, 22, 10);
    // Gilded Naga prow (front) & upturned stern (back)
    g.fillStyle(spec.trim, 1);
    g.fillTriangle(56, -8, 76, -15, 62, 6);
    g.fillTriangle(-56, -8, -70, -14, -60, 4);
    // Tiny paddlers wearing golden Krama hats inside boat
    for (const px of [-32, -12, 8, 28]) {
      g.fillStyle(0xfef08a, 1);
      g.fillCircle(px, -3, 4.5);
      g.fillStyle(0xc88858, 1);
      g.fillCircle(px, 2, 3.5);
    }

    const oars: Phaser.GameObjects.Rectangle[] = [];
    for (const ox of [-30, -10, 10, 30]) {
      const oarTop = this.add.rectangle(ox, -15, 3, 14, 0xfde68a).setAngle(22);
      const oarBot = this.add.rectangle(ox, 15, 3, 14, 0xfde68a).setAngle(-22);
      oars.push(oarTop, oarBot);
    }

    const label = this.add
      .text(0, -28, spec.name, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: spec.isPlayer ? '11px' : '10px',
        fontStyle: 'bold',
        color: spec.isPlayer ? '#fde047' : '#e2e8f0',
        backgroundColor: spec.isPlayer ? 'rgba(124, 45, 18, 0.9)' : 'rgba(15, 23, 42, 0.78)',
        padding: { x: 5, y: 1 },
      })
      .setOrigin(0.5, 1);

    container.add([g, ...oars, label]);

    return {
      id: spec.id,
      name: spec.name,
      isPlayer: spec.isPlayer,
      laneY,
      distance: 0,
      speed: 0,
      hullColor: spec.hull,
      trimColor: spec.trim,
      container,
      oars,
      label,
      finishedAt: null,
      aiBaseSpeed: spec.aiSpeed,
      aiPhase: idx * 1.3,
    };
  }

  private triggerPlayerStroke(): void {
    if (this.phase !== 'racing' || this.transitioning) return;
    const playerBoat = this.boats[0];
    if (!playerBoat || playerBoat.finishedAt !== null) return;

    const now = this.time.now;
    const deltaMs = now - this.lastStrokeAt;
    if (deltaMs < 110) return; // Prevent accidental double-bounce
    this.lastStrokeAt = now;

    // Rhythmic cadence sweet spot (160ms..520ms) builds combo surge!
    if (deltaMs >= 150 && deltaMs <= 540) {
      this.rhythmCombo = Math.min(12, this.rhythmCombo + 1);
    } else {
      this.rhythmCombo = 1;
    }

    const surge = 105 + Math.min(72, this.rhythmCombo * 8);
    playerBoat.speed = Math.min(345, playerBoat.speed + surge);
    soundManager.playSfx('splash');

    // Animate oars dipping & water wake spray
    playerBoat.oars.forEach((oar, i) => {
      const sign = i % 2 === 0 ? -1 : 1;
      oar.setAngle(sign * 42);
      this.tweens.add({ targets: oar, angle: sign * -22, duration: 180 });
    });

    const splash = this.add.circle(playerBoat.container.x - 52, playerBoat.laneY, 7, 0xbae6fd, 0.85).setDepth(25);
    this.tweens.add({
      targets: splash,
      x: playerBoat.container.x - 95,
      scale: 2.2,
      alpha: 0,
      duration: 320,
      onComplete: () => splash.destroy(),
    });

    this.comboText.setText(
      this.rhythmCombo >= 3
        ? `🔥 RHYTHM SURGE ×${this.rhythmCombo}! Keep paddling!`
        : `🛶 Stroke! Tap rhythmically for Combo Boost!`
    );
  }

  private finishRace(playerBoat: RacerBoat): void {
    if (this.phase === 'finished') return;
    this.phase = 'finished';

    const ranked = [...this.boats].sort((a, b) => {
      if (a.finishedAt !== null && b.finishedAt !== null) return a.finishedAt - b.finishedAt;
      if (a.finishedAt !== null) return -1;
      if (b.finishedAt !== null) return 1;
      return b.distance - a.distance;
    });
    const place = Math.max(1, ranked.findIndex((b) => b.isPlayer) + 1);
    const timeSec = Math.round(((this.time.now - this.raceStartedAt) / 1000) * 10) / 10;

    const coins = place === 1 ? 350 : place === 2 ? 200 : place === 3 ? 120 : 80;
    const gold = place === 1 ? 2 : 0;
    const fishingXp = place === 1 ? 85 : 45;
    const unlockedPaddle = place === 1;

    soundManager.playSfx(place === 1 ? 'victory' : 'coin');
    EventBus.emit('festival:raceFinished', {
      place,
      timeSec,
      coins,
      gold,
      fishingXp,
      unlockedPaddle,
    });

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const panel = this.add
      .rectangle(cx, cy, 430, 210, 0x0f172a, 0.94)
      .setStrokeStyle(3, 0xfacc15)
      .setDepth(240);
    const title = this.add
      .text(
        cx,
        cy - 68,
        place === 1 ? '🏆 1ST PLACE · MEKONG CHAMPION!' : `🛶 FINISHED #${place} (${timeSec}s)`,
        {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: place === 1 ? '#fde047' : '#e0f2fe',
        }
      )
      .setOrigin(0.5)
      .setDepth(242);

    const summary = this.add
      .text(
        cx,
        cy - 18,
        `Time: ${timeSec}s · Rewards: +${coins} Coins${gold > 0 ? ` · +${gold} Gold` : ''} · +${fishingXp} Fishing XP${
          unlockedPaddle ? '\n🎁 Unlocked: Water Festival Rowing Paddle!' : ''
        }`,
        {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#a7f3d0',
          align: 'center',
        }
      )
      .setOrigin(0.5)
      .setDepth(242);

    const againBtn = this.add
      .text(cx - 88, cy + 52, '🛶 Race Again', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fffbeb',
        backgroundColor: '#0284c7',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(245)
      .setInteractive({ useHandCursor: true });
    againBtn.on('pointerdown', () => {
      this.scene.restart({ playerState: this.initialState });
    });

    const backBtn = this.add
      .text(cx + 88, cy + 52, '🌿 Green Park Pier', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#0f172a',
        backgroundColor: '#facc15',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(245)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.exitToGreenPark());

    void panel;
    void title;
    void summary;
    void playerBoat;
  }

  private exitToGreenPark(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 8, 16, 28);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId: 'green_park',
        spawnX: 540,
        spawnY: 790,
        playerState: {
          ...this.initialState,
          zone: 'overworld',
          currentMapId: 'green_park',
        },
      });
    });
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    const w = this.scale.width;

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.exitToGreenPark();
      return;
    }

    // Wall-clock 1.5s countdown so software-rendered headless / low-FPS devices never lag countdown
    if (this.phase === 'countdown') {
      const elapsedMs = performance.now() - this.countdownStartedAt;
      if (elapsedMs >= 1500) {
        this.phase = 'racing';
        this.raceStartedAt = time;
        this.countdownText.setText('GO! 🛶');
        soundManager.playSfx('level_up');
        this.tweens.add({
          targets: this.countdownText,
          alpha: 0,
          scale: 1.45,
          duration: 450,
          onComplete: () => this.countdownText.setVisible(false),
        });
      } else {
        const step = elapsedMs >= 1000 ? 1 : elapsedMs >= 500 ? 2 : 3;
        if (step !== this.lastCountdownStep) {
          this.lastCountdownStep = step;
          this.countdownText.setText(String(step));
          soundManager.playSfx('click');
        }
      }
    }

    if (
      this.phase === 'racing' &&
      (Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
        Phaser.Input.Keyboard.JustDown(this.rightKey) ||
        Phaser.Input.Keyboard.JustDown(this.dKey))
    ) {
      this.triggerPlayerStroke();
    }

    const playerBoat = this.boats[0];
    if (!playerBoat) return;

    if (this.phase === 'racing') {
      // Water drag on player boat
      playerBoat.speed = Math.max(40, playerBoat.speed - 175 * dt);
      playerBoat.distance += playerBoat.speed * dt;
      if (playerBoat.distance >= COURSE_DISTANCE && playerBoat.finishedAt === null) {
        playerBoat.distance = COURSE_DISTANCE;
        playerBoat.finishedAt = time;
        this.finishRace(playerBoat);
      }

      // Rival AI boats paddle rhythmically
      for (const b of this.boats) {
        if (b.isPlayer || b.finishedAt !== null) continue;
        const pulse = Math.sin(time / 240 + b.aiPhase);
        b.speed = b.aiBaseSpeed + pulse * 46;
        b.distance += b.speed * dt;
        b.oars.forEach((oar, i) => {
          const sign = i % 2 === 0 ? -1 : 1;
          oar.setAngle(sign * (12 + pulse * 26));
        });
        if (b.distance >= COURSE_DISTANCE) {
          b.distance = COURSE_DISTANCE;
          b.finishedAt = time;
        }
      }
    }

    // Visual scroll relative to player camera anchor (keeps race exciting & readable!)
    const camAnchorDist = playerBoat.distance;
    const playerScreenX = Math.min(w * 0.42, 260);
    for (const b of this.boats) {
      const relX = playerScreenX + (b.distance - camAnchorDist) * 0.72;
      b.container.setPosition(Phaser.Math.Clamp(relX, 55, w - 55), b.laneY + Math.sin(time / 210 + b.laneY) * 2.5);
    }

    // Scroll water streaks & lanterns
    const scrollSpd = this.phase === 'racing' ? Math.max(80, playerBoat.speed) : 55;
    for (const s of this.waterStreaks) {
      s.x -= scrollSpd * dt * 1.1;
      if (s.x < -60) s.x = w + 50;
    }
    for (const l of this.riverLanterns) {
      l.x -= scrollSpd * dt * 0.55;
      if (l.x < -30) l.x = w + 40;
    }

    // Draw finish line when approaching the end
    this.finishLineGfx.clear();
    const finishScreenX = playerScreenX + (COURSE_DISTANCE - camAnchorDist) * 0.72;
    if (finishScreenX > 0 && finishScreenX < w + 80) {
      this.finishLineGfx.lineStyle(5, 0xfacc15, 0.95);
      this.finishLineGfx.lineBetween(finishScreenX, 118, finishScreenX, this.scale.height - 96);
    }

    // Progress bar + live placement HUD
    const pct = Math.min(1, playerBoat.distance / COURSE_DISTANCE);
    this.progressFill.width = Math.max(4, Math.round(356 * pct));
    const aheadCount = this.boats.filter((b) => !b.isPlayer && b.distance > playerBoat.distance).length;
    const rank = aheadCount + 1;
    this.hudText.setText(
      `🛶 BON OM TOUK · POS #${rank}/4 · ${Math.round(pct * 100)}% (${Math.round(playerBoat.distance)}m / ${COURSE_DISTANCE}m)`
    );
  }
}
