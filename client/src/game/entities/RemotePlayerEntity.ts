import Phaser from 'phaser';
import type { EquippedLoadout } from '@shared/types';
import { EventBus } from '../EventBus';
import { PaperDoll, type PaperDollFacing, type PaperDollPose } from './PaperDoll';
import { Pet } from './Pet';
import { MountEntity, getMountSpec } from './MountEntity';
import { parseAppearance, roomClient, type RemotePlayerSnapshot } from '../network/RoomClient';

/**
 * Renders another online player inside OverworldScene using the exact same
 * modular 8-layer PaperDoll + Companion Pet + smooth position interpolation (lerp)
 * + interactive Tap-on-Player hit zone + 4.5s overhead speech bubble + 3s floating emote.
 */
export class RemotePlayerEntity {
  public readonly sessionId: string;
  public playerId: string;
  public name: string;
  public level: number;
  public stylish: number;
  public areaId: string;

  private scene: Phaser.Scene;
  public x: number;
  public y: number;
  private targetX: number;
  private targetY: number;
  private facing: PaperDollFacing;
  private isMoving: boolean;
  private appearanceJson: string;
  private loadout: EquippedLoadout;

  private hitZone: Phaser.GameObjects.Rectangle;
  private shadow: Phaser.GameObjects.Image;
  private paperDoll: PaperDoll;
  private pet: Pet | null = null;
  private mount: MountEntity;
  public activeMountId = '';
  private hopInBadge: Phaser.GameObjects.Text;
  private safePrefix: string;
  private nameTag: Phaser.GameObjects.Text;
  private bubbleBg: Phaser.GameObjects.Graphics;
  private bubbleText: Phaser.GameObjects.Text;
  private emoteText: Phaser.GameObjects.Text;

  private bubbleExpiresAt = 0;
  private emoteExpiresAt = 0;
  private readonly uiScale = 0.44;

  constructor(
    scene: Phaser.Scene,
    snapshot: RemotePlayerSnapshot,
    getLocalPos?: () => { x: number; y: number }
  ) {
    this.scene = scene;
    this.sessionId = snapshot.sessionId;
    this.playerId = snapshot.playerId || '';
    this.name = snapshot.name;
    this.level = snapshot.level || 1;
    this.stylish = snapshot.stylish || 168;
    this.areaId = snapshot.areaId || 'AREA 0';
    this.x = snapshot.x;
    this.y = snapshot.y;
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.facing = snapshot.facing;
    this.isMoving = snapshot.isMoving;
    this.appearanceJson = snapshot.appearanceJson;
    this.loadout = parseAppearance(snapshot.appearanceJson);

    this.safePrefix = `rem_${snapshot.sessionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12)}`;

    this.shadow = scene.add
      .image(this.x, this.y + 8, 'soft_shadow')
      .setScale(0.36)
      .setDepth(this.y + 6);

    this.paperDoll = new PaperDoll(scene, this.x, this.y + 8, this.loadout, `${this.safePrefix}_pd`);
    this.paperDoll.setScale(0.42);

    // Interactive Tap-on-Player hit box (works on both PC click and Mobile touch!)
    this.hitZone = scene.add
      .rectangle(this.x, this.y - 4, 28, 36, 0xffffff, 0)
      .setDepth(this.y + 14)
      .setInteractive({ useHandCursor: true });
    this.hitZone.on('pointerdown', () => {
      const local = getLocalPos ? getLocalPos() : null;
      const distancePx = local ? Math.hypot(this.x - local.x, this.y - local.y) : undefined;
      EventBus.emit('social:inspectPlayer', {
        sessionId: this.sessionId,
        playerId: this.playerId,
        name: this.name,
        level: this.level,
        stylish: this.stylish,
        areaId: this.areaId,
        x: this.x,
        y: this.y,
        distancePx,
        loadout: { ...this.loadout },
      });
    });

    this.syncPetInstance(this.loadout.pet);
    this.mount = new MountEntity(scene, this.x, this.y);
    this.activeMountId = snapshot.activeMountId || '';
    this.mount.setMount(this.activeMountId || null);

    this.hopInBadge = scene.add
      .text(this.x, this.y - 26, '🚕 Hop In!', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(21, 128, 61, 0.92)',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(this.uiScale)
      .setOrigin(0.5, 1)
      .setDepth(2520)
      .setVisible(this.activeMountId === 'mount_mini_tuk_tuk')
      .setInteractive({ useHandCursor: true });
    this.hopInBadge.on('pointerdown', () => {
      roomClient.sendTukTukHop(this.sessionId);
      EventBus.emit('ui:toast', { text: `🚕 Hopped into the back seat of ${this.name}'s Mini Tuk-Tuk! (Move to hop out)` });
    });

    const displayTag = snapshot.kromTag ? `[${snapshot.kromTag}] ${this.name}` : this.name;
    this.nameTag = scene.add
      .text(this.x, this.y + 11, displayTag, {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: snapshot.kromTag ? '#fde047' : '#bae6fd',
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

  private syncPetInstance(petId: string | null): void {
    if (!petId) {
      this.pet?.destroy();
      this.pet = null;
      return;
    }
    if (!this.pet) {
      this.pet = new Pet(this.scene, this.x - 16, this.y, petId, 'overworld', `${this.safePrefix}_pet`);
    } else {
      this.pet.setPet(petId);
    }
  }

  public applySnapshot(snapshot: RemotePlayerSnapshot): void {
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.facing = snapshot.facing;
    this.isMoving = snapshot.isMoving;
    if (snapshot.playerId) this.playerId = snapshot.playerId;
    if (snapshot.level) this.level = snapshot.level;
    if (typeof snapshot.stylish === 'number') this.stylish = snapshot.stylish;
    if (snapshot.areaId) this.areaId = snapshot.areaId;

    if (snapshot.name && snapshot.name !== this.name) {
      this.name = snapshot.name;
      this.nameTag.setText(this.name);
    }

    if (snapshot.appearanceJson && snapshot.appearanceJson !== this.appearanceJson) {
      this.appearanceJson = snapshot.appearanceJson;
      this.loadout = parseAppearance(snapshot.appearanceJson);
      this.paperDoll.setLoadout(this.loadout);
      this.syncPetInstance(this.loadout.pet);
    }
    const nextMount = snapshot.activeMountId || '';
    if (nextMount !== this.activeMountId) {
      this.activeMountId = nextMount;
      this.mount.setMount(this.activeMountId || null);
      this.hopInBadge.setVisible(this.activeMountId === 'mount_mini_tuk_tuk');
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

    const mSpec = getMountSpec(this.activeMountId);
    this.mount.update(this.x, this.y, this.facing, movingNow, time);
    this.hopInBadge.setPosition(this.x, this.y - 24).setVisible(this.activeMountId === 'mount_mini_tuk_tuk');

    this.paperDoll.setPosition(this.x, this.y + 8 + (mSpec ? mSpec.seatOffsetY : 0));
    this.paperDoll.setPoseAndFacing(mSpec ? 'idle' : pose, this.facing, time);

    const depth = this.y + 9;
    this.paperDoll.setDepth(depth);
    this.hitZone.setPosition(this.x, this.y - 4).setDepth(depth + 5);
    this.shadow.setPosition(this.x, this.y + 8).setDepth(depth - 1);
    this.nameTag.setPosition(this.x, this.y + 11);

    const facingRight = this.facing !== 'left';
    this.pet?.update(time, this.x, this.y, facingRight);

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
    this.hitZone.destroy();
    this.paperDoll.destroy();
    this.pet?.destroy();
    this.mount.destroy();
    this.hopInBadge.destroy();
    this.pet = null;
    this.shadow.destroy();
    this.nameTag.destroy();
    this.bubbleBg.destroy();
    this.bubbleText.destroy();
    this.emoteText.destroy();
  }
}
