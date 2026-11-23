import Phaser from 'phaser';
import type { PlayerState, ZoneType } from '@shared/types';

export type FacingDirection = 'down' | 'up' | 'left' | 'right';

const IDLE_FRAME: Record<FacingDirection, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
};

const ATTACK_FRAME: Record<FacingDirection, number> = {
  down: 16,
  up: 17,
  left: 18,
  right: 19,
};

const JUMP_FRAME: Record<FacingDirection, number> = {
  down: 20,
  up: 21,
  left: 22,
  right: 23,
};

/**
 * Real animated Ninja Adventure chibi sprite (16x16 scaled 3x -> crisp 48x48 pixel art)
 * with soft ground shadow, 4-direction walk/idle/jump/attack frames, nameplate,
 * 4.5s overhead speech bubble, and 3s floating emoji emote.
 */
export class Player {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  public readonly body: Phaser.Physics.Arcade.Body;
  public readonly shadow: Phaser.GameObjects.Image;
  public state: PlayerState;
  public facing: FacingDirection = 'down';

  private scene: Phaser.Scene;
  private zone: ZoneType;
  private nameTag: Phaser.GameObjects.Text;
  private bubbleBg: Phaser.GameObjects.Graphics;
  private bubbleText: Phaser.GameObjects.Text;
  private emoteText: Phaser.GameObjects.Text;

  private bubbleExpiresAt = 0;
  private emoteExpiresAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    state: PlayerState,
    zone: ZoneType
  ) {
    this.scene = scene;
    this.state = { ...state, zone, weapon: { ...state.weapon } };
    this.zone = zone;
    this.facing = zone === 'dungeon' ? 'right' : 'down';

    // Soft elliptical shadow under character feet
    this.shadow = scene.add.image(x, y + 20, 'soft_shadow').setDepth(zone === 'overworld' ? y + 10 : 48);

    // 16x16 Ninja Adventure Boy sprite scaled 3x (48x48 crisp pixelArt)
    this.sprite = scene.physics.add.sprite(x, y, 'player_boy', IDLE_FRAME[this.facing]);
    this.sprite.setScale(3);
    this.sprite.setCollideWorldBounds(true);

    if (zone === 'overworld') {
      // Foot collider (in unscaled 16x16 coords) for smooth 2.5D Y-sorting
      this.sprite.setSize(10, 6).setOffset(3, 10);
    } else {
      // Side-scrolling platformer collider (in unscaled 16x16 coords)
      this.sprite.setSize(10, 14).setOffset(3, 2);
      this.sprite.setDepth(50);
    }

    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;

    this.nameTag = scene.add
      .text(x, y + 26, this.state.name, {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: zone === 'overworld' ? '#ffffff' : '#fef9c3',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(2500);

    this.bubbleBg = scene.add.graphics().setDepth(3000).setVisible(false);
    this.bubbleText = scene.add
      .text(0, 0, '', {
        fontFamily: 'Kantumruy Pro, system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#1e293b',
        wordWrap: { width: 190 },
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(3001)
      .setVisible(false);

    this.emoteText = scene.add
      .text(0, 0, '', { fontSize: '26px' })
      .setOrigin(0.5, 1)
      .setDepth(3002)
      .setVisible(false);
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get facingRight(): boolean {
    return this.facing !== 'left';
  }

  showSpeechBubble(text: string, durationMs = 4500): void {
    const clean = text.trim().slice(0, 120);
    if (!clean) return;
    this.bubbleText.setText(clean).setVisible(true);
    this.bubbleBg.setVisible(true);
    this.bubbleExpiresAt = this.scene.time.now + durationMs;
  }

  showEmote(emoji: string, durationMs = 3000): void {
    this.emoteText.setText(emoji).setVisible(true);
    this.emoteExpiresAt = this.scene.time.now + durationMs;
  }

  playStateAnimation(mode: 'idle' | 'walk' | 'jump' | 'attack'): void {
    if (mode === 'walk') {
      const animKey = `boy_walk_${this.facing}`;
      if (this.sprite.anims.currentAnim?.key !== animKey || !this.sprite.anims.isPlaying) {
        this.sprite.play(animKey, true);
      }
      return;
    }

    this.sprite.anims.stop();
    if (mode === 'attack') {
      this.sprite.setFrame(ATTACK_FRAME[this.facing]);
    } else if (mode === 'jump') {
      this.sprite.setFrame(JUMP_FRAME[this.facing]);
    } else {
      this.sprite.setFrame(IDLE_FRAME[this.facing]);
    }
  }

  syncVisuals(time: number, onGround = true): void {
    if (this.zone === 'overworld') {
      const depth = this.sprite.y + 24;
      this.sprite.setDepth(depth);
      this.shadow.setPosition(this.sprite.x, this.sprite.y + 22).setDepth(depth - 1).setScale(1).setAlpha(0.95);
    } else {
      // Scale shadow slightly smaller when airborne in side-scrolling dungeon
      this.shadow
        .setPosition(this.sprite.x, this.sprite.y + 23)
        .setDepth(48)
        .setScale(onGround ? 1 : 0.6)
        .setAlpha(onGround ? 0.9 : 0.35);
    }

    this.nameTag.setPosition(this.sprite.x, this.sprite.y + 28);

    const offsetY = -30;
    if (this.bubbleExpiresAt > 0) {
      if (time >= this.bubbleExpiresAt) {
        this.bubbleBg.setVisible(false);
        this.bubbleText.setVisible(false);
        this.bubbleExpiresAt = 0;
      } else {
        const bx = Math.round(this.sprite.x);
        const by = Math.round(this.sprite.y + offsetY);
        this.bubbleText.setPosition(bx, by - 8);

        const padX = 12;
        const padY = 7;
        const w = Math.max(54, this.bubbleText.width + padX * 2);
        const h = Math.max(26, this.bubbleText.height + padY * 2);

        this.bubbleBg.clear();
        this.bubbleBg.fillStyle(0xffffff, 0.98);
        this.bubbleBg.lineStyle(2.5, 0x334155, 1);
        this.bubbleBg.fillRoundedRect(bx - w / 2, by - 8 - h + padY, w, h, 11);
        this.bubbleBg.strokeRoundedRect(bx - w / 2, by - 8 - h + padY, w, h, 11);
        this.bubbleBg.fillStyle(0xffffff, 0.98);
        this.bubbleBg.fillTriangle(bx - 6, by - 8 + padY, bx + 6, by - 8 + padY, bx, by + padY);
      }
    }

    if (this.emoteExpiresAt > 0) {
      if (time >= this.emoteExpiresAt) {
        this.emoteText.setVisible(false);
        this.emoteExpiresAt = 0;
      } else {
        const floatY = Math.sin(time / 160) * 4;
        const extraY = this.bubbleExpiresAt > 0 ? -52 : 0;
        this.emoteText.setPosition(this.sprite.x, this.sprite.y + offsetY + extraY + floatY);
      }
    }
  }

  destroy(): void {
    this.shadow.destroy();
    this.nameTag.destroy();
    this.bubbleBg.destroy();
    this.bubbleText.destroy();
    this.emoteText.destroy();
  }
}
