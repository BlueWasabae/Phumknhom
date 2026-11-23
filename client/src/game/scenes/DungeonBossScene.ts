import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PlayerState } from '@shared/types';
import { calculatePlayerDamage, getXpForNextLevel } from '@shared/balanceFormulas';
import { EventBus, type JoystickVector } from '../EventBus';
import { OverheadBubble } from '../OverheadBubble';

const ARENA_W = 1800;
const ARENA_H = 720;
const FLOOR_Y = 620;
const DUMMY_SPAWN_X = 1380;
const DUMMY_SPAWN_Y = FLOOR_Y - 40;
const DUMMY_MAX_HP = 180;
const EXIT_PORTAL_X = 115;
const EXIT_PORTAL_Y = FLOOR_Y - 58;

export class DungeonBossScene extends Phaser.Scene {
  private playerState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private player!: Phaser.Physics.Arcade.Sprite;
  private nameTag!: Phaser.GameObjects.Text;
  private bubble!: OverheadBubble;
  private promptText!: Phaser.GameObjects.Text;

  private solidFloor!: Phaser.Physics.Arcade.StaticGroup;
  private elevatedPlatforms!: Phaser.Physics.Arcade.StaticGroup;

  // Training Slime Dummy
  private dummy!: Phaser.Physics.Arcade.Sprite;
  private dummyHp = DUMMY_MAX_HP;
  private dummyAlive = true;
  private dummyBarBg!: Phaser.GameObjects.Rectangle;
  private dummyBarFill!: Phaser.GameObjects.Rectangle;
  private dummyLabel!: Phaser.GameObjects.Text;

  // Controls & Combat State
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'A' | 'D' | 'W' | 'E' | 'J' | 'K' | 'SHIFT' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };
  private facingRight = true;
  private jumpsUsed = 0;
  private dashActiveUntil = 0;
  private dashCooldownUntil = 0;
  private invulnerableUntil = 0;
  private attackCooldownUntil = 0;
  private attackAnimUntil = 0;
  private nearExitSent = false;
  private transitioning = false;
  private unsubs: Array<() => void> = [];

  constructor() {
    super('DungeonBossScene');
  }

  init(data?: { playerState?: PlayerState }): void {
    this.playerState = data?.playerState
      ? { ...data.playerState, zone: 'dungeon', weapon: { ...data.playerState.weapon } }
      : { ...INITIAL_PLAYER_STATE, zone: 'dungeon', weapon: { ...INITIAL_PLAYER_STATE.weapon } };
    this.dummyHp = DUMMY_MAX_HP;
    this.dummyAlive = true;
    this.jumpsUsed = 0;
    this.nearExitSent = false;
    this.transitioning = false;
    this.joystick = { x: 0, y: 0 };
  }

  create(): void {
    // Terraria / Calamity Mode: Side-Scrolling 2D with gravity = 800
    this.physics.world.gravity.y = 800;
    this.physics.world.setBounds(0, 0, ARENA_W, ARENA_H);

    this.drawParallaxCavern();
    this.buildArenaPlatforms();
    this.buildExitPortal();
    this.buildTrainingDummy();

    // Player Physics Sprite
    this.player = this.physics.add.sprite(240, FLOOR_Y - 52, 'player_chibi', 0);
    this.player.setCollideWorldBounds(true);
    this.player.setSize(24, 46).setOffset(16, 12);
    this.player.setDepth(50);

    this.physics.add.collider(this.player, this.solidFloor);
    // One-way jump-through collision for the 4 elevated platforms
    this.physics.add.collider(
      this.player,
      this.elevatedPlatforms,
      undefined,
      (playerObj, platObj) => {
        const p = playerObj as Phaser.Physics.Arcade.Sprite;
        const plat = platObj as Phaser.GameObjects.Rectangle;
        const body = p.body as Phaser.Physics.Arcade.Body;
        return body.velocity.y >= 0 && body.bottom <= plat.y - plat.height / 2 + 14;
      }
    );

    this.nameTag = this.add
      .text(this.player.x, this.player.y + 30, this.playerState.name, {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef9c3',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(55);

    this.bubble = new OverheadBubble(this);

    this.promptText = this.add
      .text(EXIT_PORTAL_X, EXIT_PORTAL_Y - 78, 'Press [E] or Tap EXIT → Return to Phum Village', {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setDepth(90)
      .setVisible(false);

    this.cameras.main.setBounds(0, 0, ARENA_W, ARENA_H);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.cameras.main.fadeIn(240, 8, 10, 20);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D,W,E,J,K,SHIFT,SPACE') as Record<
      'A' | 'D' | 'W' | 'E' | 'J' | 'K' | 'SHIFT' | 'SPACE',
      Phaser.Input.Keyboard.Key
    >;

    // Left Click triggers Melee Sword Swing (ignoring UI clicks handled by React)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.performMeleeSwing();
      }
    });

    this.unsubs.push(
      EventBus.on('mobile:joystick', (vec) => {
        this.joystick = vec;
      }),
      EventBus.on('player:chat', ({ text }) => {
        this.bubble.showSpeech(text, 4500);
      }),
      EventBus.on('player:emote', ({ emoji }) => {
        this.bubble.showEmote(emoji, 3000);
      }),
      EventBus.on('input:jump', () => this.performJump()),
      EventBus.on('input:attack', () => this.performMeleeSwing()),
      EventBus.on('input:dash', () => this.performDash()),
      EventBus.on('input:exitDungeon', () => this.returnToOverworld()),
      EventBus.on('input:interact', () => {
        if (this.isNearExitPortal()) this.returnToOverworld();
      })
    );

    EventBus.emit('scene:ready', { zone: 'dungeon' });
    EventBus.emit('player:state', this.playerState);
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: 'overworld' });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.bubble.destroy();
    });
  }

  private drawParallaxCavern(): void {
    // Far cavern gradient & stalactites (scrollFactor 0.25)
    const far = this.add.graphics().setScrollFactor(0.25).setDepth(0);
    far.fillGradientStyle(0x0b1020, 0x0b1020, 0x1e1b4b, 0x2e1065, 1);
    far.fillRect(0, 0, ARENA_W, ARENA_H);
    far.fillStyle(0x1e293b, 0.7);
    for (let x = 40; x < 1200; x += 150) {
      far.fillTriangle(x, 0, x + 36, 120 + (x % 60), x + 72, 0);
    }

    // Mid-layer ancient Angkor stone columns & flickering torches (scrollFactor 0.55)
    const mid = this.add.graphics().setScrollFactor(0.55).setDepth(2);
    for (let x = 130; x < 1600; x += 250) {
      mid.fillStyle(0x1e293b, 0.85);
      mid.fillRect(x, 90, 56, 540);
      mid.fillStyle(0x334155, 0.85);
      mid.fillRect(x - 8, 90, 72, 22);
      // Warm torch glow
      mid.fillStyle(0xf59e0b, 0.22);
      mid.fillCircle(x + 28, 280, 38);
      mid.fillStyle(0xf97316, 0.95);
      mid.fillCircle(x + 28, 280, 7);
    }

    // In-cavern controls hint banner
    this.add
      .text(440, 125, 'ANCIENT CAVERN · PHASE 1 COMBAT ARENA', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setDepth(5);
    this.add
      .text(440, 152, 'A/D Move  ·  Space/W Double Jump  ·  Shift/K Dash  ·  J/Click Sword Swing', {
        fontFamily: 'Kantumruy Pro, sans-serif',
        fontSize: '12px',
        color: '#cbd5e1',
      })
      .setDepth(5);
  }

  private buildArenaPlatforms(): void {
    this.solidFloor = this.physics.add.staticGroup();
    this.elevatedPlatforms = this.physics.add.staticGroup();

    // Tiled Stone Floor visual + solid collider
    this.add.tileSprite(ARENA_W / 2, FLOOR_Y + 50, ARENA_W, 100, 'tile_stone').setDepth(10);
    const floorCollider = this.add.rectangle(ARENA_W / 2, FLOOR_Y + 50, ARENA_W, 100, 0x000000, 0);
    this.solidFloor.add(floorCollider);

    // 4 Elevated Platforms at varying heights
    const platforms = [
      { x: 460, y: 500, w: 220 },
      { x: 780, y: 395, w: 240 },
      { x: 1120, y: 485, w: 220 },
      { x: 1460, y: 365, w: 230 },
    ];
    for (const p of platforms) {
      const rect = this.add
        .rectangle(p.x, p.y, p.w, 18, 0x475569)
        .setStrokeStyle(3, 0xf59e0b)
        .setDepth(14);
      this.elevatedPlatforms.add(rect);
    }
  }

  private buildExitPortal(): void {
    this.add.image(EXIT_PORTAL_X, EXIT_PORTAL_Y, 'portal_exit').setDepth(20);
    const arrow = this.add.image(EXIT_PORTAL_X, EXIT_PORTAL_Y - 82, 'join_arrow').setDepth(24);
    this.tweens.add({
      targets: arrow,
      y: EXIT_PORTAL_Y - 94,
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.add
      .text(EXIT_PORTAL_X, EXIT_PORTAL_Y + 62, 'VILLAGE EXIT', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 0)
      .setDepth(22);
  }

  private buildTrainingDummy(): void {
    this.dummy = this.physics.add.sprite(DUMMY_SPAWN_X, DUMMY_SPAWN_Y, 'slime_dummy');
    this.dummy.setCollideWorldBounds(true);
    this.dummy.setDragX(520);
    this.dummy.setBounce(0.15);
    this.dummy.setSize(48, 44).setOffset(8, 8);
    this.dummy.setDepth(42);
    this.physics.add.collider(this.dummy, this.solidFloor);

    this.dummyLabel = this.add
      .text(DUMMY_SPAWN_X, DUMMY_SPAWN_Y - 46, 'Training Slime Dummy', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#86efac',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(46);

    this.dummyBarBg = this.add
      .rectangle(DUMMY_SPAWN_X, DUMMY_SPAWN_Y - 36, 74, 8, 0x0f172a)
      .setStrokeStyle(1.5, 0x64748b)
      .setDepth(46);

    this.dummyBarFill = this.add
      .rectangle(DUMMY_SPAWN_X - 35, DUMMY_SPAWN_Y - 36, 70, 5, 0x22c55e)
      .setOrigin(0, 0.5)
      .setDepth(47);
  }

  private performJump(): void {
    if (this.transitioning) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down || body.touching.down;
    if (onGround) {
      this.jumpsUsed = 1;
      body.setVelocityY(-490);
    } else if (this.jumpsUsed < 2) {
      this.jumpsUsed = 2;
      body.setVelocityY(-455);
      this.spawnFloatingText(this.player.x, this.player.y - 26, 'Double Jump!', '#38bdf8', '13px');
    }
  }

  private performDash(): void {
    const now = this.time.now;
    if (now < this.dashCooldownUntil || this.transitioning) return;
    this.dashCooldownUntil = now + 950;
    this.dashActiveUntil = now + 200;
    this.invulnerableUntil = now + 360;

    const dir = this.facingRight ? 1 : -1;
    this.player.setVelocityX(dir * 640);
    this.player.setVelocityY(-45);
    this.player.setTintFill(0xffffff);
    this.time.delayedCall(120, () => this.player.clearTint());
    this.spawnFloatingText(this.player.x, this.player.y - 34, 'DASH!', '#facc15', '14px');
  }

  private performMeleeSwing(): void {
    const now = this.time.now;
    if (now < this.attackCooldownUntil || this.transitioning) return;

    const weapon = this.playerState.weapon;
    this.attackCooldownUntil = now + weapon.attackCooldownMs;
    this.attackAnimUntil = now + 185;

    const dir = this.facingRight ? 1 : -1;
    const hitX = this.player.x + dir * 48;
    const hitY = this.player.y - 4;

    // Crisp glowing melee sword slash arc visual
    const arc = this.add.graphics().setDepth(60);
    arc.lineStyle(8, 0xfef08a, 0.9);
    arc.beginPath();
    if (this.facingRight) {
      arc.arc(this.player.x + 12, hitY, 50, -Math.PI * 0.42, Math.PI * 0.42, false);
    } else {
      arc.arc(this.player.x - 12, hitY, 50, Math.PI * 0.58, Math.PI * 1.42, false);
    }
    arc.strokePath();
    this.tweens.add({
      targets: arc,
      alpha: 0,
      duration: 165,
      onComplete: () => arc.destroy(),
    });

    // Check hitbox overlap with Training Slime Dummy
    if (this.dummyAlive) {
      const swingBox = new Phaser.Geom.Rectangle(hitX - 46, hitY - 38, 92, 76);
      const dummyBounds = this.dummy.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(swingBox, dummyBounds)) {
        this.hitTrainingDummy(dir);
      }
    }
  }

  private hitTrainingDummy(knockDir: number): void {
    const { weapon, skillDamagePct, armorDamagePct, snackBuffPct } = this.playerState;

    // Calculate hit using exact @shared/balanceFormulas.ts math
    const hit = calculatePlayerDamage({
      weaponBase: weapon.baseDamage,
      upgradeLevel: weapon.upgradeLevel,
      flatBonuses: this.playerState.level * 2,
      skillPct: skillDamagePct,
      armorPct: armorDamagePct,
      snackBuffPct: snackBuffPct,
      enemyDefense: 6,
      armorPen: weapon.armorPen,
      bossDR: 0,
      critChance: weapon.critChance,
    });

    this.dummyHp = Math.max(0, this.dummyHp - hit.finalDamage);
    this.dummy.setVelocity(knockDir * weapon.knockbackForce, -155);
    this.dummy.setTintFill(0xffffff);
    this.time.delayedCall(95, () => {
      if (this.dummyAlive) this.dummy.clearTint();
    });

    // Floating damage numbers (larger bold gold on Crit!)
    this.spawnFloatingText(
      this.dummy.x + (Math.random() - 0.5) * 26,
      this.dummy.y - 36,
      hit.isCrit ? `${hit.finalDamage}! CRIT` : `${hit.finalDamage}`,
      hit.isCrit ? '#facc15' : '#ffffff',
      hit.isCrit ? '22px' : '16px'
    );

    if (hit.isCrit) {
      this.cameras.main.shake(95, 0.005);
    }

    EventBus.emit('combat:hit', { hit, dummyHp: this.dummyHp, dummyMaxHp: DUMMY_MAX_HP });

    if (this.dummyHp <= 0) {
      this.defeatAndRespawnDummy();
    }
  }

  private defeatAndRespawnDummy(): void {
    this.dummyAlive = false;
    this.dummy.setVisible(false);
    this.dummyBarBg.setVisible(false);
    this.dummyBarFill.setVisible(false);
    this.dummyLabel.setText('Respawning in 3s...').setColor('#fbbf24');

    // Award practice Coins & XP using getXpForNextLevel from @shared/balanceFormulas
    this.playerState.coins += 25;
    this.playerState.xp += 30;
    while (this.playerState.xp >= getXpForNextLevel(this.playerState.level)) {
      this.playerState.xp -= getXpForNextLevel(this.playerState.level);
      this.playerState.level += 1;
      this.playerState.maxHp += 15;
      this.playerState.hp = this.playerState.maxHp;
      this.spawnFloatingText(this.player.x, this.player.y - 54, `LEVEL UP! Lv.${this.playerState.level}`, '#fde047', '18px');
    }
    EventBus.emit('player:state', { ...this.playerState, weapon: { ...this.playerState.weapon } });
    this.spawnFloatingText(this.dummy.x, this.dummy.y - 54, '+25 Coins · +30 XP', '#4ade80', '14px');

    // Respawn dummy cleanly after 3 seconds
    this.time.delayedCall(3000, () => {
      if (!this.scene.isActive('DungeonBossScene')) return;
      this.dummyHp = DUMMY_MAX_HP;
      this.dummyAlive = true;
      this.dummy.setPosition(DUMMY_SPAWN_X, DUMMY_SPAWN_Y);
      this.dummy.setVelocity(0, 0);
      this.dummy.clearTint();
      this.dummy.setVisible(true);
      this.dummyBarBg.setVisible(true);
      this.dummyBarFill.setVisible(true);
      this.dummyLabel.setText('Training Slime Dummy').setColor('#86efac');
      this.spawnFloatingText(DUMMY_SPAWN_X, DUMMY_SPAWN_Y - 40, 'Dummy Respawned!', '#86efac', '13px');
    });
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, fontSize: string): void {
    const txt = this.add
      .text(x, y, text, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize,
        fontStyle: 'bold',
        color,
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(120);
    this.tweens.add({
      targets: txt,
      y: y - 42,
      alpha: 0,
      duration: 720,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  private isNearExitPortal(): boolean {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_PORTAL_X, EXIT_PORTAL_Y) < 92;
  }

  private returnToOverworld(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(220, 8, 12, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        playerState: {
          ...this.playerState,
          zone: 'overworld',
          weapon: { ...this.playerState.weapon },
        },
      });
    });
  }

  update(time: number): void {
    const typing =
      document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down || body.touching.down;
    if (onGround) this.jumpsUsed = 0;

    // Brief i-frame blink during Dash
    if (time < this.invulnerableUntil) {
      this.player.setAlpha(Math.floor(time / 55) % 2 === 0 ? 0.55 : 1);
    } else {
      this.player.setAlpha(1);
    }

    if (time > this.dashActiveUntil && !this.transitioning) {
      let moveX = this.joystick.x;
      if (!typing) {
        if (this.cursors.left.isDown || this.keys.A.isDown) moveX -= 1;
        if (this.cursors.right.isDown || this.keys.D.isDown) moveX += 1;

        if (
          Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
          Phaser.Input.Keyboard.JustDown(this.keys.W) ||
          Phaser.Input.Keyboard.JustDown(this.cursors.up)
        ) {
          this.performJump();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) || Phaser.Input.Keyboard.JustDown(this.keys.K)) {
          this.performDash();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
          this.performMeleeSwing();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.E) && this.isNearExitPortal()) {
          this.returnToOverworld();
        }
      }

      if (Math.abs(moveX) > 0.12) {
        const dir = moveX < 0 ? -1 : 1;
        this.facingRight = dir > 0;
        body.setVelocityX(dir * 270);
      } else {
        body.setVelocityX(0);
      }
    }

    // Chibi Animation Frame
    let frame = 0;
    if (time < this.attackAnimUntil) frame = 4;
    else if (!onGround) frame = 3;
    else if (Math.abs(body.velocity.x) > 15) frame = Math.floor(time / 135) % 2 === 0 ? 1 : 2;
    this.player.setFrame(frame);
    this.player.setFlipX(!this.facingRight);

    this.nameTag.setPosition(this.player.x, this.player.y + 30);
    this.bubble.update(this.player.x, this.player.y, -38);

    // Sync Training Dummy UI bar & idle bounce
    if (this.dummyAlive) {
      const ratio = Math.max(0, this.dummyHp / DUMMY_MAX_HP);
      this.dummyBarBg.setPosition(this.dummy.x, this.dummy.y - 36);
      this.dummyBarFill.setPosition(this.dummy.x - 35, this.dummy.y - 36);
      this.dummyBarFill.width = 70 * ratio;
      this.dummyLabel.setPosition(this.dummy.x, this.dummy.y - 46);
    } else {
      this.dummyLabel.setPosition(DUMMY_SPAWN_X, DUMMY_SPAWN_Y - 46);
    }

    // Village Exit Portal proximity check
    const nearExit = this.isNearExitPortal();
    this.promptText.setVisible(nearExit);
    if (nearExit !== this.nearExitSent) {
      this.nearExitSent = nearExit;
      EventBus.emit('portal:proximity', {
        nearPortal: nearExit,
        label: nearExit ? 'EXIT' : '',
        targetZone: 'overworld',
      });
    }
  }
}
