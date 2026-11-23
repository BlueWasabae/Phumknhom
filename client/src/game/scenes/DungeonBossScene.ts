import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE, type PlayerState } from '@shared/types';
import { calculatePlayerDamage, getXpForNextLevel } from '@shared/balanceFormulas';
import { EventBus, type JoystickVector } from '../EventBus';
import { Player } from '../entities/Player';

const ARENA_W = 1800;
const ARENA_H = 720;
const FLOOR_Y = 620;
const DUMMY_SPAWN_X = 1380;
const DUMMY_SPAWN_Y = FLOOR_Y - 36;
const DUMMY_MAX_HP = 180;
const EXIT_PORTAL_X = 118;
const EXIT_PORTAL_Y = FLOOR_Y - 68;

export class DungeonBossScene extends Phaser.Scene {
  private initialState: PlayerState = { ...INITIAL_PLAYER_STATE };
  private player!: Player;
  private promptText!: Phaser.GameObjects.Text;

  private solidFloor!: Phaser.Physics.Arcade.StaticGroup;
  private elevatedPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private parallaxFar!: Phaser.GameObjects.TileSprite;
  private parallaxMid!: Phaser.GameObjects.TileSprite;

  // Training Slime Dummy (Ninja Adventure Slime sprite)
  private dummy!: Phaser.Physics.Arcade.Sprite;
  private dummyShadow!: Phaser.GameObjects.Image;
  private dummyHp = DUMMY_MAX_HP;
  private dummyAlive = true;
  private dummyBarBg!: Phaser.GameObjects.Rectangle;
  private dummyBarFill!: Phaser.GameObjects.Rectangle;
  private dummyLabel!: Phaser.GameObjects.Text;

  // Platformer & Combat State
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'A' | 'D' | 'W' | 'E' | 'J' | 'K' | 'SHIFT' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private joystick: JoystickVector = { x: 0, y: 0 };
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
    this.initialState = data?.playerState
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
    // Terraria / Calamity Mode: Side-Scrolling 2D (gravity = 800)
    this.physics.world.gravity.y = 800;
    this.physics.world.setBounds(0, 0, ARENA_W, ARENA_H);

    this.drawParallaxCavern();
    this.buildArenaPlatforms();
    this.buildExitPortal();
    this.buildTrainingDummy();

    this.player = new Player(this, 240, FLOOR_Y - 46, this.initialState, 'dungeon');
    this.physics.add.collider(this.player.sprite, this.solidFloor);
    // One-way jump-through collision for the 4 elevated platforms
    this.physics.add.collider(
      this.player.sprite,
      this.elevatedPlatforms,
      undefined,
      (playerObj, platObj) => {
        const p = playerObj as Phaser.Physics.Arcade.Sprite;
        const plat = platObj as Phaser.GameObjects.Rectangle;
        const body = p.body as Phaser.Physics.Arcade.Body;
        return body.velocity.y >= 0 && body.bottom <= plat.y - plat.height / 2 + 14;
      }
    );

    this.promptText = this.add
      .text(EXIT_PORTAL_X + 20, EXIT_PORTAL_Y - 94, 'Press [E] or Tap EXIT → Return to Phum Village', {
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
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.fadeIn(240, 8, 10, 20);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D,W,E,J,K,SHIFT,SPACE') as Record<
      'A' | 'D' | 'W' | 'E' | 'J' | 'K' | 'SHIFT' | 'SPACE',
      Phaser.Input.Keyboard.Key
    >;

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
        this.player.showSpeechBubble(text, 4500);
      }),
      EventBus.on('player:emote', ({ emoji }) => {
        this.player.showEmote(emoji, 3000);
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
    EventBus.emit('player:state', this.player.state);
    EventBus.emit('portal:proximity', { nearPortal: false, label: '', targetZone: 'overworld' });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
      this.player.destroy();
    });
  }

  private drawParallaxCavern(): void {
    // 1. Legacy Fantasy Twilight Sky backdrop (desaturated indigo tint per Animation Bible §3)
    this.add
      .tileSprite(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 'lf_sky')
      .setTileScale(2.8, 2.8)
      .setTint(0x283056)
      .setScrollFactor(0.1)
      .setDepth(0);

    // 2. Far Parallax Cavern Silhouette Layer
    this.parallaxFar = this.add
      .tileSprite(ARENA_W / 2, 410, ARENA_W, 256, 'lf_parallax_far')
      .setTileScale(2.1, 2.1)
      .setTint(0x24344d)
      .setScrollFactor(0.28)
      .setDepth(2);

    // 3. Mid Parallax Dark Forest-Cave Layer
    this.parallaxMid = this.add
      .tileSprite(ARENA_W / 2, 445, ARENA_W, 256, 'lf_parallax_mid')
      .setTileScale(2.1, 2.1)
      .setTint(0x1b263b)
      .setScrollFactor(0.55)
      .setDepth(4);

    // 4. Atmospheric Legacy Fantasy Stone Monoliths, Glowing Mushrooms & Chest Props
    const monolithXs = [360, 740, 1140, 1580];
    for (const mx of monolithXs) {
      this.add.image(mx, FLOOR_Y - 68, 'lf_pillar').setScale(1.6).setTint(0x64748b).setDepth(6);
    }
    const mushrooms = [310, 620, 970, 1280, 1650];
    for (const mx of mushrooms) {
      this.add.image(mx, FLOOR_Y - 16, 'lf_mushroom').setScale(1.7).setDepth(16);
    }
    this.add.image(1460, 336, 'lf_chest').setScale(1.7).setDepth(16);
    this.add.image(560, FLOOR_Y - 26, 'lf_boulder').setScale(1.4).setTint(0x64748b).setDepth(8);

    this.add
      .text(440, 130, 'ANCIENT CAVERN · PHASE 1 COMBAT ARENA', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fde047',
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setDepth(8);
    this.add
      .text(440, 156, 'A/D Move  ·  Space/W Double Jump  ·  Shift/K Dash  ·  J/Click Sword Swing', {
        fontFamily: 'Kantumruy Pro, sans-serif',
        fontSize: '12px',
        color: '#cbd5e1',
      })
      .setDepth(8);
  }

  private buildArenaPlatforms(): void {
    this.solidFloor = this.physics.add.staticGroup();
    this.elevatedPlatforms = this.physics.add.staticGroup();

    // Legacy Fantasy dark rocky cave ground + mossy top strip
    this.add.tileSprite(ARENA_W / 2, FLOOR_Y + 52, ARENA_W, 108, 'lf_cave_floor').setTileScale(1.8, 1.8).setDepth(10);
    this.add.tileSprite(ARENA_W / 2, FLOOR_Y + 10, ARENA_W, 34, 'lf_moss_top').setTileScale(1.8, 1.4).setDepth(11);
    const floorCollider = this.add.rectangle(ARENA_W / 2, FLOOR_Y + 50, ARENA_W, 100, 0x000000, 0);
    this.solidFloor.add(floorCollider);

    // 4 Elevated One-Way Platforms at varying heights (Legacy Fantasy Stone & Timber Platforms)
    const platforms: Array<{ x: number; y: number; w: number; tex: 'lf_plat_stone' | 'lf_plat_wood' }> = [
      { x: 460, y: 500, w: 224, tex: 'lf_plat_stone' },
      { x: 780, y: 395, w: 240, tex: 'lf_plat_wood' },
      { x: 1120, y: 485, w: 224, tex: 'lf_plat_stone' },
      { x: 1460, y: 365, w: 240, tex: 'lf_plat_wood' },
    ];
    for (const p of platforms) {
      this.add.tileSprite(p.x, p.y, p.w, 26, p.tex).setTileScale(1.6, 1.5).setDepth(14);
      const collider = this.add.rectangle(p.x, p.y, p.w, 18, 0x000000, 0);
      this.elevatedPlatforms.add(collider);
    }
  }

  private buildExitPortal(): void {
    this.add.image(EXIT_PORTAL_X, EXIT_PORTAL_Y, 'lf_cave_entrance').setScale(1.2).setDepth(18);
    const vortex = this.add.image(EXIT_PORTAL_X + 12, EXIT_PORTAL_Y + 8, 'portal_vortex').setTint(0x34d399).setScale(1.1).setDepth(20);
    this.tweens.add({
      targets: vortex,
      alpha: 0.5,
      scale: 1.25,
      duration: 850,
      yoyo: true,
      repeat: -1,
    });

    const arrow = this.add.image(EXIT_PORTAL_X + 8, EXIT_PORTAL_Y - 102, 'join_arrow').setDepth(24);
    this.tweens.add({
      targets: arrow,
      y: EXIT_PORTAL_Y - 114,
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.add
      .text(EXIT_PORTAL_X + 8, FLOOR_Y - 6, 'VILLAGE EXIT', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a7f3d0',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(24);
  }

  private buildTrainingDummy(): void {
    this.dummyShadow = this.add.image(DUMMY_SPAWN_X, FLOOR_Y - 4, 'soft_shadow').setScale(1.3).setDepth(40);
    this.dummy = this.physics.add.sprite(DUMMY_SPAWN_X, DUMMY_SPAWN_Y, 'slime_monster', 0);
    this.dummy.setScale(3.5);
    this.dummy.play('slime_bounce');
    this.dummy.setCollideWorldBounds(true);
    this.dummy.setDragX(520);
    this.dummy.setBounce(0.18);
    this.dummy.setSize(12, 12).setOffset(2, 4);
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
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (onGround) {
      this.jumpsUsed = 1;
      this.player.body.setVelocityY(-495);
    } else if (this.jumpsUsed < 2) {
      this.jumpsUsed = 2;
      this.player.body.setVelocityY(-460);
      this.spawnFloatingText(this.player.x, this.player.y - 26, 'Double Jump!', '#38bdf8', '13px');
    }
  }

  private performDash(): void {
    const now = this.time.now;
    if (now < this.dashCooldownUntil || this.transitioning) return;
    this.dashCooldownUntil = now + 950;
    this.dashActiveUntil = now + 200;
    this.invulnerableUntil = now + 360;

    const dir = this.player.facingRight ? 1 : -1;
    this.player.body.setVelocityX(dir * 640);
    this.player.body.setVelocityY(-45);
    this.player.sprite.setTintFill(0xffffff);
    this.time.delayedCall(120, () => this.player.sprite.clearTint());
    this.spawnFloatingText(this.player.x, this.player.y - 34, 'DASH!', '#facc15', '14px');
  }

  private performMeleeSwing(): void {
    const now = this.time.now;
    if (now < this.attackCooldownUntil || this.transitioning) return;

    const weapon = this.player.state.weapon;
    this.attackCooldownUntil = now + weapon.attackCooldownMs;
    this.attackAnimUntil = now + 185;

    const dir = this.player.facingRight ? 1 : -1;
    const hitX = this.player.x + dir * 48;
    const hitY = this.player.y - 2;

    // Real Ninja Adventure animated Curved Slash VFX sprite
    const slash = this.add
      .sprite(hitX, hitY, 'fx_slash', 0)
      .setScale(2.6)
      .setFlipX(dir < 0)
      .setDepth(62);
    slash.play('slash_curved');
    slash.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => slash.destroy());

    if (this.dummyAlive) {
      const swingBox = new Phaser.Geom.Rectangle(hitX - 48, hitY - 38, 96, 76);
      if (Phaser.Geom.Intersects.RectangleToRectangle(swingBox, this.dummy.getBounds())) {
        this.hitTrainingDummy(dir);
      }
    }
  }

  private hitTrainingDummy(knockDir: number): void {
    const { weapon, skillDamagePct, armorDamagePct, snackBuffPct } = this.player.state;

    const hit = calculatePlayerDamage({
      weaponBase: weapon.baseDamage,
      upgradeLevel: weapon.upgradeLevel,
      flatBonuses: this.player.state.level * 2,
      skillPct: skillDamagePct,
      armorPct: armorDamagePct,
      snackBuffPct: snackBuffPct,
      enemyDefense: 6,
      armorPen: weapon.armorPen,
      bossDR: 0,
      critChance: weapon.critChance,
    });

    this.dummyHp = Math.max(0, this.dummyHp - hit.finalDamage);
    this.dummy.setVelocity(knockDir * weapon.knockbackForce, -165);
    this.dummy.setTintFill(0xffffff);
    this.time.delayedCall(95, () => {
      if (this.dummyAlive) this.dummy.clearTint();
    });

    this.spawnFloatingText(
      this.dummy.x + (Math.random() - 0.5) * 26,
      this.dummy.y - 36,
      hit.isCrit ? `${hit.finalDamage}! CRIT` : `${hit.finalDamage}`,
      hit.isCrit ? '#facc15' : '#ffffff',
      hit.isCrit ? '22px' : '16px'
    );

    // 40ms hit-stop impact juice on Crits
    if (hit.isCrit) {
      this.cameras.main.shake(95, 0.005);
      this.physics.world.pause();
      window.setTimeout(() => {
        if (this.scene.isActive('DungeonBossScene')) {
          this.physics.world.resume();
        }
      }, 40);
    }

    EventBus.emit('combat:hit', { hit, dummyHp: this.dummyHp, dummyMaxHp: DUMMY_MAX_HP });

    if (this.dummyHp <= 0) {
      this.defeatAndRespawnDummy();
    }
  }

  private defeatAndRespawnDummy(): void {
    this.dummyAlive = false;
    this.dummy.setVisible(false);
    this.dummyShadow.setVisible(false);
    this.dummyBarBg.setVisible(false);
    this.dummyBarFill.setVisible(false);
    this.dummyLabel.setText('Respawning in 3s...').setColor('#fbbf24');

    this.player.state.coins += 25;
    this.player.state.xp += 30;
    let leveledUp = false;
    while (this.player.state.xp >= getXpForNextLevel(this.player.state.level)) {
      this.player.state.xp -= getXpForNextLevel(this.player.state.level);
      this.player.state.level += 1;
      this.player.state.maxHp += 15;
      this.player.state.hp = this.player.state.maxHp;
      leveledUp = true;
      this.spawnFloatingText(this.player.x, this.player.y - 54, `LEVEL UP! Lv.${this.player.state.level}`, '#fde047', '18px');
    }
    if (leveledUp && this.cache.audio.exists('sfx_levelup')) {
      this.sound.play('sfx_levelup', { volume: 0.35 });
    }
    EventBus.emit('player:state', { ...this.player.state, weapon: { ...this.player.state.weapon } });
    this.spawnFloatingText(this.dummy.x, this.dummy.y - 54, '+25 Coins · +30 XP', '#4ade80', '14px');

    this.time.delayedCall(3000, () => {
      if (!this.scene.isActive('DungeonBossScene')) return;
      this.dummyHp = DUMMY_MAX_HP;
      this.dummyAlive = true;
      this.dummy.setPosition(DUMMY_SPAWN_X, DUMMY_SPAWN_Y);
      this.dummy.setVelocity(0, 0);
      this.dummy.clearTint();
      this.dummy.setVisible(true);
      this.dummyShadow.setVisible(true);
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
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT_PORTAL_X, EXIT_PORTAL_Y) < 105;
  }

  private returnToOverworld(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(220, 8, 12, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        playerState: {
          ...this.player.state,
          zone: 'overworld',
          weapon: { ...this.player.state.weapon },
        },
      });
    });
  }

  update(time: number): void {
    const typing =
      document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    if (onGround) this.jumpsUsed = 0;

    if (time < this.invulnerableUntil) {
      this.player.sprite.setAlpha(Math.floor(time / 55) % 2 === 0 ? 0.55 : 1);
    } else {
      this.player.sprite.setAlpha(1);
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
        this.player.facing = dir > 0 ? 'right' : 'left';
        this.player.body.setVelocityX(dir * 270);
      } else {
        this.player.body.setVelocityX(0);
      }
    }

    if (time < this.attackAnimUntil) {
      this.player.playStateAnimation('attack');
    } else if (!onGround) {
      this.player.playStateAnimation('jump');
    } else if (Math.abs(this.player.body.velocity.x) > 15) {
      this.player.playStateAnimation('walk');
    } else {
      this.player.playStateAnimation('idle');
    }

    this.player.syncVisuals(time, onGround);

    // Subtle parallax scroll polish
    this.parallaxFar.tilePositionX = this.cameras.main.scrollX * 0.15;
    this.parallaxMid.tilePositionX = this.cameras.main.scrollX * 0.35;

    if (this.dummyAlive) {
      const ratio = Math.max(0, this.dummyHp / DUMMY_MAX_HP);
      this.dummyShadow.setPosition(this.dummy.x, FLOOR_Y - 2);
      this.dummyBarBg.setPosition(this.dummy.x, this.dummy.y - 36);
      this.dummyBarFill.setPosition(this.dummy.x - 35, this.dummy.y - 36);
      this.dummyBarFill.width = 70 * ratio;
      this.dummyLabel.setPosition(this.dummy.x, this.dummy.y - 46);
    } else {
      this.dummyLabel.setPosition(DUMMY_SPAWN_X, DUMMY_SPAWN_Y - 46);
    }

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
