import Phaser from 'phaser';
import type { EquippedLoadout } from '@shared/types';
import { PaperDoll, type PaperDollFacing, type PaperDollPose } from './PaperDoll';
import { Pet } from './Pet';
import { parseAppearance, type RemotePlayerSnapshot } from '../network/RoomClient';

/**
 * Renders another online player inside OverworldScene using the exact same
 * modular 8-layer PaperDoll + Companion Pet + smooth position interpolation (lerp)
 * + 4.5s overhead speech bubble + 3s floating emote.
 */
export class RemotePlayerEntity {
  public readonly sessionId: string;
  public name: string;

  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private targetX: number;
  private targetY: number;
  private facing: PaperDollFacing;
  private isMoving: boolean;
  private appearanceJson: string;
  private loadout: EquippedLoadout;

  private shadow: Phaser.GameObjects.Image;
  private paperDoll: PaperDoll;
  private pet: Pet;
  private nameTag: Phaser.GameObjects.Text;
  private bubbleBg: Phaser.GameObjects.Graphics;
  private bubbleText: Phaser.GameObjects.Text;
  private emoteText: Phaser.GameObjects.Text;

  private bubbleExpiresAt = 0;
  private emoteExpiresAt = 0;
  private readonly uiScale = 0.44;

  constructor(scene: Phaser.Scene, snapshot: RemotePlayerSnapshot) {
    this.scene = scene;
    this.sessionId = snapshot.sessionId;
    this.name = snapshot.name;
    this.x = snapshot.x;
    this.y = snapshot.y;
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.facing = snapshot.facing;
    this.isMoving = snapshot.isMoving;
    this.appearanceJson = snapshot.appearanceJson;
    this.loadout = parseAppearance(snapshot.appearanceJson);

    const safePrefix = `rem_${snapshot.sessionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12)}`;

    this.shadow = scene.add
      .image(this.x, this.y + 8, 'soft_shadow')
      .setScale(0.36)
      .setDepth(this.y + 6);

    this.paperDoll = new PaperDoll(scene, this.x, this.y + 8, this.loadout, `${safePrefix}_pd`);
    this.paperDoll.setScale(0.42);

    this.pet = new Pet(scene, this.x - 16, this.y, this.loadout.pet, 'overworld', `${safePrefix}_pet`);

    this.nameTag = scene.add
      .text(this.x, this.y + 11, this.name, {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#bae6fd',
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setResolution(2)
      .setScale(this.uiScale)
      .setOrigin(0.5, 0)
      .setDepth(2490);

    this.bubbleBg = scene.add.graphics().setDepth(2990).setVisible(false);
    this.bubbleText = scene.add
      .text(0, 0, '', {
        fontFamily: 'Kantumruy Pro, system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#1e293b',
        wordWrap: { width: 185 },
        align: 'center',
      })
      .setResolution(2)
      .setScale(this.uiScale)
      .setOrigin(0.5, 1)
      .setDepth(2991)
      .setVisible(false);

    this.emoteText = scene.add
      .text(0, 0, '', { fontSize: '26px' })
      .setResolution(2)
      .setScale(this.uiScale)
      .setOrigin(0.5, 1)
      .setDepth(2992)
      .setVisible(false);
  }

  public applySnapshot(snapshot: RemotePlayerSnapshot): void {
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.facing = snapshot.facing;
    this.isMoving = snapshot.isMoving;

    if (snapshot.name && snapshot.name !== this.name) {
      this.name = snapshot.name;
      this.nameTag.setText(this.name);
    }

    if (snapshot.appearanceJson && snapshot.appearanceJson !== this.appearanceJson) {
      this.appearanceJson = snapshot.appearanceJson;
      this.loadout = parseAppearance(snapshot.appearanceJson);
      this.paperDoll.setLoadout(this.loadout);
      this.pet.setPet(this.loadout.pet);
    }
  }

  public showSpeechBubble(text: string, durationMs = 4500): void {
    const clean = text.trim().slice(0, 120);
    if (!clean) return;
    this.bubbleText.setText(clean).setVisible(true);
    this.bubbleBg.setVisible(true);
    this.bubbleExpiresAt = this.scene.time.now + durationMs;
  }

  public showEmote(emoji: string, durationMs = 3000): void {
    this.emoteText.setText(emoji).setVisible(true);
    this.emoteExpiresAt = this.scene.time.now + durationMs;
  }

  public update(time: number, delta: number): void {
    // Frame-rate independent smooth exponential interpolation (lerp)
    const alpha = Math.min(1, 1 - Math.exp(-delta * 0.016));
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    if (Math.hypot(dx, dy) > 160) {
      // Snap on teleport / large jump
      this.x = this.targetX;
      this.y = this.targetY;
    } else {
      this.x = Phaser.Math.Linear(this.x, this.targetX, alpha);
      this.y = Phaser.Math.Linear(this.y, this.targetY, alpha);
    }

    const movingNow = this.isMoving || Math.hypot(dx, dy) > 1.2;
    const pose: PaperDollPose = movingNow
      ? Math.floor(time / 150) % 2 === 0
        ? 'walk1'
        : 'walk2'
      : 'idle';

    this.paperDoll.setPosition(this.x, this.y + 8);
    this.paperDoll.setPoseAndFacing(pose, this.facing, time);

    const depth = this.y + 9;
    this.paperDoll.setDepth(depth);
    this.shadow.setPosition(this.x, this.y + 8).setDepth(depth - 1);
    this.nameTag.setPosition(this.x, this.y + 11);

    const facingRight = this.facing !== 'left';
    this.pet.update(time, this.x, this.y, facingRight);

    const s = this.uiScale;
    const offsetY = -16;

    if (this.bubbleExpiresAt > 0) {
      if (time >= this.bubbleExpiresAt) {
        this.bubbleBg.setVisible(false);
        this.bubbleText.setVisible(false);
        this.bubbleExpiresAt = 0;
      } else {
        const bx = this.x;
        const by = this.y + offsetY;
        const padX = 10 * s;
        const padY = 6 * s;
        const tailH = 6 * s;
        this.bubbleText.setPosition(bx, by - tailH);

        const textW = this.bubbleText.displayWidth;
        const textH = this.bubbleText.displayHeight;
        const w = Math.max(44 * s, textW + padX * 2);
        const h = Math.max(22 * s, textH + padY * 2);

        this.bubbleBg.clear();
        this.bubbleBg.fillStyle(0xffffff, 0.98);
        this.bubbleBg.lineStyle(Math.max(1.2, 2.2 * s), 0x334155, 1);
        this.bubbleBg.fillRoundedRect(bx - w / 2, by - tailH - h + padY, w, h, 8 * s);
        this.bubbleBg.strokeRoundedRect(bx - w / 2, by - tailH - h + padY, w, h, 8 * s);
        this.bubbleBg.fillStyle(0xffffff, 0.98);
        this.bubbleBg.fillTriangle(
          bx - 5 * s,
          by - tailH + padY,
          bx + 5 * s,
          by - tailH + padY,
          bx,
          by + padY
        );
      }
    }

    if (this.emoteExpiresAt > 0) {
      if (time >= this.emoteExpiresAt) {
        this.emoteText.setVisible(false);
        this.emoteExpiresAt = 0;
      } else {
        const floatY = Math.sin(time / 160) * 3 * s;
        const extraY = this.bubbleExpiresAt > 0 ? -38 * s : 0;
        this.emoteText.setPosition(this.x, this.y + offsetY + extraY + floatY);
      }
    }
  }

  public destroy(): void {
    this.paperDoll.destroy();
    this.pet.destroy();
    this.shadow.destroy();
    this.nameTag.destroy();
    this.bubbleBg.destroy();
    this.bubbleText.destroy();
    this.emoteText.destroy();
  }
}
