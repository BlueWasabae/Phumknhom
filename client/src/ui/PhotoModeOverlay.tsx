import React, { useEffect, useRef, useState } from 'react';
import type { PlayerState } from '@shared/types';
import { Camera, Download, Eye, EyeOff, X } from 'lucide-react';
import { downloadHeroCardPng } from '../utils/HeroCardGenerator';
import { soundManager } from '../game/systems/SoundManager';
import { EventBus } from '../game/EventBus';

interface PhotoModeOverlayProps {
  active: boolean;
  player?: PlayerState;
  onExit: () => void;
}

/**
 * Update 2.0 + 3.0 — Clean Photo & Trailer Recording Mode Overlay with 1-Click Shareable Hero Card.
 */
export const PhotoModeOverlay: React.FC<PhotoModeOverlayProps> = ({ active, player, onExit }) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const resetFadeTimer = () => {
      setControlsVisible(true);
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    };

    resetFadeTimer();
    window.addEventListener('pointermove', resetFadeTimer, { passive: true });
    window.addEventListener('pointerdown', resetFadeTimer, { passive: true });
    window.addEventListener('keydown', resetFadeTimer, { passive: true });

    return () => {
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      window.removeEventListener('pointermove', resetFadeTimer);
      window.removeEventListener('pointerdown', resetFadeTimer);
      window.removeEventListener('keydown', resetFadeTimer);
    };
  }, [active]);

  if (!active) return null;

  const handleSnapScreenshot = () => {
    soundManager.playSfx('click');
    const gameCanvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!gameCanvas) {
      EventBus.emit('ui:toast', { text: '📷 Could not locate game canvas for screenshot.' });
      return;
    }

    try {
      const out = document.createElement('canvas');
      out.width = gameCanvas.width || window.innerWidth;
      out.height = gameCanvas.height || window.innerHeight;
      const ctx = out.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(gameCanvas, 0, 0, out.width, out.height);

      if (showWatermark) {
        const pad = Math.max(16, Math.round(out.width * 0.018));
        ctx.save();
        ctx.font = `700 ${Math.max(18, Math.round(out.width * 0.022))}px "Kantumruy Pro", "Fredoka", sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0,0,0,0.75)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#fde68a';
        ctx.fillText('ភូមិខ្ញុំ · Phum Khnhom', out.width - pad, out.height - pad - 18);
        ctx.font = `600 ${Math.max(11, Math.round(out.width * 0.011))}px "Fredoka", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.fillText('www.bluexacedamy.space', out.width - pad, out.height - pad);
        ctx.restore();
      }

      const dataUrl = out.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `phum-khnhom-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      soundManager.playSfx('harvest');
      EventBus.emit('ui:toast', { text: '📸 Saved crisp PNG screenshot!' });
    } catch {
      EventBus.emit('ui:toast', { text: '📷 Screenshot captured (WebGL preserveDrawingBuffer fallback).' });
    }
  };

  return (
    <>
      {/* Optional Live ភូមិខ្ញុំ Trailer Watermark */}
      {showWatermark && (
        <div
          className="pointer-events-none fixed right-4 bottom-4 z-30 text-right select-none"
          style={{
            bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
            right: 'max(1rem, env(safe-area-inset-right, 1rem))',
          }}
        >
          <div className="font-display font-bold text-base sm:text-lg text-amber-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
            ភូមិខ្ញុំ · Phum Khnhom
          </div>
          <div className="text-[10px] font-bold tracking-wide text-amber-50/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
            www.bluexacedamy.space
          </div>
        </div>
      )}

      {/* Subtle Auto-Fading Corner Pill (fades out after 3s of no mouse movement) */}
      <div
        className={`fixed top-3 right-3 z-40 flex items-center gap-1.5 transition-opacity duration-500 ${
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            soundManager.playSfx('click');
            setShowWatermark((v) => !v);
          }}
          className="px-2.5 py-1.5 rounded-full bg-slate-950/75 hover:bg-slate-900/90 text-amber-100 border border-amber-400/50 font-display font-bold text-[11px] flex items-center gap-1 backdrop-blur-sm shadow cursor-pointer"
          title="Toggle ភូមិខ្ញុំ Watermark"
        >
          {showWatermark ? <Eye className="w-3.5 h-3.5 text-amber-300" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
          <span className="hidden sm:inline">Watermark</span>
        </button>

        <button
          type="button"
          onClick={handleSnapScreenshot}
          className="px-2.5 py-1.5 rounded-full bg-emerald-700/90 hover:bg-emerald-600 text-white border border-emerald-300/60 font-display font-bold text-[11px] flex items-center gap-1 backdrop-blur-sm shadow cursor-pointer"
          title="Snap Screenshot (.png)"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Snap Screenshot</span>
        </button>

        {player && (
          <button
            type="button"
            onClick={() => {
              soundManager.playSfx('harvest');
              downloadHeroCardPng(player);
              EventBus.emit('ui:toast', {
                text: `🪪 Downloaded 800×450 Hero Card PNG for ${player.name}!`,
              });
            }}
            className="px-2.5 py-1.5 rounded-full bg-amber-500/95 hover:bg-amber-400 text-slate-950 border border-amber-200 font-display font-black text-[11px] flex items-center gap-1 backdrop-blur-sm shadow cursor-pointer"
            title="Download 800×450 Hero Share Card PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Hero Card</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            soundManager.playSfx('click');
            onExit();
          }}
          className="px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-rose-700 text-amber-100 border border-amber-400/60 font-display font-bold text-[11px] flex items-center gap-1 backdrop-blur-sm shadow cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit Photo Mode (F9)</span>
        </button>
      </div>
    </>
  );
};
