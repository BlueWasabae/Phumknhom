import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PlayerState } from '@shared/types';
import {
  ARTISAN_MACHINES,
  FRUIT_TREES,
  LIVESTOCK,
  PLOT_UNLOCK_COST,
  ROW_CROPS,
} from '../../data/cropsAndArtisan';
import {
  autoWaterAllPlotsForMonsoon,
  collectArtisanOutput,
  collectLivestock,
  fertilizePlot,
  formatRemainingTime,
  getLivestockProgress,
  getMachineProgress,
  getPlotProgress,
  getTreeProgress,
  harvestFruitTree,
  harvestPlot,
  infusePlotWithSpirit,
  plantSeedOnPlot,
  tillPlot,
  unlockPlot,
  waterPlot,
} from '../systems/FarmingEngine';
import { soundManager } from '../systems/SoundManager';
import { SeasonAtmosphereOverlay } from '../systems/SeasonClock';
import { EventBus, type FarmToolMode, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { PaperDoll } from '../entities/PaperDoll';
import { DEFAULT_LOADOUT } from '@shared/types';
import { fetchSharedBondFarmApi, syncSharedBondFarmApi } from '../network/ApiClient';

const FARM_W = 860;
const FARM_H = 600;
const HORIZON_H = 74;

// Starter 6x4 Farm Plot Grid (24 tiles)
const COLS = 6;
const ROWS = 4;
const PLOT_W = 42;
const PLOT_H = 34;
const GRID_X = 165;
const GRID_Y = 250;

const EXIT_X = 430;
const EXIT_Y = 550;
const STALL_X = 485;
const STALL_Y = 196;

interface PlotVisual {
  index: number;
  cx: number;
  cy: number;
  hitZone: Phaser.GameObjects.Rectangle;
  gfx: Phaser.GameObjects.Graphics;
  badgeText: Phaser.GameObjects.Text;
}

export class FarmScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private player!: Player;
  private colliders!: Phaser.Physics.Arcade.StaticGroup;

  private plots: PlotVisual[] = [];
  private dynamicLayer!: Phaser.GameObjects.Container;
  private timerTooltip!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  private selectedCropId = 'trakuon';
  private toolMode: FarmToolMode = 'smart';
  private hoveredPlotIndex: number | null = null;
  private hoveredTip: { x: number; y: number; text: string } | null = null;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };
  private nearExitSent = false;
  private transitioning = false;
  private lastVisualRefresh = 0;
  private atmosphere?: SeasonAtmosphereOverlay;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('FarmScene');
  }

  init(data?: { playerState?: PlayerState }): void {
    this.initialState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'farm',
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
          currencies: { ...data.playerState.currencies },
          lifeStats: { ...data.playerState.lifeStats },
        }
      : { ...INITIAL_PLAYER_STATE, zone: 'farm' };
    this.plots = [];
    this.hoveredPlotIndex = null;
    this.hoveredTip = null;
    this.nearExitSent = false;
    this.transitioning = false;
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    this.physics.world.gravity.y = 0;
    this.physics.world.setBounds(0, HORIZON_H, FARM_W, FARM_H - HORIZON_H);
    soundManager.playBgm('village');

    // 1. North Horizon Strip + Lush Serene Village Grass
    this.add
      .tileSprite(FARM_W / 2, HORIZON_H / 2, FARM_W, HORIZON_H, 'lf_sky')
      .setTileScale(0.65, 0.32)
      .setDepth(0);
    this.add
      .tileSprite(FARM_W / 2, HORIZON_H - 16, FARM_W, 68, 'lf_parallax_far')
      .setTileScale(0.4, 0.34)
      .setTint(0x2f7d4d)
      .setDepth(1);

    this.add
      .tileSprite(FARM_W / 2, HORIZON_H + (FARM_H - HORIZON_H) / 2, FARM_W, FARM_H - HORIZON_H, 'sv_grass')
      .setDepth(0);

    // Cozy Dirt Path from Stilt Farmhouse -> Garden -> Exit Gate
    this.add.tileSprite(EXIT_X, 370, 46, 360, 'sv_path').setDepth(2);
    this.add.tileSprite(430, 395, 580, 34, 'sv_path').setDepth(2);

    this.colliders = this.physics.add.staticGroup();
    this.buildHomesteadLandmarks();
    this.buildPlotGrid();

    // Dynamic layer for Fruit Trees, Livestock, and Artisan Machines
    this.dynamicLayer = this.add.container(0, 0).setDepth(320);

    // Player entity (8-layer PaperDoll + Pet follower!)
    this.player = new Player(this, EXIT_X, 495, this.initialState, 'overworld');
    this.physics.add.collider(this.player.sprite, this.colliders);

    // Live floating timer tooltip above hovered/nearby plots or artisan machines
    this.timerTooltip = this.add
      .text(0, 0, '', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef9c3',
        backgroundColor: 'rgba(24, 16, 10, 0.9)',
        padding: { x: 8, y: 4 },
      })
      .setResolution(2)
      .setScale(0.44)
      .setOrigin(0.5, 1)
      .setDepth(2700)
      .setVisible(false);

    this.promptText = this.add
      .text(0, 0, '', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: { x: 8, y: 4 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 1)
      .setDepth(2650)
      .setVisible(false);

    this.applyResponsiveZoom();
    this.scale.on('resize', this.applyResponsiveZoom, this);

    this.cameras.main.setBounds(0, 0, FARM_W, FARM_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.fadeIn(220, 10, 18, 12);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E', false) as Record<
      'W' | 'A' | 'S' | 'D' | 'E',
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.clearCaptures();

    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.joystick = vec;
      }),
      EventBus.on('player:chat', ({ text }) => {
        this.player.showSpeechBubble(text, 4500);
      }),
      EventBus.on('player:emote', ({ emoji }) => {
        this.player.showEmote(emoji, 3000);
      }),
      EventBus.on('player:loadoutChanged', ({ loadout, playerState }) => {
        this.player.applyLoadoutUpdate(loadout, playerState);
      }),
      EventBus.on('player:stateSync', (nextState) => {
        this.player.syncPlayerState(nextState);
        this.redrawAllPlots();
        this.redrawDynamicZones();
      }),
      EventBus.on('farm:stateUpdated', (nextState) => {
        this.player.syncPlayerState(nextState);
        this.redrawAllPlots();
        this.redrawDynamicZones();
      }),
      EventBus.on('farm:selectSeed', ({ cropId, toolMode }) => {
        this.selectedCropId = cropId;
        this.toolMode = toolMode;
      }),
      EventBus.on('travel:execute', (req) => {
        if (this.transitioning) return;
        soundManager.playSfx('magic');
        this.cameras.main.flash(260, 250, 204, 21);
        if (req.targetZone === 'farm') {
          this.player.sprite.setPosition(EXIT_X, 495);
          return;
        }
        this.time.delayedCall(220, () => {
          if (req.targetZone === 'club') {
            this.transitioning = true;
            this.scene.start('ClubScene', { playerState: { ...this.player.state, zone: 'club' } });
          } else if (req.targetZone === 'dungeon') {
            this.transitioning = true;
            this.scene.start('DungeonBossScene', {
              bossId: req.bossId ?? 'sdech_kongkaeb',
              difficulty: req.difficulty ?? 'normal',
              partyMode: 'solo',
              playerState: { ...this.player.state, zone: 'dungeon' },
            });
          } else {
            this.returnToOverworld(req.spawnX, req.spawnY, true, req.mapId ?? 'central_plaza');
          }
        });
      }),
      EventBus.on('input:interact', () => this.interactNearest()),
      EventBus.on('input:exitFarm', () => this.returnToOverworld())
    );

    this.redrawAllPlots();
    this.redrawDynamicZones();

    // Update 1.7 — Shared Co-op Farm Partner Helper, Shared Plot Sync & Pink Lotus Banner when bonded!
    if (this.player.state.bondPartner?.status === 'accepted') {
      const activeBond = this.player.state.bondPartner;
      const pName = activeBond.partnerName;
      void fetchSharedBondFarmApi(activeBond.bondId).then(({ plots, updatedBy }) => {
        if (!this.sys?.isActive() || !plots || plots.length !== this.player.state.farm.plots.length) return;
        this.player.state = {
          ...this.player.state,
          farm: { ...this.player.state.farm, plots },
        };
        EventBus.emit('player:state', this.player.state);
        this.redrawAllPlots();
        if (updatedBy && updatedBy !== this.player.state.name) {
          EventBus.emit('ui:toast', {
            text: `💞 Synced Shared Co-op Farm updates from ${updatedBy}!`,
          });
        }
      });
      this.add
        .text(270, 206, `💞 SHARED CO-OP FARM WITH ${pName.toUpperCase()}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fbcfe8',
          backgroundColor: 'rgba(131, 24, 67, 0.92)',
          padding: { x: 6, y: 2 },
        })
        .setResolution(2)
        .setScale(0.44)
        .setOrigin(0.5, 1)
        .setDepth(260);
      const partnerDoll = new PaperDoll(
        this,
        412,
        282,
        { ...DEFAULT_LOADOUT, shirt: 'shirt_krama_set', hairColor: '#451a03' },
        'bond_partner_farm'
      );
      partnerDoll.setScale(0.54).setDepth(282);
      partnerDoll.setPoseAndFacing('idle', 'left', 0);
      this.add
        .text(412, 294, `💍 ${pName}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fbcfe8',
          backgroundColor: 'rgba(131, 24, 67, 0.88)',
          padding: { x: 5, y: 1 },
        })
        .setResolution(2)
        .setScale(0.42)
        .setOrigin(0.5, 0)
        .setDepth(296);
    }

    // 4-Season Weather Particles & Day/Night Lighting Overlay (Monsoon auto-waters plots!)
    this.atmosphere = new SeasonAtmosphereOverlay(this, FARM_W, FARM_H);

    EventBus.emit('scene:ready', { zone: 'farm' });
    EventBus.emit('player:state', this.player.state);
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: 'overworld' });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.applyResponsiveZoom, this);
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.atmosphere?.destroy();
      this.atmosphere = undefined;
      this.player.destroy();
    });
  }

  private applyResponsiveZoom = (): void => {
    const w = this.scale.width;
    const zoom = w < 640 ? 2.15 : w < 1100 ? 2.45 : 2.7;
    this.cameras.main.setZoom(zoom);
  };

  private buildHomesteadLandmarks(): void {
    // 1. Custom Khmer Stilt Farmhouse (North-Center — Enterable Interior!)
    this.add.image(330, 198, 'soft_shadow').setDisplaySize(96, 26).setDepth(194);
    const houseImg = this.add
      .image(330, 200, 'khmer_stilt_house')
      .setOrigin(0.5, 0.92)
      .setScale(0.72)
      .setDepth(200)
      .setInteractive({ useHandCursor: true });
    houseImg.on('pointerdown', () => this.enterHouseInterior());
    const houseCol = this.add.rectangle(330, 184, 70, 32, 0x000000, 0);
    this.colliders.add(houseCol);
    this.add
      .text(330, 204, '🏡 ENTER HOME [E]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 5, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 0)
      .setDepth(210);

    // 2. Farm Seed & Artisan Stall (Next to Farmhouse — opens FarmModal)
    this.add.image(STALL_X, STALL_Y, 'soft_shadow').setDisplaySize(54, 18).setDepth(192);
    const stallImg = this.add
      .image(STALL_X, STALL_Y, 'num_pang_cart')
      .setOrigin(0.5, 0.92)
      .setScale(0.54)
      .setDepth(196)
      .setInteractive({ useHandCursor: true });
    stallImg.on('pointerdown', () => EventBus.emit('ui:openModal', { modal: 'farm', farmTab: 'seeds' }));

    const stallArrow = this.add.image(STALL_X, STALL_Y - 64, 'join_arrow').setScale(0.5).setDepth(250);
    this.tweens.add({ targets: stallArrow, y: STALL_Y - 70, duration: 560, yoyo: true, repeat: -1 });
    this.add
      .text(STALL_X, STALL_Y + 4, 'SEED & FARM STALL', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef9c3',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.44)
      .setOrigin(0.5, 0)
      .setDepth(210);

    // 3. Zone Signposts (Orchard, Livestock Pen, Artisan Yard)
    const zoneHeaders: Array<[number, number, string]> = [
      [270, 218, '6×4 CROP GARDEN'],
      [650, 178, 'FRUIT TREE ORCHARD'],
      [225, 428, 'LIVESTOCK PEN'],
      [645, 428, 'ARTISAN MACHINES'],
    ];
    for (const [zx, zy, title] of zoneHeaders) {
      this.add
        .text(zx, zy, title, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#fde68a',
          backgroundColor: 'rgba(69, 26, 3, 0.82)',
          padding: { x: 6, y: 2 },
        })
        .setResolution(2)
        .setScale(0.44)
        .setOrigin(0.5)
        .setDepth(50);
    }

    // 4. Livestock Wooden Fence Backdrop (Bottom-Left)
    this.add.image(225, 488, 'sv_fence_pen').setScale(1.75, 1.35).setDepth(18);

    // 5. Artisan Stone Courtyard Pad (Bottom-Right)
    const artPad = this.add.graphics().setDepth(5);
    artPad.fillStyle(0x7c5b3b, 0.75);
    artPad.fillRoundedRect(540, 442, 215, 86, 8);
    this.add.tileSprite(647, 485, 206, 78, 'sv_plaza_tile').setDepth(6);

    // 6. Decorative Border Trees (Sugar Palms + Serene Village Trees with gentle breeze sway)
    const borderTrees: Array<[number, number, 'sugar_palm_tree' | 'sv_tree_green']> = [
      [68, 165, 'sugar_palm_tree'], [76, 360, 'sv_tree_green'], [72, 530, 'sugar_palm_tree'],
      [790, 165, 'sugar_palm_tree'], [796, 365, 'sv_tree_green'], [790, 535, 'sugar_palm_tree'],
    ];
    borderTrees.forEach(([tx, ty, tex], idx) => {
      this.add.image(tx, ty - 2, 'soft_shadow').setDisplaySize(36, 12).setDepth(ty - 4);
      const tImg = this.add
        .image(tx, ty, tex)
        .setOrigin(0.5, 0.92)
        .setScale(tex === 'sugar_palm_tree' ? 0.85 : 1.1)
        .setDepth(ty);
      this.tweens.add({
        targets: tImg,
        angle: idx % 2 === 0 ? 2 : -2,
        duration: 2200 + idx * 240,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // 7. South Village Exit Gate + Bouncing Yellow JOIN Arrow
    const exitPad = this.add
      .rectangle(EXIT_X, EXIT_Y, 64, 24, 0x78350f, 0.85)
      .setStrokeStyle(2, 0xfacc15)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });
    exitPad.on('pointerdown', () => this.returnToOverworld());

    const exitArrow = this.add.image(EXIT_X, EXIT_Y - 26, 'join_arrow').setScale(0.56).setDepth(600);
    this.tweens.add({ targets: exitArrow, y: EXIT_Y - 32, duration: 540, yoyo: true, repeat: -1 });
    this.add
      .text(EXIT_X, EXIT_Y + 14, 'EXIT TO PHUM VILLAGE', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 7, y: 2 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5, 0)
      .setDepth(600);
  }

  private buildPlotGrid(): void {
    // Cozy timber garden border around the 6x4 grid
    const border = this.add.graphics().setDepth(4);
    border.fillStyle(0x6b4226, 0.55);
    border.fillRoundedRect(
      GRID_X - PLOT_W / 2 - 8,
      GRID_Y - PLOT_H / 2 - 8,
      COLS * PLOT_W + 16,
      ROWS * PLOT_H + 16,
      8
    );

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const index = r * COLS + c;
        const cx = GRID_X + c * PLOT_W;
        const cy = GRID_Y + r * PLOT_H;

        const gfx = this.add.graphics().setDepth(cy - 6);
        const hitZone = this.add
          .rectangle(cx, cy, PLOT_W - 4, PLOT_H - 4, 0x000000, 0)
          .setDepth(cy + 2)
          .setInteractive({ useHandCursor: true });

        const badgeText = this.add
          .text(cx, cy + 12, '', {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#fef08a',
            stroke: '#1e1b4b',
            strokeThickness: 3,
          })
          .setResolution(2)
          .setScale(0.38)
          .setOrigin(0.5, 1)
          .setDepth(cy + 14);

        hitZone.on('pointerdown', () => this.handlePlotClick(index));
        hitZone.on('pointerover', () => {
          this.hoveredPlotIndex = index;
        });
        hitZone.on('pointerout', () => {
          if (this.hoveredPlotIndex === index) this.hoveredPlotIndex = null;
        });

        this.plots.push({ index, cx, cy, hitZone, gfx, badgeText });
      }
    }
  }

  private commitFarmState(nextState: PlayerState, msg: string, ok: boolean): void {
    if (ok) {
      this.player.state = { ...nextState, zone: 'farm' };
      EventBus.emit('player:state', this.player.state);
      this.redrawAllPlots();
      this.redrawDynamicZones();
      const activeBond = this.player.state.bondPartner;
      if (activeBond?.status === 'accepted') {
        void syncSharedBondFarmApi(activeBond.bondId, this.player.state.name, this.player.state.farm.plots);
      }
    }
    EventBus.emit('ui:toast', { text: msg });
  }

  private spawnPopSparkle(x: number, y: number, colorHex: number, text: string): void {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const dot = this.add.circle(x, y, 2.5, colorHex, 0.95).setDepth(2600);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(a) * 18,
        y: y + Math.sin(a) * 14 - 4,
        alpha: 0,
        duration: 320,
        onComplete: () => dot.destroy(),
      });
    }
    const label = this.add
      .text(x, y - 8, text, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: colorHex === 0xfacc15 ? '#fde047' : '#ffffff',
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setResolution(2)
      .setScale(0.48)
      .setOrigin(0.5)
      .setDepth(2650);
    this.tweens.add({
      targets: label,
      y: y - 24,
      alpha: 0,
      duration: 750,
      onComplete: () => label.destroy(),
    });
  }

  private handlePlotClick(index: number): void {
    const plot = this.player.state.farm.plots[index];
    const visual = this.plots[index];
    if (!plot || !visual) return;

    const now = Date.now();
    if (!plot.unlocked) {
      const res = unlockPlot(this.player.state, index);
      if (res.ok) {
        soundManager.playSfx('coin');
        this.spawnPopSparkle(visual.cx, visual.cy, 0xfacc15, 'Unlocked!');
      }
      this.commitFarmState(res.state, res.message, res.ok);
      return;
    }

    if (!plot.tilled) {
      const res = tillPlot(this.player.state, index);
      if (res.ok) {
        soundManager.playSfx('click');
        this.spawnPopSparkle(visual.cx, visual.cy, 0xd97706, 'Tilled');
      }
      this.commitFarmState(res.state, res.message, res.ok);
      return;
    }

    if (!plot.cropId) {
      const res = plantSeedOnPlot(this.player.state, index, this.selectedCropId, now);
      if (res.ok) {
        soundManager.playSfx('click');
        this.spawnPopSparkle(visual.cx, visual.cy, 0x4ade80, 'Planted!');
      }
      this.commitFarmState(res.state, res.message, res.ok);
      return;
    }

    if (this.toolMode === 'infuse') {
      const res = infusePlotWithSpirit(this.player.state, index);
      if (res.ok) {
        soundManager.playSfx('magic');
        this.spawnPopSparkle(visual.cx, visual.cy, 0x22d3ee, '✨ SPIRIT INFUSED!');
        this.spawnPopSparkle(visual.cx, visual.cy - 6, 0xfacc15, '🌟 MUTATED');
      }
      this.commitFarmState(res.state, res.message, res.ok);
      return;
    }

    const prog = getPlotProgress(plot, now);
    if (prog.ready) {
      const res = harvestPlot(this.player.state, index, now);
      if (res.ok) {
        soundManager.playSfx('harvest');
        EventBus.emit('bounty:progress', { category: 'harvest_crops', amount: 1 });
        this.spawnPopSparkle(
          visual.cx,
          visual.cy,
          res.goldStar ? 0xfacc15 : 0x4ade80,
          res.goldStar ? '★ GOLD STAR!' : '+1 Harvest!'
        );
      }
      this.commitFarmState(res.state, res.message, res.ok);
      return;
    }

    if (this.toolMode === 'fertilize') {
      const res = fertilizePlot(this.player.state, index);
      if (res.ok) this.spawnPopSparkle(visual.cx, visual.cy, 0xfacc15, 'Fertilized ★');
      this.commitFarmState(res.state, res.message, res.ok);
      return;
    }

    if (!plot.watered) {
      const res = waterPlot(this.player.state, index, now);
      if (res.ok) this.spawnPopSparkle(visual.cx, visual.cy, 0x38bdf8, '💧 -20% Time');
      this.commitFarmState(res.state, res.message, res.ok);
      return;
    }

    // If already watered and player taps again, offer fertilizer automatically if owned
    if (!plot.fertilized && this.player.state.inventory.some((i) => i.itemId === 'fertilizer' && i.quantity > 0)) {
      const res = fertilizePlot(this.player.state, index);
      if (res.ok) this.spawnPopSparkle(visual.cx, visual.cy, 0xfacc15, 'Fertilized ★');
      this.commitFarmState(res.state, res.message, res.ok);
      return;
    }

    EventBus.emit('ui:toast', {
      text: `${ROW_CROPS[plot.cropId]?.name ?? 'Crop'}: ${formatRemainingTime(prog.remainingMs)} remaining`,
    });
  }

  private redrawAllPlots(): void {
    const now = Date.now();
    for (const pv of this.plots) {
      const plot = this.player.state.farm.plots[pv.index];
      pv.gfx.clear();
      if (!plot) continue;

      const x0 = pv.cx - (PLOT_W - 6) / 2;
      const y0 = pv.cy - (PLOT_H - 6) / 2;
      const w = PLOT_W - 6;
      const h = PLOT_H - 6;

      if (!plot.unlocked) {
        pv.gfx.fillStyle(0x3f6212, 0.55);
        pv.gfx.lineStyle(1, 0x854d0e, 0.65);
        pv.gfx.fillRoundedRect(x0, y0, w, h, 4);
        pv.gfx.strokeRoundedRect(x0, y0, w, h, 4);
        pv.badgeText.setText(`🔒${PLOT_UNLOCK_COST}c`).setColor('#fef08a');
        continue;
      }

      if (!plot.tilled) {
        pv.gfx.fillStyle(0x4d7c0f, 0.55);
        pv.gfx.lineStyle(1, 0x365314, 0.8);
        pv.gfx.fillRoundedRect(x0, y0, w, h, 4);
        pv.gfx.strokeRoundedRect(x0, y0, w, h, 4);
        pv.badgeText.setText('Till').setColor('#d9f99d');
        continue;
      }

      // Tilled soil (darker rich earth when watered)
      pv.gfx.fillStyle(plot.watered ? 0x5c3409 : 0x925418, 1);
      pv.gfx.lineStyle(1.2, 0x451a03, 1);
      pv.gfx.fillRoundedRect(x0, y0, w, h, 4);
      pv.gfx.strokeRoundedRect(x0, y0, w, h, 4);

      // Soil furrow lines
      pv.gfx.lineStyle(1, plot.watered ? 0x451a03 : 0x78350f, 0.7);
      pv.gfx.lineBetween(x0 + 4, pv.cy - 4, x0 + w - 4, pv.cy - 4);
      pv.gfx.lineBetween(x0 + 4, pv.cy + 4, x0 + w - 4, pv.cy + 4);

      if (plot.fertilized) {
        // Golden nutrient sparkles on fertilized soil
        pv.gfx.fillStyle(0xfacc15, 0.9);
        pv.gfx.fillRect(x0 + 4, y0 + 3, 2, 2);
        pv.gfx.fillRect(x0 + w - 6, y0 + h - 5, 2, 2);
      }

      if (!plot.cropId) {
        pv.badgeText.setText('');
        continue;
      }

      const crop = ROW_CROPS[plot.cropId];
      const prog = getPlotProgress(plot, now);
      const colHex = Number((crop?.stageColors[prog.stage] || '#22c55e').replace('#', '0x'));
      const r = 3 + prog.stage * 2.5;

      // Pixel-crisp multi-tuft crop visual
      pv.gfx.fillStyle(colHex, 1);
      pv.gfx.fillCircle(pv.cx - 6, pv.cy - 1, r * 0.75);
      pv.gfx.fillCircle(pv.cx + 6, pv.cy - 1, r * 0.75);
      pv.gfx.fillCircle(pv.cx, pv.cy - 4, r);

      // Update 1.6 — Shimmering cyan/gold spirit aura & sparkles on Spirit-Infused plots!
      if (plot.spiritInfused) {
        const pulse = 0.55 + Math.sin(now / 260 + pv.index) * 0.35;
        pv.gfx.lineStyle(2, 0x22d3ee, pulse);
        pv.gfx.strokeRoundedRect(x0 - 1.5, y0 - 1.5, w + 3, h + 3, 5);
        pv.gfx.fillStyle(0x38bdf8, 0.24);
        pv.gfx.fillCircle(pv.cx, pv.cy - 3, r + 5);
        pv.gfx.fillStyle(0xfef08a, 0.95);
        const orbit = (now / 450 + pv.index) % (Math.PI * 2);
        pv.gfx.fillCircle(pv.cx + Math.cos(orbit) * 10, pv.cy - 4 + Math.sin(orbit) * 6, 1.8);
        pv.gfx.fillStyle(0x67e8f9, 0.95);
        pv.gfx.fillCircle(pv.cx - Math.cos(orbit) * 10, pv.cy - 2 - Math.sin(orbit) * 6, 1.6);
      }

      if (prog.ready) {
        pv.gfx.lineStyle(1.6, plot.spiritInfused ? 0x22d3ee : 0xfef08a, 1);
        pv.gfx.strokeRoundedRect(x0 - 1, y0 - 1, w + 2, h + 2, 5);
        pv.badgeText
          .setText(plot.spiritInfused ? '✨ SPIRIT!' : 'READY!')
          .setColor(plot.spiritInfused ? '#67e8f9' : '#fde047');
      } else {
        const prefix = `${plot.spiritInfused ? '✨' : ''}${plot.watered ? '💧' : ''}${plot.fertilized ? '★' : ''}`;
        pv.badgeText
          .setText(`${prefix}${formatRemainingTime(prog.remainingMs)}`)
          .setColor(plot.spiritInfused ? '#67e8f9' : '#fef9c3');
      }
    }
  }

  private redrawDynamicZones(): void {
    this.dynamicLayer.removeAll(true);
    const now = Date.now();

    // ---- 1. FRUIT TREE ORCHARD (Top-Right, up to 4 trees) ----
    const treeCoords: Array<[number, number]> = [
      [585, 245],
      [685, 245],
      [585, 330],
      [685, 330],
    ];
    this.player.state.farm.trees.forEach((tree, idx) => {
      const [tx, ty] = treeCoords[idx] ?? [635, 290];
      const def = FRUIT_TREES[tree.treeId];
      if (!def) return;
      const prog = getTreeProgress(tree, now);

      const treeTex =
        tree.treeId === 'golden_durian'
          ? 'golden_durian_tree'
          : tree.treeId === 'sugar_palm' || tree.treeId === 'coconut_palm'
          ? 'sugar_palm_tree'
          : 'sv_tree_teal';
      const usesKhmerTree = treeTex === 'sugar_palm_tree' || treeTex === 'golden_durian_tree';

      const shadow = this.add.image(tx, ty - 2, 'soft_shadow').setDisplaySize(38, 12);
      const img = this.add
        .image(tx, ty, treeTex)
        .setOrigin(0.5, 0.92)
        .setScale(prog.ready || tree.mature ? (usesKhmerTree ? 0.86 : 1.05) : 0.62)
        .setInteractive({ useHandCursor: true });
      if (!usesKhmerTree) {
        img.setTint(Number(def.canopyColor.replace('#', '0x')));
      }

      const g = this.add.graphics();
      if (prog.ready) {
        const fCol = Number(def.fruitColor.replace('#', '0x'));
        g.fillStyle(fCol, 1);
        g.fillCircle(tx - 8, ty - 26, 3.5);
        g.fillCircle(tx + 7, ty - 22, 3.5);
        g.fillCircle(tx, ty - 33, 3.5);
      }

      const lbl = this.add
        .text(tx, ty + 4, prog.ready ? `★ ${def.name}` : `${def.name.split(' ')[0]} ${formatRemainingTime(prog.remainingMs)}`, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: prog.ready ? '#fde047' : '#fef9c3',
          backgroundColor: 'rgba(15, 23, 42, 0.78)',
          padding: { x: 4, y: 1 },
        })
        .setResolution(2)
        .setScale(0.4)
        .setOrigin(0.5, 0);

      img.on('pointerdown', () => {
        if (prog.ready) {
          const res = harvestFruitTree(this.player.state, idx, Date.now());
          if (res.ok) this.spawnPopSparkle(tx, ty - 20, 0xfacc15, `+${def.outputQuantity} Fruit!`);
          this.commitFarmState(res.state, res.message, res.ok);
        } else {
          EventBus.emit('ui:openModal', { modal: 'farm', farmTab: 'livestock' });
        }
      });

      this.dynamicLayer.add([shadow, img, g, lbl]);
    });

    // ---- 2. LIVESTOCK PEN (Bottom-Left, up to 4 animals) ----
    const penCoords: Array<[number, number]> = [
      [195, 475],
      [255, 475],
      [195, 505],
      [255, 505],
    ];
    this.player.state.farm.livestock.forEach((pen, idx) => {
      const [lx, ly] = penCoords[idx] ?? [225, 488];
      const def = LIVESTOCK[pen.animalId];
      if (!def) return;
      const prog = getLivestockProgress(pen, now);

      const g = this.add.graphics();
      g.fillStyle(Number(def.bodyColor.replace('#', '0x')), 1);
      g.lineStyle(1.4, 0x26140c, 1);
      g.fillRoundedRect(lx - 8, ly - 8, 16, 12, 4);
      g.strokeRoundedRect(lx - 8, ly - 8, 16, 12, 4);
      g.fillStyle(Number(def.accentColor.replace('#', '0x')), 1);
      g.fillRect(lx - 4, ly - 10, 6, 3);

      const hit = this.add
        .rectangle(lx, ly, 26, 22, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        if (prog.ready) {
          const res = collectLivestock(this.player.state, idx, Date.now());
          if (res.ok) this.spawnPopSparkle(lx, ly - 8, 0xfacc15, 'Collected!');
          this.commitFarmState(res.state, res.message, res.ok);
        } else {
          EventBus.emit('ui:openModal', { modal: 'farm', farmTab: 'livestock' });
        }
      });

      const lbl = this.add
        .text(lx, ly + 8, prog.ready ? '★ COLLECT' : formatRemainingTime(prog.remainingMs), {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: prog.ready ? '#fde047' : '#e2e8f0',
          stroke: '#0f172a',
          strokeThickness: 3,
        })
        .setResolution(2)
        .setScale(0.38)
        .setOrigin(0.5, 0);

      this.dynamicLayer.add([g, hit, lbl]);
    });

    // ---- 3. ARTISAN PROCESSING MACHINES (Bottom-Right, up to 6 slots) ----
    const machCoords: Array<[number, number]> = [
      [575, 472],
      [645, 472],
      [715, 472],
      [575, 510],
      [645, 510],
      [715, 510],
    ];
    this.player.state.farm.machines.forEach((m, idx) => {
      const [mx, my] = machCoords[idx] ?? [645, 488];
      const def = ARTISAN_MACHINES[m.machineId];
      if (!def) return;
      const prog = getMachineProgress(m, now);
      const busy = Boolean(m.recipeId);

      const g = this.add.graphics();
      g.fillStyle(Number(def.primaryColor.replace('#', '0x')), 1);
      g.lineStyle(1.6, 0x26140c, 1);
      g.fillRoundedRect(mx - 12, my - 14, 24, 22, 4);
      g.strokeRoundedRect(mx - 12, my - 14, 24, 22, 4);
      g.fillStyle(Number(def.accentColor.replace('#', '0x')), 1);
      g.fillRect(mx - 9, my - 10, 18, 5);

      if (prog.ready) {
        g.lineStyle(2, 0xfef08a, 1);
        g.strokeCircle(mx, my - 3, 15);
      }

      const hit = this.add
        .rectangle(mx, my - 3, 30, 26, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hit.on('pointerover', () => {
        this.hoveredTip = {
          x: mx,
          y: my - 18,
          text: busy
            ? `${def.name} · ${prog.ready ? 'READY!' : formatRemainingTime(prog.remainingMs)}`
            : `${def.name} · Idle (Tap to Load)`,
        };
      });
      hit.on('pointerout', () => {
        this.hoveredTip = null;
      });
      hit.on('pointerdown', () => {
        if (busy && prog.ready) {
          const res = collectArtisanOutput(this.player.state, idx, Date.now());
          if (res.ok) this.spawnPopSparkle(mx, my - 10, 0xfacc15, 'Artisan Ready!');
          this.commitFarmState(res.state, res.message, res.ok);
        } else {
          EventBus.emit('ui:openModal', { modal: 'farm', farmTab: 'artisan' });
        }
      });

      const status = busy
        ? prog.ready
          ? '★ READY'
          : formatRemainingTime(prog.remainingMs)
        : def.name.split(' ')[0];
      const lbl = this.add
        .text(mx, my + 10, status, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: prog.ready ? '#fde047' : busy ? '#7dd3fc' : '#fef3c7',
          stroke: '#0f172a',
          strokeThickness: 3,
        })
        .setResolution(2)
        .setScale(0.38)
        .setOrigin(0.5, 0);

      this.dynamicLayer.add([g, hit, lbl]);
    });
  }

  private interactNearest(): void {
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_X, EXIT_Y) < 46) {
      this.returnToOverworld();
      return;
    }
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 330, 212) < 58) {
      this.enterHouseInterior();
      return;
    }
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, STALL_X, STALL_Y) < 52) {
      EventBus.emit('ui:openModal', { modal: 'farm', farmTab: 'seeds' });
      return;
    }
    // Check nearest plot
    let bestPlot: PlotVisual | null = null;
    let bestD = Infinity;
    for (const pv of this.plots) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, pv.cx, pv.cy);
      if (d < 34 && d < bestD) {
        bestD = d;
        bestPlot = pv;
      }
    }
    if (bestPlot) {
      this.handlePlotClick(bestPlot.index);
      return;
    }
    // Otherwise open Farm Stall modal for convenience
    EventBus.emit('ui:openModal', { modal: 'farm', farmTab: 'seeds' });
  }

  private enterHouseInterior(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 12, 10, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('HouseInteriorScene', {
        returnZone: 'farm',
        playerState: {
          ...this.player.state,
          zone: 'house',
          weapon: { ...this.player.state.weapon },
          loadout: { ...this.player.state.loadout },
          currencies: { ...this.player.state.currencies },
          lifeStats: { ...this.player.state.lifeStats },
        },
      });
    });
  }

  private returnToOverworld(
    spawnX = 220,
    spawnY = 600,
    goldenFlash = false,
    mapId: 'central_plaza' | 'market_street' | 'temple_district' | 'green_park' | 'wild_frontier' = 'central_plaza'
  ): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(220, 8, 12, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId,
        spawnX,
        spawnY,
        goldenFlash,
        playerState: {
          ...this.player.state,
          zone: 'overworld',
          currentMapId: mapId,
          weapon: { ...this.player.state.weapon },
          loadout: { ...this.player.state.loadout },
          currencies: { ...this.player.state.currencies },
          lifeStats: { ...this.player.state.lifeStats },
        },
      });
    });
  }

  update(time: number, delta: number): void {
    const typing =
      document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

    let vx = this.joystick.x;
    let vy = this.joystick.y;

    if (!typing && !this.transitioning) {
      if (this.cursors.left.isDown || this.keys.A.isDown) vx -= 1;
      if (this.cursors.right.isDown || this.keys.D.isDown) vx += 1;
      if (this.cursors.up.isDown || this.keys.W.isDown) vy -= 1;
      if (this.cursors.down.isDown || this.keys.S.isDown) vy += 1;

      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.interactNearest();
      }
    }

    const len = Math.hypot(vx, vy);
    if (len > 0.1) {
      const speed = 118;
      const nx = vx / Math.max(1, len);
      const ny = vy / Math.max(1, len);
      this.player.body.setVelocity(nx * speed, ny * speed);
      if (Math.abs(nx) >= Math.abs(ny)) {
        this.player.facing = nx < 0 ? 'left' : 'right';
      } else {
        this.player.facing = ny < 0 ? 'up' : 'down';
      }
      this.player.playStateAnimation('walk');
    } else {
      this.player.body.setVelocity(0, 0);
      this.player.playStateAnimation('idle');
    }

    this.player.syncVisuals(time, true);
    const weatherSnap = this.atmosphere?.update(time, delta);

    // Refresh plot/tree/livestock/machine countdown badges every 1s + Monsoon Auto-Watering!
    if (time - this.lastVisualRefresh > 1000) {
      this.lastVisualRefresh = time;
      if (weatherSnap?.season.autoWatersFarm) {
        const rainRes = autoWaterAllPlotsForMonsoon(this.player.state, Date.now());
        if (rainRes.wateredCount > 0) {
          this.player.state = { ...rainRes.state, zone: 'farm' };
          EventBus.emit('player:state', this.player.state);
          soundManager.playSfx('splash');
          EventBus.emit('ui:toast', {
            text: `🌧️ Monsoon Rains auto-watered ${rainRes.wateredCount} farm plot(s) (-20% grow time)!`,
          });
          EventBus.emit('ticker:push', {
            text: `🌧️ Monsoon Rain has begun — ${this.player.state.name}'s Personal Farm plots auto-watered!`,
            category: 'weather',
          });
        }
      }
      this.redrawAllPlots();
      this.redrawDynamicZones();
    }

    // Update live hover/nearby timer tooltip
    const now = Date.now();
    if (this.hoveredTip) {
      this.timerTooltip.setPosition(this.hoveredTip.x, this.hoveredTip.y).setText(this.hoveredTip.text).setVisible(true);
    } else if (this.hoveredPlotIndex !== null) {
      const pv = this.plots[this.hoveredPlotIndex];
      const plot = this.player.state.farm.plots[this.hoveredPlotIndex];
      if (pv && plot?.cropId) {
        const crop = ROW_CROPS[plot.cropId];
        const prog = getPlotProgress(plot, now);
        this.timerTooltip
          .setPosition(pv.cx, pv.cy - 18)
          .setText(`${crop?.name ?? 'Crop'} · ${prog.ready ? 'READY! Tap to Harvest' : formatRemainingTime(prog.remainingMs)}`)
          .setVisible(true);
      } else {
        this.timerTooltip.setVisible(false);
      }
    } else {
      this.timerTooltip.setVisible(false);
    }

    const nearExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_X, EXIT_Y) < 46;
    if (nearExit) {
      this.promptText.setPosition(EXIT_X, EXIT_Y - 38).setText('Press [E] or Tap EXIT → Phum Village').setVisible(true);
    } else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, STALL_X, STALL_Y) < 52) {
      this.promptText.setPosition(STALL_X, STALL_Y - 46).setText('Press [E] or Tap → Seed Shop & Artisan UI').setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }

    if (nearExit !== this.nearExitSent) {
      this.nearExitSent = nearExit;
      EventBus.emit('portal:proximity', {
        nearPortal: nearExit,
        label: nearExit ? 'EXIT VILLAGE' : '',
        targetZone: 'overworld',
      });
    }
  }
}
