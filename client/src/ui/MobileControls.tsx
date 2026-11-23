import React, { useRef, useState } from 'react';
import type { ZoneType } from '@shared/types';
import { EventBus } from '../game/EventBus';

interface MobileControlsProps {
  visible: boolean;
  zone: ZoneType;
  nearPortal: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  visible,
  zone,
  nearPortal,
}) => {
  const padRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  if (!visible) return null;

  const handleMove = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2 - 16;

    let dx = clientX - cx;
    let dy = zone === 'dungeon' ? 0 : clientY - cy; // 360° in Village, Left/Right in Dungeon
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }

    setKnob({ x: dx, y: dy });
    EventBus.emit('mobile:joystick', { x: dx / maxR, y: dy / maxR });
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnob({ x: 0, y: 0 });
    EventBus.emit('mobile:joystick', { x: 0, y: 0 });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 px-4 flex items-end justify-between">
      {/* Bottom-Left Virtual Thumbstick */}
      <div
        ref={padRef}
        onPointerDown={(e) => {
          activePointerId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          handleMove(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointerId.current === e.pointerId) {
            handleMove(e.clientX, e.clientY);
          }
        }}
        onPointerUp={resetStick}
        onPointerCancel={resetStick}
        className="pointer-events-auto w-28 h-28 rounded-full bg-slate-950/55 border-2 border-amber-300/60 backdrop-blur-sm relative flex items-center justify-center touch-none shadow-xl"
      >
        <div
          className="w-11 h-11 rounded-full bg-amber-400/95 border-2 border-amber-100 shadow-lg"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Bottom-Right Context-Sensitive Action Buttons */}
      <div className="pointer-events-auto flex items-end gap-2">
        {zone === 'overworld' ? (
          <button
            type="button"
            onPointerDown={() => EventBus.emit('input:interact')}
            className={`w-24 h-24 rounded-full font-display font-bold text-xs shadow-xl active:scale-95 transition border-4 ${
              nearPortal
                ? 'bg-amber-400 border-yellow-100 text-slate-950 animate-pulse'
                : 'bg-amber-400/90 border-amber-900 text-amber-950'
            }`}
          >
            {nearPortal ? 'JOIN\nPORTAL' : 'JOIN /\nINTERACT'}
          </button>
        ) : (
          <div className="flex flex-col items-end gap-2">
            {nearPortal && (
              <button
                type="button"
                onPointerDown={() => EventBus.emit('input:exitDungeon')}
                className="px-4 py-2 rounded-full bg-emerald-500 border-2 border-white text-slate-950 font-display font-bold text-xs shadow-xl animate-pulse active:scale-95"
              >
                EXIT VILLAGE
              </button>
            )}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onPointerDown={() => EventBus.emit('input:dash')}
                className="w-14 h-14 rounded-full bg-amber-400/95 border-2 border-white text-slate-950 font-display font-bold text-xs shadow-lg active:scale-95"
              >
                DASH
              </button>
              <button
                type="button"
                onPointerDown={() => EventBus.emit('input:attack')}
                className="w-16 h-16 rounded-full bg-red-500/95 border-2 border-amber-200 text-white font-display font-bold text-xs shadow-lg active:scale-95"
              >
                ATTACK
              </button>
              <button
                type="button"
                onPointerDown={() => EventBus.emit('input:jump')}
                className="w-16 h-16 rounded-full bg-sky-500/95 border-2 border-white text-slate-950 font-display font-bold text-xs shadow-lg active:scale-95"
              >
                JUMP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
