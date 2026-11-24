import Phaser from 'phaser';
import type { KhmerNpcDef } from '@shared/npcSchedules';
import { PaperDoll, type PaperDollFacing, type PaperDollPose } from './PaperDoll';

const WALK_FRAMES: PaperDollPose[] = ['walk1', 'walk2', 'walk3', 'walk4'];

/**
 * Living Khmer Villager NPC rendered using the crisp 10-layer human chibi PaperDoll
 * with gentle waypoint patrol, overhead name tag, and floating heart/chat indicator.
 */
export class NpcVillager {
  public readonly def: KhmerNpcDef;
  public x: number;
  public y: number;

  private scene: Phaser.Scene;
  private paperDoll: PaperDoll;
  private shadow: Phaser.GameObjects.Image;
  private nameTag: Phaser.GameObjects.Text;
  private bubblePill: Phaser.GameObjects.Text;
  private hitZone: Phaser.GameObjects.Zone;

  private waypointIndex = 0;
  private pauseUntil = 0;
  private facing: PaperDollFacing = 'down';
  private isMoving = false;
  private readonly patrolSpeed = 28;

  constructor(scene: Phaser.Scene, def: KhmerNpcDef, onTalk: (npcId: KhmerNpcDef['id']) => void) {
    this.scene = scene;
    this.def = def;
    const start = def.waypoints[0] ?? { x: 800, y: 600, pauseMs: 2000 };
    this.x = start.x;
    this.y = start.y;
    this.pauseUntil = scene.time.now + Math.floor(Math.random() * 1400);

    this.shadow = scene.add
      .image(this.x, this.y + 8, 'soft_shadow')
      .setScale(0.36, 0.24)
      .setAlpha(0.72)
      .setDepth(this.y + 4);

    this.paperDoll = new PaperDoll(scene, this.x, this.y, def.loadout, `npc_${def.id}`);
    this.paperDoll.setScale(0.48);
    this.paperDoll.setDepth(this.y + 10);

    this.nameTag = scene.add
      .text(this.x, this.y + 12, `${def.name}`, {
        fontFamily: 'Fredoka, Kantumruy Pro, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        padding: { x: 5, y: 2 },
      })
      .setResolution(2)
      .setScale(0.44)
      .setOrigin(0.5, 0)
      .setDepth(this.y + 30);

    this.bubblePill = scene.add
      .text(this.x, this.y - 24, '💬 ❤️', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fff1f2',
        backgroundColor: 'rgba(190, 24, 93, 0.9)',
        padding: { x: 6, y: 2 },
      })
      .setResolution(2)
      .setScale(0.46)
      .setOrigin(0.5, 1)
      .setDepth(this.y + 34)
      .setVisible(false);

    this.hitZone = scene.add
      .zone(this.x, this.y - 6, 28, 36)
      .setDepth(this.y + 35)
      .setInteractive({ useHandCursor: true });
    this.hitZone.on('pointerdown', () => onTalk(def.id));
  }

  public update(time: number, delta: number, playerX: number, playerY: number): void {
    const dt = delta / 1000;
    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    const playerNearby = distToPlayer < 88;

    // Pause patrol & face player when nearby so talking feels natural
    if (playerNearby) {
      this.isMoving = false;
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.facing = dx < 0 ? 'left' : 'right';
      } else {
        this.facing = dy < 0 ? 'up' : 'down';
      }
    } else if (this.def.waypoints.length > 1 && time >= this.pauseUntil) {
      const target = this.def.waypoints[this.waypointIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 4) {
        this.x = target.x;
        this.y = target.y;
        this.isMoving = false;
        this.pauseUntil = time + target.pauseMs;
        this.waypointIndex = (this.waypointIndex + 1) % this.def.waypoints.length;
      } else {
        this.isMoving = true;
        this.x += (dx / dist) * this.patrolSpeed * dt;
        this.y += (dy / dist) * this.patrolSpeed * dt;
        if (Math.abs(dx) > Math.abs(dy)) {
          this.facing = dx < 0 ? 'left' : 'right';
        } else {
          this.facing = dy < 0 ? 'up' : 'down';
        }
      }
    } else {
      this.isMoving = false;
    }

    const pose: PaperDollPose = this.isMoving
      ? WALK_FRAMES[Math.floor(time / 160) % WALK_FRAMES.length]
      : 'idle';

    this.paperDoll.setPosition(this.x, this.y);
    this.paperDoll.setDepth(this.y + 10);
    this.paperDoll.setPoseAndFacing(pose, this.facing, time);

    this.shadow.setPosition(this.x, this.y + 8).setDepth(this.y + 4);
    this.nameTag.setPosition(this.x, this.y + 12).setDepth(this.y + 30);
    this.hitZone.setPosition(this.x, this.y - 6).setDepth(this.y + 35);

    const bob = Math.sin(time * 0.006) * 2.5;
    this.bubblePill
      .setVisible(playerNearby)
      .setPosition(this.x, this.y - 22 + bob)
      .setDepth(this.y + 40);
  }

  public destroy(): void {
    this.paperDoll.destroy();
    this.shadow.destroy();
    this.nameTag.destroy();
    this.bubblePill.destroy();
    this.hitZone.destroy();
  }
}
