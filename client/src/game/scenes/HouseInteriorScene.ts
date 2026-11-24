import Phaser from 'phaser';
import {
  INITIAL_PLAYER_STATE,
  type PlacedHouseDecor,
  type PlayerState,
} from '@shared/types';
import {
  DEFAULT_HOUSE_DECOR,
  HOUSE_FURNITURE_CATALOG,
} from '@shared/houseDecor';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { soundManager } from '../systems/SoundManager';
import { seasonClock } from '../systems/SeasonClock';

const ROOM_W = 800;
const ROOM_H = 600;
const GRID_SIZE = 32;
const ROOM_LEFT = 112;
const ROOM_RIGHT = 688;
const ROOM_TOP = 152;
const ROOM_BOTTOM = 496;
const EXIT_X = 400;
const EXIT_Y = 504;

export interface HouseInteriorInitData {
  playerState?: PlayerState;
  returnZone?: 'overworld' | 'farm';
}

interface RenderedDecorNode {
  entry: PlacedHouseDecor;
  container: Phaser.GameObjects.Container;
  glow?: Phaser.GameObjects.Image;
}

export class HouseInteriorScene extends Phaser.Scene {
  private player!: Player;
  private initialState: PlayerState = INITIAL_PLAYER_STATE;
  private returnZone: 'overworld' | 'farm' = 'overworld';

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E' | 'R', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };

  private placedDecor: PlacedHouseDecor[] = [];
  private decorNodes: RenderedDecorNode[] = [];
  private decorateMode = false;
  private selectedPlaceItemId: string | null = null;
  private selectedPlacedUid: string | null = null;

  private gridOverlay!: Phaser.GameObjects.Graphics;
  private selectionHalo!: Phaser.GameObjects.Rectangle;
  private windowSkyLeft!: Phaser.GameObjects.Rectangle;
  private windowSkyRight!: Phaser.GameObjects.Rectangle;
  private weatherDropSprites: Phaser.GameObjects.Rectangle[] = [];
  private nearExitSent = false;
  private transitioning = false;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('HouseInteriorScene');
  }

  init(data?: HouseInteriorInitData): void {
    this.returnZone = data?.returnZone ?? 'overworld';
    this.initialState = data?.playerState
      ? {
          ...data.playerState,
          zone: 'house',
          weapon: { ...data.playerState.weapon },
          loadout: { ...data.playerState.loadout },
          currencies: { ...data.playerState.currencies },
          lifeStats: { ...data.playerState.lifeStats },
          houseDecor: data.playerState.houseDecor
            ? data.playerState.houseDecor.map((d) => ({ ...d }))
            : DEFAULT_HOUSE_DECOR.map((d) => ({ ...d })),
        }
      : {
          ...INITIAL_PLAYER_STATE,
          zone: 'house',
          houseDecor: DEFAULT_HOUSE_DECOR.map((d) => ({ ...d })),
        };

    this.placedDecor = (this.initialState.houseDecor ?? DEFAULT_HOUSE_DECOR).map((d) => ({ ...d }));
    this.decorNodes = [];
    this.weatherDropSprites = [];
    this.decorateMode = false;
    this.selectedPlaceItemId = null;
    this.selectedPlacedUid = null;
    this.nearExitSent = false;
    this.transitioning = false;
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    this.physics.world.gravity.y = 0;
    this.physics.world.setBounds(ROOM_LEFT, ROOM_TOP, ROOM_RIGHT - ROOM_LEFT, ROOM_BOTTOM - ROOM_TOP);
    soundManager.playBgm('village');

    this.ensureFurnitureTextures();
    this.drawCozyStiltHouseRoom();
    this.buildExitDoorway();

    // Grid overlay (visible only while Decorate Mode is active)
    this.gridOverlay = this.add.graphics().setDepth(25).setVisible(false);
    this.drawTileGrid();

    this.selectionHalo = this.add
      .rectangle(0, 0, 54, 54, 0xfacc15, 0.16)
      .setStrokeStyle(2, 0xfde047, 0.95)
      .setDepth(520)
      .setVisible(false);

    this.rebuildAllPlacedFurniture();

    // Player spawns just inside front doorway
    this.player = new Player(this, EXIT_X, EXIT_Y - 56, this.initialState, 'house');
    this.player.paperDoll.setScale(0.76);
    this.player.sprite.setCollideWorldBounds(true);

    this.cameras.main.setBounds(0, 0, ROOM_W, ROOM_H);
    this.cameras.main.centerOn(ROOM_W / 2, ROOM_H / 2);
    this.applyResponsiveCameraZoom();
    this.scale.on('resize', this.applyResponsiveCameraZoom, this);
    this.cameras.main.fadeIn(220, 14, 10, 8);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('W,A,S,D,E,R') as Record<
        'W' | 'A' | 'S' | 'D' | 'E' | 'R',
        Phaser.Input.Keyboard.Key
      >;
    }

    // Floor click handler for placing or moving furniture in Decorate Mode
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (!this.decorateMode || this.transitioning) return;
      if (currentlyOver.length > 0) return; // Handled by furniture item click
      const wx = Phaser.Math.Clamp(Math.round(pointer.worldX / GRID_SIZE) * GRID_SIZE, ROOM_LEFT + 32, ROOM_RIGHT - 32);
      const wy = Phaser.Math.Clamp(Math.round(pointer.worldY / GRID_SIZE) * GRID_SIZE, ROOM_TOP + 24, ROOM_BOTTOM - 44);

      if (this.selectedPlacedUid) {
        this.movePlacedDecor(this.selectedPlacedUid, wx, wy);
      } else if (this.selectedPlaceItemId) {
        this.placeDecorItemAt(this.selectedPlaceItemId, wx, wy);
      }
    });

    // EventBus wiring
    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.joystick = vec;
      }),
      EventBus.on('input:interact', () => this.tryInteractNearest()),
      EventBus.on('player:chat', ({ text }) => this.player.showSpeechBubble(text, 4500)),
      EventBus.on('player:emote', ({ emoji }) => this.player.showEmote(emoji, 3000)),
      EventBus.on('player:loadoutChanged', ({ loadout, playerState }) => {
        this.player.applyLoadoutUpdate(loadout, playerState);
      }),
      EventBus.on('player:stateSync', (nextState) => {
        this.player.syncPlayerState(nextState);
        if (nextState.houseDecor) {
          this.placedDecor = nextState.houseDecor.map((d) => ({ ...d }));
          this.rebuildAllPlacedFurniture();
        }
      }),
      EventBus.on('house:setDecorateMode', ({ active, itemId }) => {
        this.decorateMode = active;
        this.selectedPlaceItemId = itemId ?? null;
        if (!active) this.selectedPlacedUid = null;
        this.gridOverlay.setVisible(active);
        this.updateSelectionHalo();
      }),
      EventBus.on('house:placeQuick', ({ itemId }) => {
        // Place cleanly near player or center open tile
        const offset = (this.placedDecor.length % 5) * GRID_SIZE;
        const tx = Phaser.Math.Clamp(Math.round((272 + offset) / GRID_SIZE) * GRID_SIZE, ROOM_LEFT + 32, ROOM_RIGHT - 32);
        const ty = Phaser.Math.Clamp(Math.round((272 + Math.floor(this.placedDecor.length / 5) * 48) / GRID_SIZE) * GRID_SIZE, ROOM_TOP + 24, ROOM_BOTTOM - 56);
        this.placeDecorItemAt(itemId, tx, ty);
      }),
      EventBus.on('house:rotateDecor', ({ uid }) => {
        this.rotatePlacedDecor(uid);
      }),
      EventBus.on('house:removeDecor', ({ uid }) => {
        this.removePlacedDecor(uid);
      }),
      EventBus.on('travel:execute', (req) => {
        if (this.transitioning) return;
        this.transitioning = true;
        this.cameras.main.fadeOut(200, 12, 10, 8);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          if (req.targetZone === 'farm') {
            this.scene.start('FarmScene', {
              playerState: { ...this.player.state, zone: 'farm', houseDecor: this.placedDecor },
            });
          } else {
            const targetMap = req.mapId ?? 'central_plaza';
            this.scene.start('OverworldScene', {
              mapId: targetMap,
              spawnX: req.spawnX,
              spawnY: req.spawnY,
              goldenFlash: true,
              playerState: { ...this.player.state, zone: 'overworld', currentMapId: targetMap, houseDecor: this.placedDecor },
            });
          }
        });
      })
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.applyResponsiveCameraZoom, this);
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
    });

    EventBus.emit('scene:ready', { zone: 'house' });
    EventBus.emit('player:state', this.player.state);
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: this.returnZone });
  }

  private applyResponsiveCameraZoom = (): void => {
    const scaleX = this.scale.width / ROOM_W;
    const scaleY = this.scale.height / ROOM_H;
    const zoom = Phaser.Math.Clamp(Math.min(scaleX, scaleY) * 0.96, 0.92, 1.55);
    this.cameras.main.setZoom(zoom);
  };

  private drawCozyStiltHouseRoom(): void {
    // Deep warm timber backdrop
    this.add.rectangle(ROOM_W / 2, ROOM_H / 2, ROOM_W, ROOM_H, 0x1c120c).setDepth(0);

    // Outer teak beams frame
    this.add
      .rectangle(ROOM_W / 2, 315, ROOM_RIGHT - ROOM_LEFT + 32, ROOM_BOTTOM - ROOM_TOP + 124, 0x451a03)
      .setStrokeStyle(5, 0x291105)
      .setDepth(1);

    // Upper carved Khmer wooden wall
    this.add
      .rectangle(ROOM_W / 2, 108, ROOM_RIGHT - ROOM_LEFT, 96, 0x78350f)
      .setStrokeStyle(3, 0x3f1d0b)
      .setDepth(2);

    // Decorative gold Angkor lintel molding along upper wall
    this.add.rectangle(ROOM_W / 2, 68, ROOM_RIGHT - ROOM_LEFT - 12, 8, 0xd97706).setDepth(3);
    this.add.rectangle(ROOM_W / 2, 152, ROOM_RIGHT - ROOM_LEFT, 8, 0x451a03).setDepth(3);

    // Warm polished teak floorboards
    this.add
      .rectangle(ROOM_W / 2, (ROOM_TOP + ROOM_BOTTOM) / 2, ROOM_RIGHT - ROOM_LEFT, ROOM_BOTTOM - ROOM_TOP, 0x92400e)
      .setDepth(2);

    const floorGfx = this.add.graphics().setDepth(3);
    for (let y = ROOM_TOP; y < ROOM_BOTTOM; y += 24) {
      floorGfx.fillStyle(y % 48 === 0 ? 0xa16207 : 0x854d0e, 0.42);
      floorGfx.fillRect(ROOM_LEFT, y, ROOM_RIGHT - ROOM_LEFT, 22);
      floorGfx.lineStyle(1, 0x451a03, 0.45);
      floorGfx.lineBetween(ROOM_LEFT, y, ROOM_RIGHT, y);
      for (let x = ROOM_LEFT + ((y * 3) % 96); x < ROOM_RIGHT; x += 96) {
        floorGfx.lineBetween(x, y, x, y + 24);
      }
    }

    // Two open Khmer wooden shutter windows showing live outside weather & season tint!
    const snap = seasonClock.getSnapshot();
    const skyColor =
      snap.nightIntensity > 0.45
        ? 0x1e293b
        : snap.season.autoWatersFarm
          ? 0x475569
          : snap.season.id === 'spring'
            ? 0xf472b6
            : snap.season.id === 'winter'
              ? 0x38bdf8
              : 0xf59e0b;

    const buildWindow = (wx: number): Phaser.GameObjects.Rectangle => {
      // Wooden outer frame & swung-open shutters
      this.add.rectangle(wx - 48, 106, 20, 54, 0x5c260a).setStrokeStyle(2, 0x2b1205).setDepth(4);
      this.add.rectangle(wx + 48, 106, 20, 54, 0x5c260a).setStrokeStyle(2, 0x2b1205).setDepth(4);
      const sky = this.add.rectangle(wx, 106, 72, 50, skyColor, 0.88).setStrokeStyle(3, 0x3f1d0b).setDepth(5);
      // Window bars
      this.add.rectangle(wx, 106, 4, 50, 0x451a03).setDepth(6);
      this.add.rectangle(wx, 106, 72, 4, 0x451a03).setDepth(6);
      // Warm sun/moonlight spill onto floor
      this.add.polygon(wx, 195, [0, 0, 72, 0, 92, 68, -20, 68], 0xfef08a, 0.1).setDepth(4);
      return sky;
    };

    this.windowSkyLeft = buildWindow(255);
    this.windowSkyRight = buildWindow(545);

    // Subtle raindrop streaks visible through windows during Monsoon!
    if (snap.season.autoWatersFarm) {
      for (const wx of [255, 545]) {
        for (let i = 0; i < 6; i++) {
          const drop = this.add
            .rectangle(wx - 28 + i * 11, 88 + (i % 3) * 14, 2, 8, 0xbae6fd, 0.75)
            .setDepth(6);
          this.weatherDropSprites.push(drop);
        }
      }
    }

    // Center Carved Angkor Wall Emblem
    this.add
      .text(ROOM_W / 2, 104, '🏛️ ផ្ទះឈើខ្មែរ · MY KHMER STILT HOUSE', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef3c7',
        backgroundColor: 'rgba(69, 26, 3, 0.88)',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(7);

    // Built-in corner resting pillow / lantern warm ambiance
    const warmGlow = this.add
      .image(ROOM_W / 2, 290, 'torch_glow')
      .setTint(0xf59e0b)
      .setScale(2.8)
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(5);
    this.tweens.add({ targets: warmGlow, alpha: 0.14, duration: 1400, yoyo: true, repeat: -1 });
  }

  private drawTileGrid(): void {
    this.gridOverlay.clear();
    this.gridOverlay.lineStyle(1, 0xfde047, 0.28);
    for (let x = ROOM_LEFT; x <= ROOM_RIGHT; x += GRID_SIZE) {
      this.gridOverlay.lineBetween(x, ROOM_TOP, x, ROOM_BOTTOM);
    }
    for (let y = ROOM_TOP; y <= ROOM_BOTTOM; y += GRID_SIZE) {
      this.gridOverlay.lineBetween(ROOM_LEFT, y, ROOM_RIGHT, y);
    }
  }

  private buildExitDoorway(): void {
    this.add.rectangle(EXIT_X, EXIT_Y + 8, 86, 26, 0x451a03).setStrokeStyle(3, 0xf59e0b).setDepth(12);
    const exitMat = this.add
      .rectangle(EXIT_X, EXIT_Y - 2, 74, 20, 0xb91c1c)
      .setStrokeStyle(2, 0xfacc15)
      .setDepth(13)
      .setInteractive({ useHandCursor: true });
    exitMat.on('pointerdown', () => this.exitHome());

    const arrow = this.add.image(EXIT_X, EXIT_Y - 30, 'join_arrow').setScale(0.6).setDepth(35);
    this.tweens.add({ targets: arrow, y: EXIT_Y - 36, duration: 540, yoyo: true, repeat: -1 });

    this.add
      .text(EXIT_X, EXIT_Y + 28, this.returnZone === 'farm' ? 'EXIT TO FARM [E]' : 'EXIT TO VILLAGE [E]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        padding: { x: 8, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(36);
  }

  private ensureFurnitureTextures(): void {
    const makeTex = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      if (this.textures.exists(key)) return;
      const tex = this.textures.createCanvas(key, w, h);
      if (!tex) return;
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      draw(ctx);
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    };

    const O = '#2b1b17';

    makeTex('decor_furn_reed_mat', 96, 64, (ctx) => {
      ctx.fillStyle = O;
      ctx.fillRect(2, 2, 92, 60);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(4, 4, 88, 56);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(6, 6, 84, 52);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(10, 10, 76, 44);
      for (let x = 14; x < 82; x += 8) {
        ctx.fillStyle = x % 16 === 6 ? '#f59e0b' : '#eab308';
        ctx.fillRect(x, 12, 4, 40);
      }
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(36, 24, 24, 16);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(42, 28, 12, 8);
    });

    makeTex('decor_furn_teak_table', 64, 40, (ctx) => {
      ctx.fillStyle = O;
      ctx.fillRect(4, 4, 56, 30);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(6, 6, 52, 22);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(8, 8, 48, 16);
      // Legs
      ctx.fillStyle = '#451a03';
      ctx.fillRect(8, 28, 6, 10);
      ctx.fillRect(50, 28, 6, 10);
      // Teapot & 2 cups
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(26, 11, 12, 10);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(28, 13, 8, 4);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(16, 15, 5, 5);
      ctx.fillRect(43, 15, 5, 5);
    });

    makeTex('decor_furn_lotus_lamp', 36, 48, (ctx) => {
      // Wooden stand
      ctx.fillStyle = O;
      ctx.fillRect(13, 24, 10, 20);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(15, 25, 6, 18);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(9, 40, 18, 6);
      // Blooming Pink Lotus Shade
      ctx.fillStyle = O;
      ctx.fillRect(6, 6, 24, 20);
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(8, 8, 20, 16);
      ctx.fillStyle = '#f9a8d4';
      ctx.fillRect(10, 10, 16, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(14, 12, 8, 8);
    });

    makeTex('decor_furn_hammock', 96, 46, (ctx) => {
      // Teak hammock posts
      ctx.fillStyle = O;
      ctx.fillRect(4, 6, 10, 36);
      ctx.fillRect(82, 6, 10, 36);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(6, 8, 6, 32);
      ctx.fillRect(84, 8, 6, 32);
      // Woven blue/cream hammock sling
      ctx.fillStyle = O;
      ctx.fillRect(12, 14, 72, 22);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(14, 16, 68, 18);
      for (let x = 18; x < 78; x += 8) {
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(x, 18, 4, 14);
      }
      // Cozy red-white krama pillow
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(18, 18, 14, 12);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(20, 20, 10, 8);
    });

    makeTex('decor_furn_krama_tapestry', 64, 44, (ctx) => {
      ctx.fillStyle = O;
      ctx.fillRect(4, 2, 56, 6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(6, 3, 52, 4);
      ctx.fillStyle = O;
      ctx.fillRect(8, 8, 48, 32);
      for (let y = 10; y < 38; y += 6) {
        for (let x = 10; x < 54; x += 6) {
          ctx.fillStyle = ((x + y) / 6) % 2 === 0 ? '#dc2626' : '#fef3c7';
          ctx.fillRect(x, y, 6, 6);
        }
      }
    });

    makeTex('decor_furn_banana_plant', 40, 54, (ctx) => {
      // Clay pot
      ctx.fillStyle = O;
      ctx.fillRect(10, 32, 20, 20);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(12, 34, 16, 16);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(12, 34, 16, 4);
      // Broad tropical green banana leaves
      ctx.fillStyle = O;
      ctx.fillRect(4, 6, 32, 26);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(6, 8, 28, 22);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(10, 10, 8, 16);
      ctx.fillRect(22, 10, 8, 16);
      ctx.fillStyle = '#166534';
      ctx.fillRect(18, 16, 4, 18);
    });

    makeTex('decor_trophy_king_frog', 48, 56, (ctx) => {
      ctx.fillStyle = O;
      ctx.fillRect(10, 26, 28, 28);
      ctx.fillStyle = '#78716c';
      ctx.fillRect(12, 28, 24, 24);
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(14, 30, 20, 4);
      // Golden Frog Crown
      ctx.fillStyle = O;
      ctx.fillRect(10, 8, 28, 18);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(12, 10, 24, 14);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(18, 14, 12, 6);
    });

    makeTex('decor_trophy_yeak_thmor', 56, 56, (ctx) => {
      ctx.fillStyle = O;
      ctx.fillRect(8, 30, 40, 24);
      ctx.fillStyle = '#57534e';
      ctx.fillRect(10, 32, 36, 20);
      // Giant Stone Club mounted diagonally
      ctx.fillStyle = O;
      ctx.fillRect(12, 10, 32, 20);
      ctx.fillStyle = '#78716c';
      ctx.fillRect(14, 12, 28, 16);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(18, 16, 20, 6);
    });

    makeTex('decor_trophy_arp_spirit', 44, 56, (ctx) => {
      ctx.fillStyle = O;
      ctx.fillRect(12, 32, 20, 22);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(14, 34, 16, 18);
      ctx.fillStyle = O;
      ctx.fillRect(8, 6, 28, 26);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(10, 8, 24, 22);
      ctx.fillStyle = '#a7f3d0';
      ctx.fillRect(15, 13, 14, 12);
    });

    makeTex('decor_trophy_neak_reach', 52, 64, (ctx) => {
      ctx.fillStyle = O;
      ctx.fillRect(6, 4, 40, 8);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(8, 6, 36, 4);
      ctx.fillStyle = O;
      ctx.fillRect(10, 12, 32, 48);
      ctx.fillStyle = '#581c87';
      ctx.fillRect(12, 14, 28, 44);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(18, 22, 16, 26);
      ctx.fillStyle = '#a7f3d0';
      ctx.fillRect(22, 28, 8, 14);
    });
  }

  private rebuildAllPlacedFurniture(): void {
    for (const node of this.decorNodes) {
      node.container.destroy();
      node.glow?.destroy();
    }
    this.decorNodes = [];

    for (const entry of this.placedDecor) {
      const def = HOUSE_FURNITURE_CATALOG[entry.itemId];
      if (!def) continue;

      const container = this.add.container(entry.x, entry.y);
      const isRug = entry.itemId === 'furn_reed_mat';
      container.setDepth(isRug ? 10 : entry.y);

      const texKey = `decor_${entry.itemId}`;
      const img = this.add.image(0, 0, texKey).setAngle(entry.rotation ?? 0);
      container.add(img);

      let glow: Phaser.GameObjects.Image | undefined;
      if (entry.itemId === 'furn_lotus_lamp' || entry.itemId === 'trophy_arp_spirit') {
        glow = this.add
          .image(entry.x, entry.y - 6, 'torch_glow')
          .setTint(entry.itemId === 'furn_lotus_lamp' ? 0xf472b6 : 0x34d399)
          .setScale(0.95)
          .setAlpha(0.55)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(entry.y + 4);
      }

      if (def.restoresEnergy) {
        const hint = this.add
          .text(0, -30, '🛏️ Rest & Heal [Click / E]', {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#bae6fd',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            padding: { x: 5, y: 2 },
          })
          .setOrigin(0.5);
        container.add(hint);
      }

      img.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (this.decorateMode) {
          this.selectedPlacedUid = this.selectedPlacedUid === entry.uid ? null : entry.uid;
          this.selectedPlaceItemId = null;
          this.updateSelectionHalo();
          EventBus.emit('ui:toast', {
            text: this.selectedPlacedUid
              ? `Selected ${def.name}: Click any floor tile to Move, press [R] to Rotate, or Pick Up in Decorate menu!`
              : 'Deselected furniture.',
          });
        } else if (def.restoresEnergy) {
          this.restInHammock();
        } else {
          EventBus.emit('ui:toast', { text: `${def.icon} ${def.name} — Open Decorate Mode to move or rotate!` });
        }
      });

      this.decorNodes.push({ entry, container, glow });
    }
    this.updateSelectionHalo();
  }

  private updateSelectionHalo(): void {
    if (!this.decorateMode || !this.selectedPlacedUid) {
      this.selectionHalo.setVisible(false);
      return;
    }
    const found = this.placedDecor.find((d) => d.uid === this.selectedPlacedUid);
    if (!found) {
      this.selectionHalo.setVisible(false);
      return;
    }
    this.selectionHalo.setPosition(found.x, found.y).setVisible(true);
  }

  private placeDecorItemAt(itemId: string, x: number, y: number): void {
    const def = HOUSE_FURNITURE_CATALOG[itemId];
    if (!def) return;
    const nextItem: PlacedHouseDecor = {
      uid: `decor_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      itemId,
      x,
      y,
      rotation: 0,
    };
    this.placedDecor = [...this.placedDecor, nextItem];
    this.rebuildAllPlacedFurniture();
    soundManager.playSfx('harvest');
    this.emitDecorSync(`Placed ${def.icon} ${def.name} in your Khmer Stilt House!`);
  }

  private movePlacedDecor(uid: string, x: number, y: number): void {
    this.placedDecor = this.placedDecor.map((d) => (d.uid === uid ? { ...d, x, y } : d));
    this.selectedPlacedUid = null;
    this.rebuildAllPlacedFurniture();
    soundManager.playSfx('coin');
    this.emitDecorSync('Moved furniture cleanly on the grid!');
  }

  private rotatePlacedDecor(uid: string): void {
    this.placedDecor = this.placedDecor.map((d) =>
      d.uid === uid ? { ...d, rotation: ((d.rotation ?? 0) + 90) % 360 } : d
    );
    this.rebuildAllPlacedFurniture();
    soundManager.playSfx('coin');
    this.emitDecorSync('Rotated furniture 90°!');
  }

  private removePlacedDecor(uid: string): void {
    const target = this.placedDecor.find((d) => d.uid === uid);
    if (!target) return;
    this.placedDecor = this.placedDecor.filter((d) => d.uid !== uid);
    if (this.selectedPlacedUid === uid) this.selectedPlacedUid = null;
    this.rebuildAllPlacedFurniture();
    soundManager.playSfx('swing');
    const name = HOUSE_FURNITURE_CATALOG[target.itemId]?.name ?? 'Furniture';
    this.emitDecorSync(`Picked up ${name} back to storage!`);
  }

  private emitDecorSync(toast?: string): void {
    this.player.state.houseDecor = this.placedDecor.map((d) => ({ ...d }));
    EventBus.emit('house:decorUpdated', {
      houseDecor: this.player.state.houseDecor,
      toast,
    });
  }

  private restInHammock(): void {
    soundManager.playSfx('heal');
    this.cameras.main.flash(260, 186, 230, 253);
    EventBus.emit('house:restHeal');
  }

  private tryInteractNearest(): void {
    if (this.transitioning) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_X, EXIT_Y) < 70) {
      this.exitHome();
      return;
    }
    const hammock = this.placedDecor.find((d) => HOUSE_FURNITURE_CATALOG[d.itemId]?.restoresEnergy);
    if (hammock && Phaser.Math.Distance.Between(this.player.x, this.player.y, hammock.x, hammock.y) < 88) {
      this.restInHammock();
    }
  }

  private exitHome(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 12, 10, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const nextState: PlayerState = {
        ...this.player.state,
        houseDecor: this.placedDecor.map((d) => ({ ...d })),
      };
      if (this.returnZone === 'farm') {
        this.scene.start('FarmScene', {
          playerState: { ...nextState, zone: 'farm' },
        });
      } else {
        this.scene.start('OverworldScene', {
          mapId: 'central_plaza',
          spawnX: 280,
          spawnY: 535,
          playerState: { ...nextState, zone: 'overworld', currentMapId: 'central_plaza' },
        });
      }
    });
  }

  update(time: number, delta: number): void {
    if (this.transitioning) return;
    const dt = delta / 1000;

    // Animate monsoon drops outside windows if raining
    for (const drop of this.weatherDropSprites) {
      drop.y += 65 * dt;
      if (drop.y > 128) drop.y = 84;
    }
    if (this.windowSkyLeft && this.windowSkyRight) {
      const snap = seasonClock.getSnapshot();
      const targetColor =
        snap.nightIntensity > 0.45
          ? 0x1e293b
          : snap.season.autoWatersFarm
            ? 0x475569
            : snap.season.id === 'spring'
              ? 0xf472b6
              : snap.season.id === 'winter'
                ? 0x38bdf8
                : 0xf59e0b;
      this.windowSkyLeft.setFillStyle(targetColor, 0.88);
      this.windowSkyRight.setFillStyle(targetColor, 0.88);
    }

    const typing =
      document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

    let vx = this.joystick.x;
    let vy = this.joystick.y;
    if (!typing) {
      if (this.cursors?.left.isDown || this.keys?.A.isDown) vx -= 1;
      if (this.cursors?.right.isDown || this.keys?.D.isDown) vx += 1;
      if (this.cursors?.up.isDown || this.keys?.W.isDown) vy -= 1;
      if (this.cursors?.down.isDown || this.keys?.S.isDown) vy += 1;

      if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.tryInteractNearest();
      }
      if (this.keys && this.decorateMode && this.selectedPlacedUid && Phaser.Input.Keyboard.JustDown(this.keys.R)) {
        this.rotatePlacedDecor(this.selectedPlacedUid);
      }
    }

    const mag = Math.hypot(vx, vy);
    const speed = 155;
    if (mag > 0.1) {
      const nx = vx / Math.max(1, mag);
      const ny = vy / Math.max(1, mag);
      this.player.body.setVelocity(nx * speed, ny * speed);
      if (Math.abs(nx) > Math.abs(ny)) {
        this.player.facing = nx < 0 ? 'left' : 'right';
      } else {
        this.player.facing = ny < 0 ? 'up' : 'down';
      }
      this.player.playStateAnimation('walk');
    } else {
      this.player.body.setVelocity(0, 0);
      this.player.playStateAnimation('idle');
    }

    this.player.paperDoll.setDepth(this.player.y + 12);
    this.player.syncVisuals(time, true);

    const nearExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_X, EXIT_Y) < 70;
    if (nearExit !== this.nearExitSent) {
      this.nearExitSent = nearExit;
      EventBus.emit('portal:proximity', {
        nearPortal: nearExit,
        label: nearExit ? 'Press [E] to Step Outside' : '',
        targetZone: this.returnZone,
      });
    }
  }
}
