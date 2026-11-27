import Phaser from 'phaser';
import type { EquippedLoadout, PlayerState, ZoneType } from '@shared/types';
import { getAchievementBadgeIcon } from '@shared/achievements';
import { PaperDoll, type PaperDollFacing, type PaperDollPose } from './PaperDoll';
import { Pet } from './Pet';
import { MountEntity, getMountSpec } from './MountEntity';

export type FacingDirection = PaperDollFacing;

const WALK_FRAMES: PaperDollPose[] = ['walk1', 'walk2', 'walk3', 'walk4'];

/**
 * Unified Player entity hosting:
 * - Invisible Arcade Physics body (foot collider in Overworld, full platformer body in Dungeon)
 * - 8-layer modular 16-bit chibi PaperDoll Container with 4-frame walk, squash-and-stretch jump/land & weapon grip
 * - Companion Pet entity (with bobbing follow & Barami Spirit Tamer dungeon auto-attack)
 * - Soft dark oval ground shadow, nameplate, 4.5s overhead speech bubble, and 3s floating emote
 */
export class Player {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  public readonly body: Phaser.Physics.Arcade.Body;
  public readonly shadow: Phaser.GameObjects.Image;
  public readonly paperDoll: PaperDoll;
  public pet: Pet | null = null;
  public mount: MountEntity | null = null;
  public state: PlayerState;
  public facing: FacingDirection = 'down';

  private scene: Phaser.Scene;
  private zone: ZoneType;
  private uiScale: number;
  private baseDollScale: number;
  private squashX = 1;
  private squashY = 1;
  private wasOnGround = true;

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
    const isPlatformer = zone === 'dungeon' || zone === 'cavern';
    this.facing = isPlatformer ? 'right' : 'down';
    this.uiScale = zone === 'overworld' ? 0.44 : 1;

    this.sprite = scene.physics.add.sprite(x, y, 'player_collider', 0);
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

    // Soft dark oval ground shadow directly beneath boots
    this.shadow = scene.add
      .image(x, y + (zone === 'overworld' ? 8 : 21), 'soft_shadow')
      .setScale(zone === 'overworld' ? 0.36 : 0.82, zone === 'overworld' ? 0.24 : 0.48)
      .setAlpha(0.75)
      .setDepth(zone === 'overworld' ? y + 6 : 48);

    // 10-Layer Modular 24x32 Pixel-Art Human Chibi Paper-Doll
    this.baseDollScale = zone === 'overworld' ? 0.48 : 1.08;
    this.paperDoll = new PaperDoll(scene, x, y, this.state.loadout, `pd_${zone}`);
    this.paperDoll.setScale(this.baseDollScale);
    if (isPlatformer) {
      this.paperDoll.setDepth(50);
    }

    // Companion Pet Entity — NEVER instantiate when loadout.pet is null!
    this.syncPetInstance(this.state.loadout.pet);

    // Rideable Khmer Mount Entity (active in Overworld maps only; auto-dismounted indoors/dungeons/caverns)
    if (zone === 'overworld') {
      this.mount = new MountEntity(scene, x, y);
      this.mount.setMount(this.state.activeMount);
    }

    // Nameplate (with equipped Achievement Badge Icon & gold [KROM] guild tag!) + Overhead Speech Bubble + Emote
    this.nameTag = scene.add
      .text(x, y + 14, this.formatDisplayName(this.state), {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: this.state.kromTag ? '#fde047' : zone === 'overworld' ? '#ffffff' : '#fef9c3',
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

  /**
   * Triggers crisp elastic squash-and-stretch (e.g. jump stretch or land/attack squash)
   */
  public triggerSquash(sx: number, sy: number): void {
    this.squashX = sx;
    this.squashY = sy;
  }

  /**
   * Sets live 360° cursor-following weapon aim angle (radians) in combat/cavern scenes.
   */
  public setAimAngle(angle: number | null): void {
    this.paperDoll.setAimAngle(angle);
  }

  private syncPetInstance(petId: string | null): void {
    if (!petId) {
      this.pet?.destroy();
      this.pet = null;
      return;
    }
    if (!this.pet) {
      this.pet = new Pet(this.scene, this.sprite.x - 20, this.sprite.y, petId, this.zone, `pet_${this.zone}`);
    } else {
      this.pet.setPet(petId);
    }
  }

  private formatDisplayName(s: PlayerState): string {
    const badge = getAchievementBadgeIcon(s.equippedBadgeId);
    const base = s.kromTag ? `[${s.kromTag}] ${s.name}` : s.name;
    return badge ? `${badge} ${base}` : base;
  }

  public applyLoadoutUpdate(loadout: EquippedLoadout, nextState: PlayerState): void {
    if (
      this.state.name !== nextState.name ||
      this.state.kromTag !== nextState.kromTag ||
      this.state.equippedBadgeId !== nextState.equippedBadgeId
    ) {
      this.nameTag.setText(this.formatDisplayName(nextState));
      this.nameTag.setColor(nextState.kromTag ? '#fde047' : this.zone === 'overworld' ? '#ffffff' : '#fef9c3');
    }

    this.state = {
      ...nextState,
      zone: this.zone,
      weapon: { ...nextState.weapon },
      loadout: { ...loadout },
      currencies: { ...nextState.currencies },
      lifeStats: { ...nextState.lifeStats },
      activeBuffs: [...nextState.activeBuffs],
      quickSnackSlots: [...nextState.quickSnackSlots],
    };
    this.paperDoll.setLoadout(loadout);
    this.syncPetInstance(loadout.pet);
    this.mount?.setMount(this.zone === 'overworld' ? this.state.activeMount : null);
  }

  public syncPlayerState(nextState: PlayerState): void {
    const loadoutChanged =
      this.state.loadout.hat !== nextState.loadout.hat ||
      this.state.loadout.shirt !== nextState.loadout.shirt ||
      this.state.loadout.pants !== nextState.loadout.pants ||
      this.state.loadout.wings !== nextState.loadout.wings ||
      this.state.loadout.pet !== nextState.loadout.pet ||
      this.state.loadout.weapon !== nextState.loadout.weapon ||
      this.state.loadout.armor !== nextState.loadout.armor ||
      this.state.loadout.showVanityOverArmor !== nextState.loadout.showVanityOverArmor ||
      this.state.loadout.hairStyle !== nextState.loadout.hairStyle ||
      this.state.loadout.hairColor !== nextState.loadout.hairColor ||
      this.state.loadout.skinColor !== nextState.loadout.skinColor ||
      this.state.loadout.skinTone !== nextState.loadout.skinTone ||
      this.state.loadout.eyeStyle !== nextState.loadout.eyeStyle ||
      this.state.loadout.eyeColor !== nextState.loadout.eyeColor ||
      this.state.loadout.eyebrowStyle !== nextState.loadout.eyebrowStyle ||
      this.state.loadout.faceStyle !== nextState.loadout.faceStyle;

    if (
      this.state.name !== nextState.name ||
      this.state.kromTag !== nextState.kromTag ||
      this.state.equippedBadgeId !== nextState.equippedBadgeId
    ) {
      this.nameTag.setText(this.formatDisplayName(nextState));
      this.nameTag.setColor(nextState.kromTag ? '#fde047' : this.zone === 'overworld' ? '#ffffff' : '#fef9c3');
    }

    this.state = {
      ...nextState,
      zone: this.zone,
      weapon: { ...nextState.weapon },
      loadout: { ...nextState.loadout },
      currencies: { ...nextState.currencies },
      lifeStats: { ...nextState.lifeStats },
      activeBuffs: [...nextState.activeBuffs],
      quickSnackSlots: [...nextState.quickSnackSlots],
    };

    if (loadoutChanged) {
      this.paperDoll.setLoadout(this.state.loadout);
      this.syncPetInstance(this.state.loadout.pet);
    }
    this.mount?.setMount(this.zone === 'overworld' ? this.state.activeMount : null);
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

  public playStateAnimation(mode: 'idle' | 'walk' | 'jump' | 'attack' | 'parry'): void {
    if (mode === 'walk') {
      const frameIdx = Math.floor(this.scene.time.now / 115) % WALK_FRAMES.length;
      this.currentPose = WALK_FRAMES[frameIdx];
    } else if (mode === 'attack') {
      this.currentPose = 'attack';
    } else if (mode === 'parry') {
      this.currentPose = 'parry';
    } else if (mode === 'jump') {
      this.currentPose = 'jump';
    } else {
      this.currentPose = 'idle';
    }
  }

  public syncVisuals(time: number, onGround = true): void {
    // Automatic squash-and-stretch on landing in side-scrolling Dungeon & Cavern arenas!
    if (this.zone === 'dungeon' || this.zone === 'cavern') {
      if (!this.wasOnGround && onGround) {
        this.triggerSquash(1.22, 0.8);
      } else if (this.wasOnGround && !onGround && this.body.velocity.y < -80) {
        this.triggerSquash(0.84, 1.2);
      }
      this.wasOnGround = onGround;
    }

    // Smooth elastic spring return to (1, 1)
    this.squashX += (1 - this.squashX) * 0.22;
    this.squashY += (1 - this.squashY) * 0.22;
    this.paperDoll.setScale(this.baseDollScale * this.squashX, this.baseDollScale * this.squashY);

    const activeMountSpec = this.zone === 'overworld' ? getMountSpec(this.state.activeMount) : null;
    const isMoving = Math.hypot(this.body.velocity.x, this.body.velocity.y) > 12;
    this.mount?.update(this.sprite.x, this.sprite.y, this.facing, isMoving, time);

    const dollOffsetY =
      this.zone === 'overworld' ? 8 + (activeMountSpec ? activeMountSpec.seatOffsetY : 0) : 21;
    this.paperDoll.setPosition(this.sprite.x, this.sprite.y + dollOffsetY);
    this.paperDoll.setPoseAndFacing(activeMountSpec ? 'idle' : this.currentPose, this.facing, time);

    if (this.zone === 'overworld') {
      const depth = this.sprite.y + 9;
      this.paperDoll.setDepth(depth);
      this.shadow
        .setPosition(this.sprite.x, this.sprite.y + 8)
        .setDepth(depth - 1);
      this.nameTag.setPosition(this.sprite.x, this.sprite.y + 11);
    } else {
      this.paperDoll.setDepth(50);
      this.shadow
        .setPosition(this.sprite.x, this.sprite.y + 22)
        .setDepth(48)
        .setScale(onGround ? 0.82 * this.squashX : 0.46, onGround ? 0.48 : 0.28)
        .setAlpha(onGround ? 0.82 : 0.34);
      this.nameTag.setPosition(this.sprite.x, this.sprite.y + 26);
    }

    this.pet?.update(time, this.sprite.x, this.sprite.y, this.facingRight);

    const offsetY = this.zone === 'overworld' ? -16 : -36;
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
    this.pet?.destroy();
    this.pet = null;
    this.mount?.destroy();
    this.mount = null;
    this.shadow.destroy();
    this.nameTag.destroy();
    this.bubbleBg.destroy();
    this.bubbleText.destroy();
    this.emoteText.destroy();
  }
}
