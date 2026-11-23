import Phaser from 'phaser';
import type { EquippedLoadout, PlayerState, ZoneType } from '@shared/types';
import { PaperDoll, type PaperDollFacing, type PaperDollPose } from './PaperDoll';
import { Pet } from './Pet';

export type FacingDirection = PaperDollFacing;

/**
 * Unified Player entity hosting:
 * - Invisible Arcade Physics body (foot collider in Overworld, full platformer body in Dungeon)
 * - 8-layer modular chibi PaperDoll Container
 * - Companion Pet entity (with bobbing follow & Barami Spirit Tamer dungeon auto-attack)
 * - Soft oval ground shadow, nameplate, 4.5s overhead speech bubble, and 3s floating emote
 */
export class Player {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  public readonly body: Phaser.Physics.Arcade.Body;
  public readonly shadow: Phaser.GameObjects.Image;
  public readonly paperDoll: PaperDoll;
  public readonly pet: Pet;
  public state: PlayerState;
  public facing: FacingDirection = 'down';

  private scene: Phaser.Scene;
  private zone: ZoneType;
  private uiScale: number;
  private nameTag: Phaser.GameObjects.Text;
  private bubbleBg: Phaser.GameObjects.Graphics;
  private bubbleText: Phaser.GameObjects.Text;
  private emoteText: Phaser.GameObjects.Text;

  private bubbleExpiresAt = 0;
  private emoteExpiresAt = 0;
  private currentPose: PaperDollPose = 'idle';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    state: PlayerState,
    zone: ZoneType
  ) {
    this.scene = scene;
    this.state = {
      ...state,
      zone,
      weapon: { ...state.weapon },
      loadout: { ...state.loadout },
      currencies: { ...state.currencies },
      lifeStats: { ...state.lifeStats },
    };
    this.zone = zone;
    this.facing = zone === 'dungeon' ? 'right' : 'down';
    this.uiScale = zone === 'overworld' ? 0.44 : 1;

    // Invisible physics anchor sprite carrying the Arcade body
    this.sprite = scene.physics.add.sprite(x, y, 'player_boy', 0);
    this.sprite.setVisible(false);
    this.sprite.setCollideWorldBounds(true);

    if (zone === 'overworld') {
      this.sprite.setScale(1.15);
      this.sprite.setSize(10, 6).setOffset(3, 10);
    } else {
      this.sprite.setScale(2.65);
      this.sprite.setSize(10, 14).setOffset(3, 2);
    }
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;

    // Soft elliptical ground shadow
    this.shadow = scene.add
      .image(x, y + (zone === 'overworld' ? 8 : 20), 'soft_shadow')
      .setScale(zone === 'overworld' ? 0.36 : 0.78)
      .setDepth(zone === 'overworld' ? y + 6 : 48);

    // 8-Layer Modular Chibi Paper-Doll
    const dollScale = zone === 'overworld' ? 0.42 : 0.96;
    this.paperDoll = new PaperDoll(scene, x, y, this.state.loadout, `pd_${zone}`);
    this.paperDoll.setScale(dollScale);
    if (zone === 'dungeon') {
      this.paperDoll.setDepth(50);
    }

    // Companion Pet Entity
    this.pet = new Pet(scene, x - 20, y, this.state.loadout.pet, zone, `pet_${zone}`);

    // Nameplate + Overhead Speech Bubble + Emote
    this.nameTag = scene.add
      .text(x, y + 14, this.state.name, {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: zone === 'overworld' ? '#ffffff' : '#fef9c3',
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setResolution(2)
      .setScale(this.uiScale)
      .setOrigin(0.5, 0)
      .setDepth(2500);

    this.bubbleBg = scene.add.graphics().setDepth(3000).setVisible(false);
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
      .setDepth(3001)
      .setVisible(false);

    this.emoteText = scene.add
      .text(0, 0, '', { fontSize: '26px' })
      .setResolution(2)
      .setScale(this.uiScale)
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

  public applyLoadoutUpdate(loadout: EquippedLoadout, nextState: PlayerState): void {
    this.state = {
      ...nextState,
      zone: this.zone,
      weapon: { ...nextState.weapon },
      loadout: { ...loadout },
      currencies: { ...nextState.currencies },
      lifeStats: { ...nextState.lifeStats },
    };
    this.paperDoll.setLoadout(loadout);
    this.pet.setPet(loadout.pet);
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

  public playStateAnimation(mode: 'idle' | 'walk' | 'jump' | 'attack'): void {
    if (mode === 'walk') {
      this.currentPose = Math.floor(this.scene.time.now / 150) % 2 === 0 ? 'walk1' : 'walk2';
    } else if (mode === 'attack') {
      this.currentPose = 'attack';
    } else if (mode === 'jump') {
      this.currentPose = 'jump';
    } else {
      this.currentPose = 'idle';
    }
  }

  public syncVisuals(time: number, onGround = true): void {
    const dollOffsetY = this.zone === 'overworld' ? 8 : 20;
    this.paperDoll.setPosition(this.sprite.x, this.sprite.y + dollOffsetY);
    this.paperDoll.setPoseAndFacing(this.currentPose, this.facing, time);

    if (this.zone === 'overworld') {
      const depth = this.sprite.y + 9;
      this.paperDoll.setDepth(depth);
      this.shadow.setPosition(this.sprite.x, this.sprite.y + 8).setDepth(depth - 1);
      this.nameTag.setPosition(this.sprite.x, this.sprite.y + 11);
    } else {
      this.paperDoll.setDepth(50);
      this.shadow
        .setPosition(this.sprite.x, this.sprite.y + 21)
        .setDepth(48)
        .setScale(onGround ? 0.78 : 0.45)
        .setAlpha(onGround ? 0.92 : 0.35);
      this.nameTag.setPosition(this.sprite.x, this.sprite.y + 25);
    }

    this.pet.update(time, this.sprite.x, this.sprite.y, this.facingRight);

    const offsetY = this.zone === 'overworld' ? -16 : -34;
    const s = this.uiScale;

    if (this.bubbleExpiresAt > 0) {
      if (time >= this.bubbleExpiresAt) {
        this.bubbleBg.setVisible(false);
        this.bubbleText.setVisible(false);
        this.bubbleExpiresAt = 0;
      } else {
        const bx = this.sprite.x;
        const by = this.sprite.y + offsetY;
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
        this.emoteText.setPosition(this.sprite.x, this.sprite.y + offsetY + extraY + floatY);
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
