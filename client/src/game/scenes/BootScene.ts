import Phaser from 'phaser';
import { INITIAL_PLAYER_STATE } from '@shared/types';

function makeCanvas(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  draw(tex.getContext());
  tex.refresh();
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.generateChibiCharacter();
    this.generateTilesAndProps();
    this.generateDungeonAssets();

    this.scene.start('OverworldScene', {
      playerState: { ...INITIAL_PLAYER_STATE, weapon: { ...INITIAL_PLAYER_STATE.weapon } },
    });
  }

  private generateChibiCharacter(): void {
    const key = 'player_chibi';
    if (this.textures.exists(key)) return;
    const frameW = 56;
    const frameH = 64;
    const poses = ['idle', 'walk1', 'walk2', 'jump', 'attack'] as const;
    const canvas = document.createElement('canvas');
    canvas.width = frameW * poses.length;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d')!;

    poses.forEach((pose, idx) => {
      const ox = idx * frameW + frameW / 2;
      const oy = frameH - 8;
      const bob = pose === 'walk1' ? -2 : pose === 'walk2' ? -1 : pose === 'jump' ? -5 : 0;
      const leftLeg = pose === 'walk1' ? -3 : pose === 'walk2' ? 3 : 0;
      const rightLeg = pose === 'walk1' ? 3 : pose === 'walk2' ? -3 : 0;

      ctx.save();
      ctx.translate(ox, oy);

      // Soft ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 2, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs & boots
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-7 + leftLeg, -12 + bob, 6, 12);
      ctx.fillRect(1 + rightLeg, -12 + bob, 6, 12);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-7 + leftLeg, -4 + bob, 6, 4);
      ctx.fillRect(1 + rightLeg, -4 + bob, 6, 4);

      // Torso (vibrant Khmer Krama tunic)
      ctx.fillStyle = '#2a1810';
      ctx.fillRect(-10, -28 + bob, 20, 17);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-8, -26 + bob, 16, 13);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-8, -24 + bob, 16, 3);
      ctx.fillRect(-3, -24 + bob, 6, 8);

      // Arms
      ctx.fillStyle = '#f4c29f';
      ctx.strokeStyle = '#2a1810';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-13, -25 + bob, 4, 10);
      ctx.strokeRect(-13, -25 + bob, 4, 10);
      ctx.fillRect(9, -25 + bob + (pose === 'attack' ? -4 : 0), 4, 10);
      ctx.strokeRect(9, -25 + bob + (pose === 'attack' ? -4 : 0), 4, 10);

      // Sword held on right side
      ctx.save();
      ctx.translate(12, -18 + bob);
      ctx.rotate(pose === 'attack' ? 1.15 : -0.35);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-4, -2, 8, 3);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.fillRect(-2, -18, 4, 16);
      ctx.strokeRect(-2, -18, 4, 16);
      ctx.restore();

      // Big expressive Chibi head
      ctx.fillStyle = '#f4c29f';
      ctx.strokeStyle = '#2a1810';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-12, -48 + bob, 24, 21, 9);
      ctx.fill();
      ctx.stroke();

      // Eyes (shifted slightly right so facing direction reads crisply)
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-5, -39 + bob, 4, 5);
      ctx.fillRect(4, -39 + bob, 4, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -38 + bob, 2, 2);
      ctx.fillRect(5, -38 + bob, 2, 2);
      // Cheek blush + smile
      ctx.fillStyle = 'rgba(244, 114, 182, 0.5)';
      ctx.fillRect(-8, -33 + bob, 4, 2);
      ctx.fillRect(6, -33 + bob, 4, 2);
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(0, -32 + bob, 4, 2);

      // Hair
      ctx.fillStyle = '#1e1b24';
      ctx.beginPath();
      ctx.roundRect(-13, -51 + bob, 26, 10, 5);
      ctx.fill();

      // Iconic Conical Farmer Hat
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-18, -46 + bob);
      ctx.lineTo(0, -58 + bob);
      ctx.lineTo(18, -46 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });

    const tex = this.textures.addCanvas(key, canvas);
    if (tex) {
      for (let i = 0; i < poses.length; i++) {
        tex.add(i, 0, i * frameW, 0, frameW, frameH);
      }
    }
  }

  private generateTilesAndProps(): void {
    // Lush village grass tile (64x64)
    makeCanvas(this, 'tile_grass', 64, 64, (ctx) => {
      ctx.fillStyle = '#4fb358';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#5ec467';
      ctx.fillRect(4, 6, 12, 6);
      ctx.fillRect(36, 22, 14, 6);
      ctx.fillRect(14, 46, 12, 6);
      ctx.fillStyle = '#3f9c48';
      ctx.fillRect(24, 10, 4, 8);
      ctx.fillRect(50, 42, 4, 8);
      // Tiny village wildflower accents
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(10, 28, 3, 3);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(46, 12, 3, 3);
    });

    // Dark cavern stone brick tile (64x64)
    makeCanvas(this, 'tile_stone', 64, 64, (ctx) => {
      ctx.fillStyle = '#242b3d';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#334155';
      ctx.fillRect(2, 2, 28, 28);
      ctx.fillRect(34, 2, 28, 28);
      ctx.fillRect(2, 34, 14, 28);
      ctx.fillRect(20, 34, 28, 28);
      ctx.fillRect(52, 34, 10, 28);
      ctx.fillStyle = '#475569';
      ctx.fillRect(2, 2, 28, 4);
      ctx.fillRect(34, 2, 28, 4);
      ctx.fillRect(20, 34, 28, 4);
    });

    // Bouncing Yellow Downward "JOIN" Arrow
    makeCanvas(this, 'join_arrow', 48, 52, (ctx) => {
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(14, 4);
      ctx.lineTo(34, 4);
      ctx.lineTo(34, 24);
      ctx.lineTo(44, 24);
      ctx.lineTo(24, 48);
      ctx.lineTo(4, 24);
      ctx.lineTo(14, 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#451a03';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JOIN', 24, 21);
    });

    // AREA 0 Street Sign
    makeCanvas(this, 'sign_area', 96, 76, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(48, 70, 22, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(43, 36, 10, 34);
      ctx.fillStyle = '#1d4ed8';
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(6, 6, 84, 34, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AREA 0', 48, 28);
    });

    // FARM Wooden Gate
    makeCanvas(this, 'gate_farm', 140, 96, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.fillRect(12, 84, 116, 8);
      ctx.fillStyle = '#92400e';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3;
      ctx.fillRect(14, 26, 16, 62);
      ctx.strokeRect(14, 26, 16, 62);
      ctx.fillRect(110, 26, 16, 62);
      ctx.strokeRect(110, 26, 16, 62);
      ctx.fillRect(8, 10, 124, 26);
      ctx.strokeRect(8, 10, 124, 26);
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FARM', 70, 29);
    });

    // SNACK CART Wooden Stall
    makeCanvas(this, 'stall_snack', 132, 104, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(66, 94, 54, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2.5;
      ctx.fillRect(16, 52, 100, 36);
      ctx.strokeRect(16, 52, 100, 36);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(24, 38, 84, 16);
      ctx.strokeRect(24, 38, 84, 16);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(30, 42, 20, 8);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(58, 42, 20, 8);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(84, 41, 16, 9);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(18, 22, 6, 30);
      ctx.fillRect(108, 22, 6, 30);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#fef9c3';
        ctx.fillRect(10 + i * 19, 8, 19, 18);
      }
      ctx.strokeStyle = '#7f1d1d';
      ctx.strokeRect(10, 8, 114, 18);
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(34, 88, 9, 0, Math.PI * 2);
      ctx.arc(98, 88, 9, 0, Math.PI * 2);
      ctx.fill();
    });

    // FASHION SHOP Booth
    makeCanvas(this, 'stall_fashion', 152, 126, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(76, 116, 66, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fdf2f8';
      ctx.strokeStyle = '#831843';
      ctx.lineWidth = 3;
      ctx.fillRect(18, 48, 116, 68);
      ctx.strokeRect(18, 48, 116, 68);
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.moveTo(8, 52);
      ctx.lineTo(28, 18);
      ctx.lineTo(124, 18);
      ctx.lineTo(144, 52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(28, 12, 96, 8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(28, 64, 30, 26);
      ctx.strokeRect(28, 64, 30, 26);
      ctx.fillRect(94, 64, 30, 26);
      ctx.strokeRect(94, 64, 30, 26);
      ctx.fillStyle = '#9d174d';
      ctx.fillRect(64, 70, 24, 46);
    });

    // Lush Tropical Village Tree
    makeCanvas(this, 'tree_lush', 92, 116, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.beginPath();
      ctx.ellipse(46, 108, 28, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2.5;
      ctx.fillRect(38, 58, 16, 50);
      ctx.strokeRect(38, 58, 16, 50);
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(46, 44, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(34, 38, 22, 0, Math.PI * 2);
      ctx.arc(58, 40, 22, 0, Math.PI * 2);
      ctx.arc(46, 26, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(36, 44, 4, 0, Math.PI * 2);
      ctx.arc(56, 36, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private generateDungeonAssets(): void {
    // Glowing Violet Dungeon Portal
    makeCanvas(this, 'portal_dungeon', 112, 134, (ctx) => {
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(12, 16, 88, 112, [44, 44, 6, 6]);
      ctx.fill();
      ctx.stroke();
      const grad = ctx.createRadialGradient(56, 74, 6, 56, 74, 38);
      grad.addColorStop(0, '#f5d0fe');
      grad.addColorStop(0.5, '#9333ea');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(56, 74, 30, 44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(44, 18);
      ctx.lineTo(56, 3);
      ctx.lineTo(68, 18);
      ctx.closePath();
      ctx.fill();
    });

    // Emerald Village Exit Portal
    makeCanvas(this, 'portal_exit', 96, 120, (ctx) => {
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(10, 14, 76, 100, [38, 38, 6, 6]);
      ctx.fill();
      ctx.stroke();
      const grad = ctx.createRadialGradient(48, 66, 6, 48, 66, 34);
      grad.addColorStop(0, '#d1fae5');
      grad.addColorStop(0.55, '#10b981');
      grad.addColorStop(1, '#064e3b');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(48, 66, 26, 38, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Practice Slime Dummy (bouncy emerald slime with target band)
    makeCanvas(this, 'slime_dummy', 64, 56, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(32, 50, 24, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, 46);
      ctx.quadraticCurveTo(8, 10, 32, 10);
      ctx.quadraticCurveTo(56, 10, 56, 46);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Gloss highlight
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(22, 22, 7, 4, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // Cute determined eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(21, 28, 5, 7);
      ctx.fillRect(38, 28, 5, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(22, 29, 2, 2);
      ctx.fillRect(39, 29, 2, 2);
      // Training headband
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(14, 17, 36, 4);
    });
  }
}
