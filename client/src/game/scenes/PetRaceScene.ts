import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PetEvolutionStage, type PlayerState } from '@shared/types';
import { getPetProgress } from '@shared/petEvolution';
import { ITEM_CATALOG } from '../../data/items';
import { EventBus } from '../EventBus';
import { soundManager } from '../systems/SoundManager';
import { vfxManager } from '../animations/VFXManager';

const TRACK_DISTANCE = 1800;

interface TrackObstacle {
  kind: 'mud' | 'hurdle' | 'lotus_pad';
  laneIdx: number;
  distance: number;
  width: number;
  triggered: boolean;
  visual: Phaser.GameObjects.Container;
}

interface PetRacerNode {
  id: string;
  ownerName: string;
  petId: string;
  petName: string;
  stage: PetEvolutionStage;
  isPlayer: boolean;
  laneIdx: number;
  laneY: number;
  distance: number;
  speed: number;
  hopTimerMs: number;
  mudSlowMs: number;
  boostMs: number;
  aiBaseSpeed: number;
  aiPhase: number;
  finishedAt: number | null;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
  aura?: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  lastTrailAt: number;
}

const RIVAL_PETS: Array<{ owner: string; petId: string; label: string; stage: PetEvolutionStage; speed: number }> = [
  { owner: 'Bopha', petId: 'pet_celestial_lotus_kitsune', label: 'Lotus Kitsune', stage: 3, speed: 224 },
  { owner: 'Vireak', petId: 'pet_baby_angkor_singha', label: 'Angkor Singha', stage: 2, speed: 218 },
  { owner: 'Dara', petId: 'pet_baby_water_buffalo', label: 'Water Buffalo', stage: 2, speed: 211 },
  { owner: 'Nita', petId: 'pet_golden_frog', label: 'Golden Frog', stage: 1, speed: 205 },
  { owner: 'Sokha', petId: 'pet_mini_golden_naga', label: 'Mini Naga', stage: 3, speed: 215 },
];

function resolveRaceTexture(petId: string): { key: string; tint?: number; scale: number } {
  if (petId === 'pet_village_puppy') return { key: 'pet_village_puppy', scale: 1.05 };
  if (petId === 'pet_baby_water_buffalo') return { key: 'pet_baby_water_buffalo', scale: 1.08 };
  if (petId === 'pet_mini_golden_naga') return { key: 'pet_mini_golden_naga', scale: 1.12 };
  if (petId === 'pet_celestial_lotus_kitsune') return { key: 'pet_celestial_lotus_kitsune', scale: 1.08 };
  if (petId === 'pet_baby_angkor_singha') return { key: 'pet_baby_angkor_singha', scale: 1.08 };
  if (petId === 'pet_golden_frog') return { key: 'pet_frog', tint: 0xfde047, scale: 1.65 };
  if (petId === 'pet_baby_elephant') return { key: 'pet_lioncub', scale: 1.65 };
  if (petId === 'pet_firefly_lantern') return { key: 'pet_lantern', tint: 0xfef08a, scale: 1.65 };
  if (petId === 'pet_mini_naga') return { key: 'pet_spirit', tint: 0x34d399, scale: 1.65 };
  return { key: 'pet_village_puppy', scale: 1.05 };
}

/**
 * Update 2.9 — Live Village Pet Racing Arena Mini-Game!
 * Up to 6 pets race across a Khmer village track with Mud Puddles, Bamboo Hurdles & Lotus Boost Pads.
 * Fair normalized stats: Stage 3 Mythic pets get radiant Bloom trails, while player skill
 * ([SPACE] Cheer Boost on stamina sweet spot + [E] Hop over bamboo hurdles) decides the race!
 */
export class PetRaceScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE, zone: 'pet_race' };
  private playerPetId = 'pet_village_puppy';
  private racers: PetRacerNode[] = [];
  private obstacles: TrackObstacle[] = [];

  private phase: 'countdown' | 'racing' | 'finished' = 'countdown';
  private countdownStartedAt = 0;
  private lastCountdownStep = 3;
  private raceStartedAt = 0;

  // Stamina sweet-spot meter (oscillates 0..100, sweet spot 62..88!)
  private staminaVal = 50;
  private staminaDir = 1;
  private cheerCooldownUntil = 0;

  private trackLeft = 90;
  private trackRight = 1120;
  private trackTop = 148;
  private trackBottom = 560;

  private countdownText!: Phaser.GameObjects.Text;
  private hudStatusText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private staminaNeedle!: Phaser.GameObjects.Rectangle;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private finishLineGfx!: Phaser.GameObjects.Graphics;

  private spaceKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  private upKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private transitioning = false;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('PetRaceScene');
  }

  init(data?: { playerState?: PlayerState; petId?: string }): void {
    this.initialState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'pet_race',
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
          currencies: { ...data.playerState.currencies },
          lifeStats: { ...data.playerState.lifeStats },
        }
      : { ...INITIAL_PLAYER_STATE, zone: 'pet_race' };
    this.playerPetId =
      data?.petId ||
      this.initialState.loadout.pet ||
      this.initialState.inventory.find((i) => i.quantity > 0 && ITEM_CATALOG[i.itemId]?.slot === 'pet')?.itemId ||
      'pet_village_puppy';
    this.racers = [];
    this.obstacles = [];
    this.phase = 'countdown';
    this.staminaVal = 40;
    this.staminaDir = 1;
    this.cheerCooldownUntil = 0;
    this.transitioning = false;
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    const w = Math.max(640, this.scale.width || window.innerWidth || 1280);
    const h = Math.max(480, this.scale.height || window.innerHeight || 720);
    soundManager.playBgm('festival');

    this.trackLeft = 86;
    this.trackRight = w - 86;
    this.trackTop = Math.max(138, h * 0.2);
    this.trackBottom = h - Math.max(126, h * 0.19);
    const laneCount = 6;
    const laneH = (this.trackBottom - this.trackTop) / laneCount;

    // 1. Festive Khmer Village Pet Track Background
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x166534, 1);
    bg.fillRect(0, 0, w, h);

    // Warm laterite racing dirt lanes
    for (let i = 0; i < laneCount; i++) {
      const ly = this.trackTop + i * laneH;
      bg.fillStyle(i % 2 === 0 ? 0xa16207 : 0x92400e, 0.92);
      bg.fillRect(0, ly, w, laneH);
      bg.lineStyle(1.5, 0xfef3c7, 0.42);
      bg.lineBetween(0, ly, w, ly);
    }
    bg.lineStyle(3, 0xfacc15, 0.9);
    bg.lineBetween(0, this.trackTop, w, this.trackTop);
    bg.lineBetween(0, this.trackBottom, w, this.trackBottom);

    // Festive Angkor pennant flags along top rail
    for (let fx = 36; fx < w; fx += 72) {
      const color = (fx / 72) % 2 === 0 ? 0xfacc15 : 0xf43f5e;
      this.add.triangle(fx, this.trackTop - 12, -10, -8, 10, -8, 0, 10, color, 0.95).setDepth(4);
    }

    this.finishLineGfx = this.add.graphics().setDepth(6);

    // 2. Spawn Obstacles across all 6 lanes (Mud Puddles, Bamboo Hurdles & Lotus Speed-Boost Pads)
    const patternDistances = [320, 560, 820, 1080, 1340, 1580];
    for (let lane = 0; lane < laneCount; lane++) {
      const laneY = this.trackTop + (lane + 0.5) * laneH;
      patternDistances.forEach((baseDist, pIdx) => {
        const dist = baseDist + ((lane * 37 + pIdx * 19) % 70) - 35;
        const kind: TrackObstacle['kind'] =
          pIdx % 3 === 0 ? 'hurdle' : pIdx % 3 === 1 ? 'lotus_pad' : 'mud';
        const cont = this.add.container(-200, laneY).setDepth(12 + lane);

        if (kind === 'mud') {
          const puddle = this.add.ellipse(0, 6, 46, 18, 0x451a03, 0.9).setStrokeStyle(1.5, 0x78350f);
          const splash = this.add.text(0, -4, '💧', { fontSize: '12px' }).setOrigin(0.5);
          cont.add([puddle, splash]);
        } else if (kind === 'hurdle') {
          const bar = this.add.rectangle(0, 0, 14, Math.min(34, laneH * 0.65), 0x65a30d).setStrokeStyle(2, 0xfef08a);
          const tag = this.add.text(0, -18, 'JUMP [E]', {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#fef08a',
            backgroundColor: 'rgba(15,23,42,0.75)',
            padding: { x: 3, y: 1 },
          }).setOrigin(0.5);
          cont.add([bar, tag]);
        } else {
          const pad = this.add.ellipse(0, 4, 42, 20, 0xf472b6, 0.85).setStrokeStyle(2, 0xfef08a);
          const bloom = this.add.text(0, 2, '🪷', { fontSize: '15px' }).setOrigin(0.5);
          vfxManager.applyBloom(this, pad, { color: 0xf472b6, strength: 1.3 });
          cont.add([pad, bloom]);
        }

        this.obstacles.push({
          kind,
          laneIdx: lane,
          distance: dist,
          width: 34,
          triggered: false,
          visual: cont,
        });
      });
    }

    // 3. Spawn 6 Pet Racers (Lane 0 = Player's Pet; Lanes 1..5 = Village Rival Pets)
    const playerStage = getPetProgress(this.initialState, this.playerPetId).stage;
    const playerPetName = ITEM_CATALOG[this.playerPetId]?.name ?? 'Village Puppy';
    const specs: Array<{
      id: string;
      owner: string;
      petId: string;
      petName: string;
      stage: PetEvolutionStage;
      isPlayer: boolean;
      aiSpeed: number;
    }> = [
      {
        id: 'player',
        owner: `${this.initialState.name} (YOU)`,
        petId: this.playerPetId,
        petName: playerPetName,
        stage: playerStage,
        isPlayer: true,
        aiSpeed: 0,
      },
      ...RIVAL_PETS.map((r, i) => ({
        id: `rival_${i}`,
        owner: r.owner,
        petId: r.petId,
        petName: r.label,
        stage: r.stage,
        isPlayer: false,
        aiSpeed: r.speed,
      })),
    ];

    specs.forEach((sp, laneIdx) => {
      const laneY = this.trackTop + (laneIdx + 0.5) * laneH;
      const cont = this.add.container(this.trackLeft, laneY).setDepth(30 + laneIdx);

      const shadow = this.add.ellipse(0, 12, 32, 10, 0x000000, 0.42);
      cont.add(shadow);

      let aura: Phaser.GameObjects.Arc | undefined;
      if (sp.stage === 3) {
        aura = this.add
          .circle(0, -2, 22, 0xfacc15, 0.25)
          .setStrokeStyle(2, 0x38bdf8, 0.9)
          .setBlendMode(Phaser.BlendModes.ADD);
        vfxManager.applyBloom(this, aura, { color: 0xfde047, strength: 1.5 });
        cont.add(aura);
      }

      const tex = resolveRaceTexture(sp.petId);
      let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
      if (this.textures.exists(tex.key)) {
        const spNode = this.add.sprite(0, 2, tex.key, 0).setScale(tex.scale).setOrigin(0.5, 0.72);
        if (tex.tint) spNode.setTint(tex.tint);
        sprite = spNode;
      } else {
        sprite = this.add.circle(0, 0, 14, sp.isPlayer ? 0xfacc15 : 0x38bdf8).setStrokeStyle(2, 0xffffff);
      }
      cont.add(sprite);

      const ribbonBadge = sp.isPlayer && this.initialState.championPetRibbon ? '🎀 ' : '';
      const label = this.add
        .text(0, -24, `${ribbonBadge}${sp.owner} · ${sp.petName} (S${sp.stage})`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: sp.isPlayer ? '#fef08a' : '#f8fafc',
          backgroundColor: sp.isPlayer ? 'rgba(120, 53, 15, 0.92)' : 'rgba(15, 23, 42, 0.78)',
          padding: { x: 5, y: 1 },
        })
        .setOrigin(0.5);
      cont.add(label);

      this.racers.push({
        id: sp.id,
        ownerName: sp.owner,
        petId: sp.petId,
        petName: sp.petName,
        stage: sp.stage,
        isPlayer: sp.isPlayer,
        laneIdx,
        laneY,
        distance: 0,
        speed: 0,
        hopTimerMs: 0,
        mudSlowMs: 0,
        boostMs: 0,
        aiBaseSpeed: sp.aiSpeed,
        aiPhase: laneIdx * 1.3,
        finishedAt: null,
        container: cont,
        sprite,
        aura,
        label,
        lastTrailAt: 0,
      });
    });

    // 4. Race HUD: Title, Distance Progress Bar, Stamina Sweet-Spot Bar & Touch Action Buttons
    const cx = w / 2;
    this.hudStatusText = this.add
      .text(cx, 74, '🐾 VILLAGE PET RACING ARENA · Normalized Fair Stats — Skill Decides!', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: { x: 12, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setDepth(100);

    // Distance progress bar
    this.add.rectangle(cx, 114, 380, 12, 0x0f172a, 0.9).setStrokeStyle(2, 0xfacc15).setDepth(100);
    this.progressFill = this.add.rectangle(cx - 188, 114, 4, 8, 0x4ade80).setOrigin(0, 0.5).setDepth(101);

    // Bottom Stamina Sweet-Spot Gauge (62..88 is golden sweet spot!)
    const barY = h - 86;
    const barW = 280;
    this.add.rectangle(cx, barY, barW, 18, 0x0f172a, 0.92).setStrokeStyle(2, 0x94a3b8).setDepth(100);
    // Sweet spot golden zone (62%..88%)
    const sweetX = cx - barW / 2 + barW * 0.62;
    const sweetW = barW * 0.26;
    this.add.rectangle(sweetX, barY, sweetW, 14, 0xfacc15, 0.85).setOrigin(0, 0.5).setDepth(101);
    this.staminaNeedle = this.add.rectangle(cx, barY, 6, 24, 0xffffff, 1).setStrokeStyle(1.5, 0x0f172a).setDepth(102);

    this.feedbackText = this.add
      .text(cx, barY - 22, '🔥 Hit [SPACE] when white needle is in GOLD Sweet Spot for CHEER BOOST! Hit [E] over Hurdles!', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 8, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(105);

    // Action buttons (PC + Mobile touch friendly)
    const boostBtn = this.add
      .rectangle(cx - 125, h - 38, 215, 42, 0xd97706, 0.96)
      .setStrokeStyle(3, 0xfef08a)
      .setDepth(110)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx - 125, h - 38, '📣 CHEER BOOST [SPACE]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fffbeb',
      })
      .setOrigin(0.5)
      .setDepth(111);
    boostBtn.on('pointerdown', () => this.triggerCheerBoost());

    const hopBtn = this.add
      .rectangle(cx + 125, h - 38, 215, 42, 0x059669, 0.96)
      .setStrokeStyle(3, 0xa7f3d0)
      .setDepth(110)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx + 125, h - 38, '🦘 HOP HURDLE [E]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ecfdf5',
      })
      .setOrigin(0.5)
      .setDepth(111);
    hopBtn.on('pointerdown', () => this.triggerHurdleHop());

    this.countdownText = this.add
      .text(cx, h / 2 - 20, '3', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '74px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#451a03',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(150);

    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false);
      this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, false);
      this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false);
      this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC, false);
      this.input.keyboard.clearCaptures();
    }

    this.countdownStartedAt = this.time.now;
    soundManager.playSfx('wheel_tick');

    this.unsubs.push(
      EventBus.on('travel:execute', () => this.exitToGreenPark())
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      vfxManager.cleanupScene(this);
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
    });

    EventBus.emit('scene:ready', { zone: 'pet_race' });
    EventBus.emit('player:state', this.initialState);
  }

  private triggerCheerBoost(): void {
    if (this.phase !== 'racing') return;
    const now = this.time.now;
    if (now < this.cheerCooldownUntil) return;
    const player = this.racers[0];
    if (!player) return;

    this.cheerCooldownUntil = now + 420;
    if (this.staminaVal >= 60 && this.staminaVal <= 90) {
      player.boostMs = 950;
      player.speed = Math.min(350, player.speed + 95);
      soundManager.playSfx('magic');
      this.feedbackText.setText('✨ PERFECT CHEER BOOST! +Speed Surge!').setColor('#fde047');
    } else {
      player.speed = Math.max(150, player.speed + 24);
      soundManager.playSfx('click');
      this.feedbackText.setText('💨 Good Cheer! Aim for the GOLD Sweet Spot for Max Surge!').setColor('#bae6fd');
    }
  }

  private triggerHurdleHop(): void {
    if (this.phase !== 'racing') return;
    const player = this.racers[0];
    if (!player || player.hopTimerMs > 0) return;
    player.hopTimerMs = 560;
    soundManager.playSfx('arrow');
    this.feedbackText.setText('🦘 HOP! Clear those bamboo hurdles!').setColor('#6ee7b7');
  }

  private finishRace(): void {
    if (this.phase === 'finished') return;
    this.phase = 'finished';
    const elapsedSec = Math.max(1, (this.time.now - this.raceStartedAt) / 1000);
    const ranked = [...this.racers].sort((a, b) => {
      if (a.finishedAt !== null && b.finishedAt !== null) return a.finishedAt - b.finishedAt;
      if (a.finishedAt !== null) return -1;
      if (b.finishedAt !== null) return 1;
      return b.distance - a.distance;
    });
    const place = Math.max(1, ranked.findIndex((r) => r.isPlayer) + 1);
    const coins = place === 1 ? 450 : place === 2 ? 280 : place === 3 ? 180 : 100;
    const petXpTreats = place === 1 ? 3 : place <= 3 ? 2 : 1;
    const unlockedChampionRibbon = place === 1;

    soundManager.playSfx(place === 1 ? 'victory' : 'level_up');
    EventBus.emit('petRace:finished', {
      place,
      timeSec: Number(elapsedSec.toFixed(1)),
      coins,
      petXpTreats,
      unlockedChampionRibbon,
      petId: this.playerPetId,
    });

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.add
      .rectangle(cx, cy, 460, 210, 0x0f172a, 0.94)
      .setStrokeStyle(3, 0xfacc15)
      .setDepth(200);
    this.add
      .text(
        cx,
        cy - 54,
        place === 1 ? '🏆 1ST PLACE CHAMPION!' : `🐾 FINISHED #${place} (${elapsedSec.toFixed(1)}s)`,
        {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: place === 1 ? '#fde047' : '#a7f3d0',
        }
      )
      .setOrigin(0.5)
      .setDepth(201);
    this.add
      .text(
        cx,
        cy - 6,
        `+${coins} Coins · +${petXpTreats}× Pet XP Treats (+450 XP each)${
          unlockedChampionRibbon ? '\n🎀 Unlocked: Champion Pet Ribbon Collar!' : ''
        }`,
        {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#f8fafc',
          align: 'center',
        }
      )
      .setOrigin(0.5)
      .setDepth(201);

    const exitBtn = this.add
      .rectangle(cx, cy + 62, 230, 38, 0xd97706, 1)
      .setStrokeStyle(2, 0xfef08a)
      .setDepth(202)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx, cy + 62, '← Return to Green Park', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fffbeb',
      })
      .setOrigin(0.5)
      .setDepth(203);
    exitBtn.on('pointerdown', () => this.exitToGreenPark());
  }

  private exitToGreenPark(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 10, 18, 12);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId: 'green_park',
        spawnX: 800,
        spawnY: 560,
        goldenFlash: true,
        playerState: {
          ...this.initialState,
          zone: 'overworld',
          currentMapId: 'green_park',
        },
      });
    });
  }

  update(time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);

    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.exitToGreenPark();
      return;
    }

    if (this.phase === 'countdown') {
      const elapsed = time - this.countdownStartedAt;
      const step = 3 - Math.floor(elapsed / 700);
      if (step !== this.lastCountdownStep && step > 0) {
        this.lastCountdownStep = step;
        this.countdownText.setText(String(step));
        soundManager.playSfx('wheel_tick');
      }
      if (elapsed >= 2100) {
        this.phase = 'racing';
        this.raceStartedAt = time;
        this.countdownText.setText('GO! 🐾').setColor('#4ade80');
        soundManager.playSfx('victory');
        this.tweens.add({
          targets: this.countdownText,
          alpha: 0,
          scale: 1.4,
          duration: 550,
        });
      }
      return;
    }

    if (this.phase !== 'racing') return;

    // Input checks
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.triggerCheerBoost();
    }
    if (
      (this.eKey && Phaser.Input.Keyboard.JustDown(this.eKey)) ||
      (this.upKey && Phaser.Input.Keyboard.JustDown(this.upKey))
    ) {
      this.triggerHurdleHop();
    }

    // Oscillate stamina sweet-spot needle
    this.staminaVal += this.staminaDir * dt * 118;
    if (this.staminaVal >= 100) {
      this.staminaVal = 100;
      this.staminaDir = -1;
    } else if (this.staminaVal <= 0) {
      this.staminaVal = 0;
      this.staminaDir = 1;
    }
    const barW = 280;
    this.staminaNeedle.setX(this.scale.width / 2 - barW / 2 + (this.staminaVal / 100) * barW);

    const player = this.racers[0];

    // Update all 6 racers
    for (const r of this.racers) {
      if (r.hopTimerMs > 0) r.hopTimerMs = Math.max(0, r.hopTimerMs - delta);
      if (r.mudSlowMs > 0) r.mudSlowMs = Math.max(0, r.mudSlowMs - delta);
      if (r.boostMs > 0) r.boostMs = Math.max(0, r.boostMs - delta);

      if (r.isPlayer) {
        // Fair normalized base speed (215) + boost / mud modifiers
        const target = r.boostMs > 0 ? 318 : r.mudSlowMs > 0 ? 142 : 218;
        r.speed = Phaser.Math.Linear(r.speed || 200, target, 0.08);
      } else {
        const wave = Math.sin(time / 650 + r.aiPhase) * 24;
        const target = r.boostMs > 0 ? 305 : r.mudSlowMs > 0 ? 145 : r.aiBaseSpeed + wave;
        r.speed = Phaser.Math.Linear(r.speed || r.aiBaseSpeed, target, 0.07);
      }

      r.distance += r.speed * dt;
      if (r.distance >= TRACK_DISTANCE && r.finishedAt === null) {
        r.finishedAt = time;
        if (r.isPlayer) {
          this.finishRace();
          return;
        }
      }

      // Check lane obstacles
      for (const ob of this.obstacles) {
        if (ob.laneIdx !== r.laneIdx || ob.triggered) continue;
        if (Math.abs(r.distance - ob.distance) < 22) {
          ob.triggered = true;
          if (ob.kind === 'lotus_pad') {
            r.boostMs = 800;
            if (r.isPlayer) {
              soundManager.playSfx('magic');
              this.feedbackText.setText('🪷 LOTUS BOOST PAD! Zooming ahead!').setColor('#f472b6');
            }
          } else if (ob.kind === 'hurdle') {
            // AI hops ~65% of hurdles; player must press [E]
            const cleared = r.isPlayer ? r.hopTimerMs > 0 : Math.random() < 0.68;
            if (!cleared) {
              r.mudSlowMs = 700;
              r.speed *= 0.65;
              if (r.isPlayer) {
                soundManager.playSfx('bonk');
                this.feedbackText.setText('💥 Bonked bamboo hurdle! Press [E] earlier to hop!').setColor('#fca5a5');
              }
            } else if (r.isPlayer) {
              r.boostMs = 420;
              soundManager.playSfx('coin');
              this.feedbackText.setText('✨ CLEAN HURDLE HOP! +Speed!').setColor('#4ade80');
            }
          } else if (ob.kind === 'mud') {
            if (r.hopTimerMs <= 0) {
              r.mudSlowMs = 680;
              if (r.isPlayer) {
                soundManager.playSfx('splash');
                this.feedbackText.setText('💧 Mud puddle slow! Hop [E] or Cheer Boost [SPACE]!').setColor('#fde68a');
              }
            }
          }
        }
      }
    }

    // Camera scroll anchored smoothly around player's distance
    const viewSpan = this.trackRight - this.trackLeft;
    const cameraDist = Math.max(0, Math.min(TRACK_DISTANCE - viewSpan * 0.62, player.distance - viewSpan * 0.28));

    // Render obstacles in screen space
    for (const ob of this.obstacles) {
      const sx = this.trackLeft + (ob.distance - cameraDist);
      ob.visual.setPosition(sx, this.trackTop + (ob.laneIdx + 0.5) * ((this.trackBottom - this.trackTop) / 6));
      ob.visual.setVisible(sx > -60 && sx < this.scale.width + 60);
    }

    // Render checkered finish line
    this.finishLineGfx.clear();
    const finishX = this.trackLeft + (TRACK_DISTANCE - cameraDist);
    if (finishX > 0 && finishX < this.scale.width + 40) {
      const sq = 16;
      for (let y = this.trackTop; y < this.trackBottom; y += sq) {
        const idx = Math.floor((y - this.trackTop) / sq);
        this.finishLineGfx.fillStyle(idx % 2 === 0 ? 0xffffff : 0x0f172a, 0.95);
        this.finishLineGfx.fillRect(finishX, y, sq, sq);
        this.finishLineGfx.fillStyle(idx % 2 === 0 ? 0x0f172a : 0xffffff, 0.95);
        this.finishLineGfx.fillRect(finishX + sq, y, sq, sq);
      }
    }

    // Position pet racers & emit Stage 3 Mythic bloom trails
    for (const r of this.racers) {
      const sx = this.trackLeft + (r.distance - cameraDist);
      const hopArc = r.hopTimerMs > 0 ? Math.sin((r.hopTimerMs / 560) * Math.PI) * 26 : 0;
      const runBob = Math.sin(time / 90 + r.laneIdx) * 2.5;
      r.container.setPosition(sx, r.laneY - hopArc + runBob);

      if ((r.stage === 3 || r.boostMs > 0) && time - r.lastTrailAt > 95) {
        r.lastTrailAt = time;
        const p = this.add
          .circle(sx - 12, r.laneY - hopArc, r.stage === 3 ? 4.5 : 3.2, r.stage === 3 ? 0xfde047 : 0x38bdf8, 0.8)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(28);
        this.tweens.add({
          targets: p,
          x: sx - 36,
          alpha: 0,
          scale: 0.2,
          duration: 320,
          onComplete: () => p.destroy(),
        });
      }
    }

    // Update top progress bar & rank
    const pct = Math.max(0, Math.min(1, player.distance / TRACK_DISTANCE));
    this.progressFill.setDisplaySize(Math.max(4, Math.round(376 * pct)), 8);
    const currentRank =
      1 + this.racers.filter((r) => !r.isPlayer && r.distance > player.distance).length;
    this.hudStatusText.setText(
      `🐾 VILLAGE PET RACE · Position #${currentRank}/6 · ${Math.round(pct * 100)}% Complete`
    );
  }
}
