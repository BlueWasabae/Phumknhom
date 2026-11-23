import React, { useRef, useState } from 'react';
import type { ZoneType } from '@shared/types';
import { EventBus, type BossHudPayload } from '../game/EventBus';

interface MobileControlsProps {
  visible: boolean;
  zone: ZoneType;
  nearPortal: boolean;
  bossHud?: BossHudPayload | null;
  equippedWeaponId?: string | null;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  visible,
  zone,
  nearPortal,
  bossHud,
  equippedWeaponId,
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
    let dy = zone === 'dungeon' ? 0 : clientY - cy;
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
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 px-4 flex items-end justify-between box-border max-w-full">
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
        className="pointer-events-auto w-28 h-28 rounded-full bg-amber-950/55 border-[3px] border-amber-200/80 backdrop-blur-sm relative flex items-center justify-center touch-none shadow-xl"
      >
        <div
          className="w-11 h-11 rounded-full stardew-btn"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      <div className="pointer-events-auto flex items-end gap-2">
        {zone === 'dungeon' ? (
          <div className="flex flex-col items-end gap-2">
            {bossHud?.difficulty === 'calamity' && (bossHud.focusPct >= 100 || bossHud.furyPct >= 100) && (
              <div className="flex items-center gap-2">
                {bossHud.focusPct >= 100 && !bossHud.focusActive && (
                  <button
                    type="button"
                    onPointerDown={() => EventBus.emit('input:focus')}
                    className="px-3.5 py-2 rounded-full bg-cyan-400 border-[3px] border-cyan-950 text-slate-950 font-display font-bold text-xs shadow-xl animate-pulse active:scale-95"
                  >
                    ⚡ FOCUS
                  </button>
                )}
                {bossHud.furyPct >= 100 && !bossHud.furyActive && (
                  <button
                    type="button"
                    onPointerDown={() => EventBus.emit('input:fury')}
                    className="px-3.5 py-2 rounded-full bg-rose-600 border-[3px] border-amber-300 text-white font-display font-bold text-xs shadow-xl animate-pulse active:scale-95"
                  >
                    🔥 FURY
                  </button>
                )}
              </div>
            )}
            {nearPortal && (
              <button
                type="button"
                onPointerDown={() => EventBus.emit('input:exitDungeon')}
                className="px-4 py-2 rounded-full bg-emerald-500 border-[3px] border-emerald-950 text-emerald-950 font-display font-bold text-xs shadow-xl animate-pulse active:scale-95"
              >
                EXIT VILLAGE
              </button>
            )}
            <div className="flex items-end gap-2">
              {(equippedWeaponId === 'weapon_preah_khan' ||
                equippedWeaponId === 'weapon_golden_riel_shot') && (
                <button
                  type="button"
                  onPointerDown={() => EventBus.emit('input:secondary')}
                  className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-300 to-yellow-500 border-[3px] border-amber-950 text-amber-950 font-display font-bold text-[10px] leading-tight shadow-lg active:scale-95"
                >
                  {equippedWeaponId === 'weapon_preah_khan' ? '🛡️\nPARRY' : '🪙\nCOIN'}
                </button>
              )}
              <button
                type="button"
                onPointerDown={() => EventBus.emit('input:dash')}
                className="w-14 h-14 rounded-full stardew-btn font-display font-bold text-xs"
              >
                DASH
              </button>
              <button
                type="button"
                onPointerDown={() => EventBus.emit('input:attack')}
                className="w-16 h-16 rounded-full bg-gradient-to-b from-rose-400 to-red-600 border-[3px] border-amber-950 text-white font-display font-bold text-xs shadow-lg active:scale-95"
              >
                ATTACK
              </button>
              <button
                type="button"
                onPointerDown={() => EventBus.emit('input:jump')}
                className="w-16 h-16 rounded-full bg-gradient-to-b from-sky-300 to-sky-500 border-[3px] border-amber-950 text-slate-950 font-display font-bold text-xs shadow-lg active:scale-95"
              >
                JUMP
              </button>
            </div>
          </div>
        ) : zone === 'farm' ? (
          <div className="flex flex-col items-end gap-2">
            {nearPortal && (
              <button
                type="button"
                onPointerDown={() => EventBus.emit('input:exitFarm')}
                className="px-4 py-2 rounded-full bg-emerald-500 border-[3px] border-emerald-950 text-emerald-950 font-display font-bold text-xs shadow-xl animate-pulse active:scale-95"
              >
                EXIT VILLAGE
              </button>
            )}
            <button
              type="button"
              onPointerDown={() => EventBus.emit('input:interact')}
              className="w-24 h-24 rounded-full stardew-btn font-display font-bold text-xs leading-tight whitespace-pre-line"
            >
              {'FARM /\nINTERACT'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onPointerDown={() => EventBus.emit('input:interact')}
            className={`w-24 h-24 rounded-full stardew-btn font-display font-bold text-xs leading-tight whitespace-pre-line ${
              nearPortal ? 'ring-4 ring-yellow-300 animate-pulse' : ''
            }`}
          >
            {nearPortal ? 'JOIN\nPORTAL' : 'JOIN /\nINTERACT'}
          </button>
        )}
      </div>
    </div>
  );
};
