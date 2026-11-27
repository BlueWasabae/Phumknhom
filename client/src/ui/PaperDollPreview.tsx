import React, { useEffect, useRef } from 'react';
import type { EquippedLoadout } from '@shared/types';
import {
  drawFullPaperDollToCanvas,
  type PaperDollFacing,
  type PaperDollPose,
} from '../game/entities/PaperDoll';
import { drawPetToCanvas } from '../game/entities/Pet';

interface PaperDollPreviewProps {
  loadout: EquippedLoadout;
  width?: number;
  height?: number;
  includePet?: boolean;
  facing?: PaperDollFacing;
  pose?: PaperDollPose;
  className?: string;
}

export const PaperDollPreview: React.FC<PaperDollPreviewProps> = ({
  loadout,
  width = 148,
  height = 148,
  includePet = true,
  facing = 'down',
  pose = 'idle',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const render = (t: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, width, height);

          // Soft ground shadow
          ctx.fillStyle = 'rgba(69, 26, 3, 0.24)';
          ctx.beginPath();
          ctx.ellipse(width * 0.52, height * 0.86, width * 0.21, height * 0.055, 0, 0, Math.PI * 2);
          ctx.fill();

          // Draw 10-layer Human Chibi PaperDoll scaled crisply to preview canvas
          ctx.save();
          const scale = width / 68;
          ctx.translate(width * 0.5 - 32 * scale, height * 0.89 - 58 * scale);
          ctx.scale(scale, scale);
          drawFullPaperDollToCanvas(ctx, loadout, pose, facing, t);
          ctx.restore();

          // Render Pagoda Tower Milestone Weapon Aura glow + orbiting sparks on Runway & Character Previews
          if (loadout.weaponAura) {
            const auraPrimary =
              loadout.weaponAura === 'celestial_angkor'
                ? 'rgba(192, 132, 252, 0.55)'
                : loadout.weaponAura === 'emerald_naga'
                  ? 'rgba(16, 185, 129, 0.55)'
                  : 'rgba(250, 204, 21, 0.58)';
            const sparkHex =
              loadout.weaponAura === 'celestial_angkor'
                ? '#e9d5ff'
                : loadout.weaponAura === 'emerald_naga'
                  ? '#6ee7b7'
                  : '#fef08a';
            const wx = width * 0.68;
            const wy = height * 0.56;
            const pulse = 1 + Math.sin(t / 190) * 0.14;
            const grad = ctx.createRadialGradient(wx, wy, 2, wx, wy, width * 0.17 * pulse);
            grad.addColorStop(0, auraPrimary);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(wx, wy, width * 0.17 * pulse, 0, Math.PI * 2);
            ctx.fill();
            for (let i = 0; i < 3; i++) {
              const ang = t / 360 + (i * Math.PI * 2) / 3;
              const sx = wx + Math.cos(ang) * width * 0.1;
              const sy = wy + Math.sin(ang) * height * 0.08;
              ctx.fillStyle = sparkHex;
              ctx.beginPath();
              ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          if (includePet && loadout.pet) {
            drawPetToCanvas(ctx, loadout.pet, width * 0.22, height * 0.74, Math.max(1.2, width / 110), t);
          }
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [loadout, width, height, includePet, facing, pose]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ imageRendering: 'pixelated' }}
      className={`rounded-2xl bg-gradient-to-b from-sky-200/85 via-emerald-100/75 to-amber-200/85 border-2 border-amber-900/45 shadow-inner ${className}`}
    />
  );
};
