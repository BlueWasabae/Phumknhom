import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PlayerState } from '@shared/types';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { soundManager } from '../systems/SoundManager';

const ROOM_W = 1040;
const ROOM_H = 620;
const EXIT_X = 520;
const EXIT_Y = 568;
const MUSIC_X = 520;
const MUSIC_Y = 205;

interface ClubTableNode {
  x: number;
  y: number;
  game: 'kla_klok' | 'ouk_chaktrang' | 'tien_len';
  tableId?: string;
  label: string;
  prompt: string;
}

const CLUB_TABLE_NODES: ClubTableNode[] = [
  // Left Wing: Kla Klok (3-Dice)
  {
    x: 155,
    y: 355,
    game: 'kla_klok',
    label: '🎲 KLA KLOK (3-Dice)',
    prompt: 'Press [E] or Click → Play Kla Klok (3-Dice)',
  },
  // Center Wing: 3 Ouk Chaktrang (Authentic Uncheckered PvP Khmer Chess Tables)
  {
    x: 370,
    y: 295,
    game: 'ouk_chaktrang',
    tableId: 'ouk_50',
    label: '♟️ OUK CHAKTRANG · 50 C',
    prompt: 'Press [E] or Click → Sit at Ouk Chaktrang Table 1 (50 C PvP)',
  },
  {
    x: 520,
    y: 365,
    game: 'ouk_chaktrang',
    tableId: 'ouk_200',
    label: '♟️ OUK CHAKTRANG · 200 C',
    prompt: 'Press [E] or Click → Sit at Ouk Chaktrang Table 2 (200 C PvP)',
  },
  {
    x: 370,
    y: 445,
    game: 'ouk_chaktrang',
    tableId: 'ouk_1000',
    label: '♟️ OUK HIGH-ROLLER · 1,000 C',
    prompt: 'Press [E] or Click → Sit at Ouk Chaktrang High-Roller (1,000 C PvP)',
  },
  // Right Wing: 3 Tien Len (Authentic 13-Card PvP Tables with Visible Dealer NPC!)
  {
    x: 740,
    y: 295,
    game: 'tien_len',
    tableId: 'tl_50',
    label: '🃏 TIEN LEN · 50 C (Dealer)',
    prompt: 'Press [E] or Click → Sit at Tien Len Table 1 (50 C PvP)',
  },
  {
    x: 895,
    y: 365,
    game: 'tien_len',
    tableId: 'tl_200',
    label: '🃏 TIEN LEN · 200 C (Dealer)',
    prompt: 'Press [E] or Click → Sit at Tien Len Table 2 (200 C PvP)',
  },
  {
    x: 740,
    y: 445,
    game: 'tien_len',
    tableId: 'tl_1000',
    label: '🃏 TIEN LEN VIP · 1,000 C',
    prompt: 'Press [E] or Click → Sit at Tien Len High-Roller (1,000 C PvP)',
  },
];

/**
 * Indoor Phum Village Club Hangout Scene (Update 2.2):
 * - Kla Klok (3-Dice) preserved on the left wing.
 * - 3 Multiplayer-Only Ouk Chaktrang PvP tables (50 C / 200 C / 1,000 C) with uncheckered teak wood grids.
 * - 3 Multiplayer-Only Tien Len 13-Card PvP tables (50 C / 200 C / 1,000 C) with visible animated Dealer NPCs.
 */
export class ClubScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE, zone: 'club' };
  private player!: Player;
  private promptText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };
  private transitioning = false;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('ClubScene');
  }

  init(data?: { playerState?: PlayerState }): void {
    this.initialState = data?.playerState
      ? { ...data.playerState, zone: 'club', weapon: { ...data.playerState.weapon } }
      : { ...INITIAL_PLAYER_STATE, zone: 'club', weapon: { ...INITIAL_PLAYER_STATE.weapon } };
    this.transitioning = false;
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    this.physics.world.gravity.y = 0;
    this.physics.world.setBounds(48, 120, ROOM_W - 96, ROOM_H - 148);
    soundManager.playBgm('festival');

    this.drawClubInterior();

    this.player = new Player(this, EXIT_X, EXIT_Y - 46, this.initialState, 'overworld');

    this.promptText = this.add
      .text(0, 0, '', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        padding: { x: 10, y: 5 },
      })
      .setResolution(2)
      .setScale(0.52)
      .setOrigin(0.5, 1)
      .setDepth(2600)
      .setVisible(false);

    this.applyResponsiveZoom();
    this.scale.on('resize', this.applyResponsiveZoom, this);
    this.cameras.main.setBounds(0, 0, ROOM_W, ROOM_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.fadeIn(220, 12, 8, 22);

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
      }),
      EventBus.on('travel:execute', (req) => {
        if (this.transitioning) return;
        soundManager.playSfx('magic');
        this.cameras.main.flash(260, 250, 204, 21);
        this.time.delayedCall(220, () => {
          if (req.targetZone === 'farm') {
            this.transitioning = true;
            this.scene.start('FarmScene', { playerState: { ...this.player.state, zone: 'farm' } });
          } else if (req.targetZone === 'dungeon') {
            this.transitioning = true;
            this.scene.start('DungeonBossScene', {
              bossId: req.bossId ?? 'sdech_kongkaeb',
              difficulty: req.difficulty ?? 'normal',
              partyMode: 'solo',
              playerState: { ...this.player.state, zone: 'dungeon' },
            });
          } else if (req.targetZone === 'overworld') {
            this.returnToOverworld(req.spawnX, req.spawnY, true, req.mapId ?? 'central_plaza');
          }
        });
      }),
      EventBus.on('input:interact', () => this.tryInteractNearest())
    );

    EventBus.emit('scene:ready', { zone: 'club' });
    EventBus.emit('player:state', this.player.state);
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: 'overworld' });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.applyResponsiveZoom, this);
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.player.destroy();
    });
  }

  private applyResponsiveZoom = (): void => {
    const w = this.scale.width;
    this.cameras.main.setZoom(w < 640 ? 1.35 : w < 1100 ? 1.65 : 1.85);
  };

  private drawDealerNpc(x: number, y: number): void {
    // Visible Dealer NPC standing at the head of each Tien Len table!
    const dealer = this.add.container(x, y).setDepth(28);
    const shadow = this.add.ellipse(0, 14, 22, 8, 0x000000, 0.45);
    const torso = this.add.rectangle(0, 2, 16, 16, 0x0f172a).setStrokeStyle(1.5, 0xfacc15);
    const bowTie = this.add.rectangle(0, -3, 8, 3, 0xef4444);
    const head = this.add.circle(0, -10, 8, 0xd99b66).setStrokeStyle(1.5, 0x451a03);
    const visor = this.add.rectangle(0, -15, 16, 4, 0x16a34a).setStrokeStyle(1, 0xfef08a);
    const deck = this.add.rectangle(10, 6, 8, 10, 0xfef9c3).setStrokeStyle(1, 0x991b1b);
    const tag = this.add
      .text(0, -24, 'DEALER', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(6, 78, 59, 0.9)',
        padding: { x: 4, y: 1 },
      })
      .setResolution(2)
      .setScale(0.45)
      .setOrigin(0.5);
    dealer.add([shadow, torso, bowTie, head, visor, deck, tag]);
    this.tweens.add({
      targets: dealer,
      y: y - 2,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawClubInterior(): void {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x1e132b, 1);
    g.fillRect(0, 0, ROOM_W, ROOM_H);
    g.fillStyle(0x3b1f2b, 1);
    g.fillRoundedRect(36, 112, ROOM_W - 72, ROOM_H - 134, 14);
    g.lineStyle(3, 0xf59e0b, 0.72);
    g.strokeRoundedRect(36, 112, ROOM_W - 72, ROOM_H - 134, 14);

    // Polished mahogany floorboards
    g.lineStyle(1, 0x542c3c, 0.55);
    for (let y = 136; y < ROOM_H - 28; y += 22) {
      g.lineBetween(42, y, ROOM_W - 42, y);
    }

    // Center Carpet & Stage Banner
    g.fillStyle(0x7c2d12, 0.78);
    g.fillRoundedRect(368, 168, 304, 58, 10);
    g.lineStyle(2, 0xfacc15, 0.88);
    g.strokeRoundedRect(368, 168, 304, 58, 10);

    this.add
      .text(520, 184, '✨ PHUM NIGHT CLUB · ក្លឹបភូមិខ្ញុំ (PVP TABLES) ✨', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fde047',
      })
      .setResolution(2)
      .setScale(0.62)
      .setOrigin(0.5)
      .setDepth(10);

    // Interactive Club Music Jukebox Toggle
    const isBgmOn = () => {
      const s = soundManager.getSettings();
      return !s.muted && s.bgmVolume > 0;
    };
    const musicLabel = this.add
      .text(MUSIC_X, MUSIC_Y + 4, isBgmOn() ? '🎵 Club Music: ON [Click]' : '🔇 Club Music: OFF [Click]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15,23,42,0.85)',
        padding: { x: 8, y: 2 },
      })
      .setResolution(2)
      .setScale(0.55)
      .setOrigin(0.5)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    musicLabel.on('pointerdown', () => {
      const cur = isBgmOn();
      soundManager.setBgmEnabled(!cur);
      musicLabel.setText(!cur ? '🎵 Club Music: ON [Click]' : '🔇 Club Music: OFF [Click]');
      EventBus.emit('ui:toast', { text: !cur ? '🎵 Club Lounge Music ON!' : '🔇 Club Lounge Music Muted.' });
    });

    // Draw every physical table (Kla Klok + 3 Uncheckered Ouk Tables + 3 Dealer Tien Len Tables)
    for (const node of CLUB_TABLE_NODES) {
      const glowColor =
        node.game === 'kla_klok' ? 0xf59e0b : node.game === 'ouk_chaktrang' ? 0x38bdf8 : 0x10b981;
      const spot = this.add
        .circle(node.x, node.y - 4, 62, glowColor, 0.14)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(4);
      this.tweens.add({ targets: spot, alpha: 0.25, scale: 1.08, duration: 1400, yoyo: true, repeat: -1 });

      const tg = this.add.graphics().setDepth(20);
      if (node.game === 'kla_klok') {
        tg.fillStyle(0x7c2d12, 1);
        tg.lineStyle(3.5, 0xfacc15, 1);
        tg.fillRoundedRect(node.x - 54, node.y - 36, 108, 72, 10);
        tg.strokeRoundedRect(node.x - 54, node.y - 36, 108, 72, 10);
        const kkColors = [0xf59e0b, 0xef4444, 0x38bdf8, 0xfde047, 0xf472b6, 0x22c55e];
        for (let i = 0; i < 6; i++) {
          const rx = node.x - 39 + (i % 3) * 28;
          const ry = node.y - 20 + Math.floor(i / 3) * 22;
          tg.fillStyle(kkColors[i], 0.92);
          tg.fillRoundedRect(rx, ry, 22, 17, 3);
        }
      } else if (node.game === 'ouk_chaktrang') {
        // Authentic UNCHECKERED carved teak-wood board (plain light-brown wood + dark-brown grid lines!)
        tg.fillStyle(0x6b3f1d, 1);
        tg.lineStyle(3, node.tableId === 'ouk_1000' ? 0xfacc15 : 0xd97706, 1);
        tg.fillRoundedRect(node.x - 50, node.y - 34, 100, 68, 8);
        tg.strokeRoundedRect(node.x - 50, node.y - 34, 100, 68, 8);
        tg.fillStyle(0xd9b382, 1);
        tg.fillRect(node.x - 32, node.y - 24, 64, 48);
        tg.lineStyle(1, 0x5c3a1e, 0.95);
        for (let i = 0; i <= 8; i++) {
          tg.lineBetween(node.x - 32 + i * 8, node.y - 24, node.x - 32 + i * 8, node.y + 24);
          tg.lineBetween(node.x - 32, node.y - 24 + i * 6, node.x + 32, node.y - 24 + i * 6);
        }
        // Two player stools flanking the board
        tg.fillStyle(0x92400e, 1);
        tg.fillCircle(node.x - 60, node.y, 8);
        tg.fillCircle(node.x + 60, node.y, 8);
      } else {
        // Authentic Tien Len felt table with visible Dealer NPC at head!
        tg.fillStyle(node.tableId === 'tl_1000' ? 0x581c87 : 0x065f46, 1);
        tg.lineStyle(3.5, node.tableId === 'tl_1000' ? 0xfacc15 : 0xd97706, 1);
        tg.fillEllipse(node.x, node.y, 110, 68);
        tg.strokeEllipse(node.x, node.y, 110, 68);
        // Fanned playing cards on table center
        tg.fillStyle(0xffffff, 1);
        tg.fillRect(node.x - 14, node.y - 7, 10, 14);
        tg.fillRect(node.x + 2, node.y - 9, 10, 14);
        // 4 real-player seat cushions around the felt
        tg.fillStyle(0x78350f, 1);
        tg.fillCircle(node.x - 58, node.y, 7);
        tg.fillCircle(node.x + 58, node.y, 7);
        tg.fillCircle(node.x, node.y + 39, 7);
        this.drawDealerNpc(node.x, node.y - 36);
      }

      const hit = this.add
        .rectangle(node.x, node.y, 118, 78, 0, 0)
        .setDepth(32)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        soundManager.playSfx('click');
        EventBus.emit('ui:openModal', {
          modal: 'clubGames',
          clubGame: node.game,
          clubTableId: node.tableId,
        });
      });

      this.add
        .text(node.x, node.y + 44, node.label, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: node.tableId?.includes('1000') ? '#fde047' : '#f8fafc',
          backgroundColor: 'rgba(15,23,42,0.9)',
          padding: { x: 6, y: 2 },
        })
        .setResolution(2)
        .setScale(0.52)
        .setOrigin(0.5)
        .setDepth(34);
    }

    // Back Exit Door to Market Street
    const exitMat = this.add
      .rectangle(EXIT_X, EXIT_Y, 96, 28, 0x991b1b, 0.9)
      .setStrokeStyle(2, 0xfacc15)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });
    exitMat.on('pointerdown', () => this.returnToOverworld());
    const exitArrow = this.add.image(EXIT_X, EXIT_Y - 26, 'join_arrow').setScale(0.58).setDepth(35);
    this.tweens.add({ targets: exitArrow, y: EXIT_Y - 32, duration: 540, yoyo: true, repeat: -1 });
    this.add
      .text(EXIT_X, EXIT_Y + 18, 'EXIT TO MARKET STREET [E]', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15,23,42,0.85)',
        padding: { x: 7, y: 2 },
      })
      .setResolution(2)
      .setScale(0.55)
      .setOrigin(0.5, 0)
      .setDepth(35);
  }

  private findNearestTable(): ClubTableNode | null {
    let best: ClubTableNode | null = null;
    let bestDist = 86;
    for (const node of CLUB_TABLE_NODES) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y);
      if (d < bestDist) {
        bestDist = d;
        best = node;
      }
    }
    return best;
  }

  private tryInteractNearest(): void {
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_X, EXIT_Y) < 58) {
      this.returnToOverworld();
      return;
    }
    const nearest = this.findNearestTable();
    if (nearest) {
      EventBus.emit('ui:openModal', {
        modal: 'clubGames',
        clubGame: nearest.game,
        clubTableId: nearest.tableId,
      });
      return;
    }
    EventBus.emit('ui:openModal', { modal: 'clubGames', clubGame: 'tien_len', clubTableId: 'tl_50' });
  }

  private returnToOverworld(
    spawnX = 1060,
    spawnY = 860,
    goldenFlash = false,
    mapId:
      | 'central_plaza'
      | 'market_street'
      | 'temple_district'
      | 'green_park'
      | 'wild_frontier'
      | 'mining_quarry'
      | 'bamboo_forest'
      | 'sunken_ruins' = 'market_street'
  ): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 10, 12, 22);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        mapId,
        spawnX,
        spawnY,
        goldenFlash,
        playerState: { ...this.player.state, zone: 'overworld', currentMapId: mapId },
      });
    });
  }

  update(time: number): void {
    const modalOpen = Boolean(document.querySelector('dialog[open]'));
    if (this.input.enabled === modalOpen) {
      this.input.enabled = !modalOpen;
    }
    const typing =
      modalOpen ||
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA';
    let vx = this.joystick.x;
    let vy = this.joystick.y;
    if (!typing && !this.transitioning) {
      if (this.cursors.left.isDown || this.keys.A.isDown) vx -= 1;
      if (this.cursors.right.isDown || this.keys.D.isDown) vx += 1;
      if (this.cursors.up.isDown || this.keys.W.isDown) vy -= 1;
      if (this.cursors.down.isDown || this.keys.S.isDown) vy += 1;
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.tryInteractNearest();
      }
    }

    const len = Math.hypot(vx, vy);
    if (len > 0.1) {
      const nx = vx / Math.max(1, len);
      const ny = vy / Math.max(1, len);
      this.player.body.setVelocity(nx * 136, ny * 136);
      this.player.facing = Math.abs(nx) >= Math.abs(ny) ? (nx < 0 ? 'left' : 'right') : ny < 0 ? 'up' : 'down';
      this.player.playStateAnimation('walk');
    } else {
      this.player.body.setVelocity(0, 0);
      this.player.playStateAnimation('idle');
    }

    this.player.syncVisuals(time, true);

    const nearest = this.findNearestTable();
    if (nearest) {
      this.promptText.setPosition(nearest.x, nearest.y - 44).setText(nearest.prompt).setVisible(true);
    } else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_X, EXIT_Y) < 58) {
      this.promptText.setPosition(EXIT_X, EXIT_Y - 40).setText('Press [E] or Click → Exit to Market Street').setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }
}
