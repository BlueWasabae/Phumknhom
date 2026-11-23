import Phaser from 'phaser';
import type { PlayerState, ZoneType } from '@shared/types';

/**
 * Unified Player entity shared by OverworldScene (top-down, g=0)
 * and DungeonBossScene (side-scrolling, g=800).
 * Owns the physics sprite, nameplate, 4.5s overhead speech bubble, and 3s floating emote.
 */
export class Player {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  public readonly body: Phaser.Physics.Arcade.Body;
  public state: PlayerState;

  private scene: Phaser.Scene;
  private zone: ZoneType;
  private nameTag: Phaser.GameObjects.Text;
  private bubbleBg: Phaser.GameObjects.Graphics;
  private bubbleText: Phaser.GameObjects.Text;
  private emoteText: Phaser.GameObjects.Text;

  private bubbleExpiresAt = 0;
  private emoteExpiresAt = 0;
  public facingRight = true;

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

    this.sprite = scene.physics.add.sprite(x, y, 'player_chibi', 0);
    this.sprite.setCollideWorldBounds(true);

    if (zone === 'overworld') {
      // Foot hitbox for natural 2.5D Y-sorting behind stalls & trees
      this.sprite.setSize(24, 16).setOffset(16, 42);
    } else {
      // Full-body hitbox for side-scrolling platforming
      this.sprite.setSize(24, 46).setOffset(16, 12);
      this.sprite.setDepth(50);
    }

    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;

    this.nameTag = scene.add
      .text(x, y + 28, this.state.name, {
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

  syncVisuals(time: number, frame: number): void {
    this.sprite.setFrame(frame);
    this.sprite.setFlipX(!this.facingRight);

    if (this.zone === 'overworld') {
      this.sprite.setDepth(this.sprite.y + 20);
    }

    this.nameTag.setPosition(this.sprite.x, this.sprite.y + (this.zone === 'overworld' ? 26 : 30));

    const offsetY = this.zone === 'overworld' ? -34 : -38;
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
    this.nameTag.destroy();
    this.bubbleBg.destroy();
    this.bubbleText.destroy();
    this.emoteText.destroy();
  }
}
