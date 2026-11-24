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
