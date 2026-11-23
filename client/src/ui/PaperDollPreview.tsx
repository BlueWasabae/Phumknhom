import React, { useEffect, useRef } from 'react';
import type { EquippedLoadout } from '@shared/types';
import { drawFullPaperDollToCanvas } from '../game/entities/PaperDoll';
import { drawPetToCanvas } from '../game/entities/Pet';

interface PaperDollPreviewProps {
  loadout: EquippedLoadout;
  width?: number;
  height?: number;
  includePet?: boolean;
  className?: string;
}

export const PaperDollPreview: React.FC<PaperDollPreviewProps> = ({
  loadout,
  width = 148,
  height = 148,
  includePet = true,
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

          // Ground shadow
          ctx.fillStyle = 'rgba(69, 26, 3, 0.22)';
          ctx.beginPath();
          ctx.ellipse(width * 0.54, height * 0.85, 28, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Draw 8-layer modular PaperDoll scaled cleanly to canvas
          ctx.save();
          const scale = width / 76;
          ctx.translate(width * 0.54 - 32 * scale, height * 0.88 - 58 * scale);
          ctx.scale(scale, scale);
          drawFullPaperDollToCanvas(ctx, loadout, 'idle', 'down', t);
          ctx.restore();

          if (includePet && loadout.pet) {
            drawPetToCanvas(ctx, loadout.pet, width * 0.24, height * 0.72, 1.45, t);
          }
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [loadout, width, height, includePet]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`rounded-2xl bg-gradient-to-b from-sky-200/80 via-emerald-100/75 to-amber-200/80 border-2 border-amber-900/45 shadow-inner ${className}`}
    />
  );
};
