import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PlayerState } from '@shared/types';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';
import { soundManager } from '../systems/SoundManager';

const ROOM_W = 800;
const ROOM_H = 540;
const EXIT_X = 400;
const EXIT_Y = 492;
const KLA_KLOK_X = 185;
const KLA_KLOK_Y = 342;
const OUK_X = 400;
const OUK_Y = 336;
const TIEN_LEN_X = 615;
const TIEN_LEN_Y = 342;
const MUSIC_X = 400;
const MUSIC_Y = 236;

/**
 * Indoor Phum Village Club Hangout Scene:
 * Warm neon-amber lounge featuring Tien Len (13-Card Khmer Poker) & Ouk Chaktrang (Khmer Chess) tables.
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
    this.physics.world.gravity.y = 0;
    this.physics.world.setBounds(48, 120, ROOM_W - 96, ROOM_H - 150);
    soundManager.playBgm('village');

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
      .setScale(0.55)
      .setOrigin(0.5, 1)
      .setDepth(2600)
      .setVisible(false);

    this.applyResponsiveZoom();
    this.scale.on('resize', this.applyResponsiveZoom, this);
    this.cameras.main.setBounds(0, 0, ROOM_W, ROOM_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.fadeIn(220, 12, 8, 22);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E') as Record<
      'W' | 'A' | 'S' | 'D' | 'E',
      Phaser.Input.Keyboard.Key
    >;

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
    this.cameras.main.setZoom(w < 640 ? 1.55 : w < 1100 ? 1.85 : 2.1);
  };

  private drawClubInterior(): void {
    const g = this.add.graphics().setDepth(0);
    // Deep twilight wall & warm mahogany wood dance floor
    g.fillStyle(0x1e132b, 1);
    g.fillRect(0, 0, ROOM_W, ROOM_H);
    g.fillStyle(0x3b1f2b, 1);
    g.fillRoundedRect(36, 112, ROOM_W - 72, ROOM_H - 134, 14);
    g.lineStyle(3, 0xf59e0b, 0.7);
    g.strokeRoundedRect(36, 112, ROOM_W - 72, ROOM_H - 134, 14);

    // Subtle polished wooden floor planks
    g.lineStyle(1, 0x542c3c, 0.55);
    for (let y = 136; y < ROOM_H - 28; y += 22) {
      g.lineBetween(42, y, ROOM_W - 42, y);
    }

    // Center Carpet & Stage Banner (positioned cleanly below the top HUD bar)
    g.fillStyle(0x7c2d12, 0.72);
    g.fillRoundedRect(306, 206, 188, 52, 10);
    g.lineStyle(2, 0xfacc15, 0.85);
    g.strokeRoundedRect(306, 206, 188, 52, 10);

    this.add
      .text(400, 220, '✨ PHUM NIGHT CLUB · ក្លឹបភូមិខ្ញុំ ✨', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fde047',
      })
      .setResolution(2)
      .setScale(0.65)
      .setOrigin(0.5)
      .setDepth(10);

    // Interactive Club Music Jukebox Toggle
    const isBgmOn = () => {
      const s = soundManager.getSettings();
      return !s.muted && s.bgmVolume > 0;
    };
    const musicLabel = this.add
      .text(MUSIC_X, MUSIC_Y + 6, isBgmOn() ? '🎵 Club Music: ON [Click]' : '🔇 Club Music: OFF [Click]', {
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

    // Warm lantern-lit spotlights across all 3 wooden game tables
    const l1 = this.add.circle(KLA_KLOK_X, KLA_KLOK_Y - 6, 72, 0xf59e0b, 0.16).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);
    const l2 = this.add.circle(OUK_X, OUK_Y - 6, 72, 0x38bdf8, 0.15).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);
    const l3 = this.add.circle(TIEN_LEN_X, TIEN_LEN_Y - 6, 72, 0xec4899, 0.15).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);
    this.tweens.add({ targets: [l1, l2, l3], alpha: 0.28, scale: 1.12, duration: 1300, yoyo: true, repeat: -1 });

    // Table 1 (Left): Kla Klok (Khmer Traditional 3-Dice Board)
    const t0 = this.add.graphics().setDepth(20);
    t0.fillStyle(0x7c2d12, 1);
    t0.lineStyle(4, 0xfacc15, 1);
    t0.fillRoundedRect(KLA_KLOK_X - 58, KLA_KLOK_Y - 38, 116, 76, 10);
    t0.strokeRoundedRect(KLA_KLOK_X - 58, KLA_KLOK_Y - 38, 116, 76, 10);
    // 6-symbol grid squares on Kla Klok mat
    const kkColors = [0xf59e0b, 0xef4444, 0x38bdf8, 0xfde047, 0xf472b6, 0x22c55e];
    for (let i = 0; i < 6; i++) {
      const rx = KLA_KLOK_X - 42 + (i % 3) * 30;
      const ry = KLA_KLOK_Y - 22 + Math.floor(i / 3) * 24;
      t0.fillStyle(kkColors[i], 0.9);
      t0.fillRoundedRect(rx, ry, 24, 18, 3);
    }
    const t0Hit = this.add.rectangle(KLA_KLOK_X, KLA_KLOK_Y, 124, 84, 0, 0).setDepth(30).setInteractive({ useHandCursor: true });
    t0Hit.on('pointerdown', () => EventBus.emit('ui:openModal', { modal: 'clubGames', clubGame: 'kla_klok' }));
    this.add
      .text(KLA_KLOK_X, KLA_KLOK_Y + 50, '🎲 KLA KLOK (3-Dice)', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15,23,42,0.88)',
        padding: { x: 7, y: 2 },
      })
      .setResolution(2)
      .setScale(0.56)
      .setOrigin(0.5)
      .setDepth(30);

    // Table 2 (Center): Ouk Chaktrang (8x8 Khmer Chess) Table
    const t2 = this.add.graphics().setDepth(20);
    t2.fillStyle(0x78350f, 1);
    t2.lineStyle(4, 0xfacc15, 1);
    t2.fillRoundedRect(OUK_X - 58, OUK_Y - 40, 116, 80, 10);
    t2.strokeRoundedRect(OUK_X - 58, OUK_Y - 40, 116, 80, 10);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        t2.fillStyle((r + c) % 2 === 0 ? 0xfef3c7 : 0x92400e, 1);
        t2.fillRect(OUK_X - 28 + c * 14, OUK_Y - 26 + r * 13, 14, 13);
      }
    }
    const t2Hit = this.add.rectangle(OUK_X, OUK_Y, 120, 84, 0, 0).setDepth(30).setInteractive({ useHandCursor: true });
    t2Hit.on('pointerdown', () => EventBus.emit('ui:openModal', { modal: 'clubGames', clubGame: 'ouk_chaktrang' }));
    this.add
      .text(OUK_X, OUK_Y + 50, '♟️ OUK CHAKTRANG (8×8 Chess)', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fde68a',
        backgroundColor: 'rgba(15,23,42,0.88)',
        padding: { x: 7, y: 2 },
      })
      .setResolution(2)
      .setScale(0.56)
      .setOrigin(0.5)
      .setDepth(30);

    // Table 3 (Right): Tien Len (13-Card Khmer Poker) Table
    const t1 = this.add.graphics().setDepth(20);
    t1.fillStyle(0x065f46, 1);
    t1.lineStyle(4, 0xd97706, 1);
    t1.fillEllipse(TIEN_LEN_X, TIEN_LEN_Y, 124, 80);
    t1.strokeEllipse(TIEN_LEN_X, TIEN_LEN_Y, 124, 80);
    t1.fillStyle(0xffffff, 1);
    t1.fillRect(TIEN_LEN_X - 18, TIEN_LEN_Y - 8, 12, 16);
    t1.fillRect(TIEN_LEN_X + 6, TIEN_LEN_Y - 10, 12, 16);
    const t1Hit = this.add.rectangle(TIEN_LEN_X, TIEN_LEN_Y, 124, 84, 0, 0).setDepth(30).setInteractive({ useHandCursor: true });
    t1Hit.on('pointerdown', () => EventBus.emit('ui:openModal', { modal: 'clubGames', clubGame: 'tien_len' }));
    this.add
      .text(TIEN_LEN_X, TIEN_LEN_Y + 50, '🃏 TIEN LEN (13-Card)', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15,23,42,0.88)',
        padding: { x: 7, y: 2 },
      })
      .setResolution(2)
      .setScale(0.56)
      .setOrigin(0.5)
      .setDepth(30);

    // Back Exit Door to Market Street
    const exitMat = this.add
      .rectangle(EXIT_X, EXIT_Y, 88, 28, 0x991b1b, 0.9)
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

  private tryInteractNearest(): void {
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_X, EXIT_Y) < 56) {
      this.returnToOverworld();
      return;
    }
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, KLA_KLOK_X, KLA_KLOK_Y) < 92) {
      EventBus.emit('ui:openModal', { modal: 'clubGames', clubGame: 'kla_klok' });
      return;
    }
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, OUK_X, OUK_Y) < 92) {
      EventBus.emit('ui:openModal', { modal: 'clubGames', clubGame: 'ouk_chaktrang' });
      return;
    }
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, TIEN_LEN_X, TIEN_LEN_Y) < 92) {
      EventBus.emit('ui:openModal', { modal: 'clubGames', clubGame: 'tien_len' });
      return;
    }
    EventBus.emit('ui:openModal', { modal: 'clubGames', clubGame: 'kla_klok' });
  }

  private returnToOverworld(
    spawnX = 1060,
    spawnY = 860,
    goldenFlash = false,
    mapId: 'central_plaza' | 'market_street' | 'temple_district' | 'green_park' | 'wild_frontier' = 'market_street'
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
      this.player.body.setVelocity(nx * 124, ny * 124);
      this.player.facing = Math.abs(nx) >= Math.abs(ny) ? (nx < 0 ? 'left' : 'right') : ny < 0 ? 'up' : 'down';
      this.player.playStateAnimation('walk');
    } else {
      this.player.body.setVelocity(0, 0);
      this.player.playStateAnimation('idle');
    }

    this.player.syncVisuals(time, true);

    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, KLA_KLOK_X, KLA_KLOK_Y) < 92) {
      this.promptText.setPosition(KLA_KLOK_X, KLA_KLOK_Y - 48).setText('Press [E] or Click → Play Kla Klok (3-Dice)!').setVisible(true);
    } else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, OUK_X, OUK_Y) < 92) {
      this.promptText.setPosition(OUK_X, OUK_Y - 48).setText('Press [E] or Click → Play Ouk Chaktrang (8×8)!').setVisible(true);
    } else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, TIEN_LEN_X, TIEN_LEN_Y) < 92) {
      this.promptText.setPosition(TIEN_LEN_X, TIEN_LEN_Y - 48).setText('Press [E] or Click → Play Tien Len!').setVisible(true);
    } else if (Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_X, EXIT_Y) < 56) {
      this.promptText.setPosition(EXIT_X, EXIT_Y - 40).setText('Press [E] or Click → Exit to Market Street').setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }
}
