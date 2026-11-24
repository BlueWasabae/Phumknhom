import React from 'react';
import type { PlayerState } from '@shared/types';
import {
  KHMER_FESTIVALS,
  KHMER_FESTIVAL_LIST,
  type FestivalId,
} from '@shared/festivals';
import { Flame, Sparkles, Waves } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface FestivalModalProps {
  open: boolean;
  activeFestival: FestivalId | null;
  player: PlayerState;
  onClose: () => void;
  onStartBoatRace: () => void;
  onReleaseLotusLantern: () => void;
  onWarpToFestivalMap: (mapId: 'central_plaza' | 'green_park') => void;
  onTriggerFestivalTest: (festivalId: FestivalId) => void;
}

export const FestivalModal: React.FC<FestivalModalProps> = ({
  open,
  activeFestival,
  player,
  onClose,
  onStartBoatRace,
  onReleaseLotusLantern,
  onWarpToFestivalMap,
  onTriggerFestivalTest,
}) => {
  const currentDef = activeFestival ? KHMER_FESTIVALS[activeFestival] : null;
  const pchumActive = Boolean(player.pchumBenBlessingUntil && player.pchumBenBlessingUntil > Date.now());
  const pchumRemMin = pchumActive
    ? Math.max(1, Math.ceil(((player.pchumBenBlessingUntil ?? 0) - Date.now()) / 60_000))
    : 0;

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🏮 Khmer Seasonal Festivals · ពិធីបុណ្យប្រពៃណីខ្មែរ"
      subtitle={
        currentDef
          ? `Active Festival: ${currentDef.icon} ${currentDef.name} (${currentDef.khmerName})`
          : 'Celebrate Cambodia’s 3 iconic seasonal festivals across Central Plaza & Green Park!'
      }
      maxWidthClass="w-[min(96vw,740px)]"
    >
      <div className="space-y-3 text-xs max-h-[72dvh] overflow-y-auto pr-1">
        {currentDef && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950 via-indigo-950 to-amber-950 text-amber-50 border-2 border-amber-400/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-display font-bold text-sm text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>
                  {currentDef.icon} LIVE NOW: {currentDef.name}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-bold text-[10px]">
                {currentDef.khmerName}
              </span>
            </div>
            <p className="text-[11px] text-amber-100/95 leading-snug">{currentDef.description}</p>
            <div className="text-[10px] font-bold text-emerald-300">
              🎁 Rewards: {currentDef.rewardSummary}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {activeFestival === 'bon_om_touk' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartBoatRace();
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 border-2 border-sky-200 font-display font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Waves className="w-4 h-4" /> 🛶 Launch Longboat Race Now!
                </button>
              )}

              {activeFestival === 'chol_chnam_thmey' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onWarpToFestivalMap('central_plaza');
                  }}
                  className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white border-2 border-pink-200 font-display font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                >
                  💦 Go to Central Plaza Splash Stations ({player.festivalSplashCount ?? 0}/3 Splashes)
                </button>
              )}

              {activeFestival === 'pchum_ben' && (
                <button
                  type="button"
                  disabled={player.currencies.coins < 50}
                  onClick={onReleaseLotusLantern}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 border-2 border-amber-200 font-display font-bold text-xs flex items-center gap-1.5 shadow disabled:opacity-45 cursor-pointer"
                >
                  <Flame className="w-4 h-4" /> 🪷 Release Floating Pink Lotus Lantern (50 Coins)
                </button>
              )}
            </div>
          </div>
        )}

        {pchumActive && (
          <div className="p-2.5 rounded-xl bg-amber-100 border-2 border-amber-600 text-amber-950 font-display font-bold text-xs flex items-center justify-between">
            <span>🪷 Pchum Ben Ancestral Blessing Active: +20% All Skill XP &amp; +15% Drop Luck!</span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-800 text-amber-50 text-[10px]">
              ~{pchumRemMin}m left
            </span>
          </div>
        )}

        {/* All 3 Seasonal Festivals Overview + Quick Switcher */}
        <div className="grid sm:grid-cols-3 gap-2.5">
          {KHMER_FESTIVAL_LIST.map((fest) => {
            const isLive = activeFestival === fest.id;
            return (
              <div
                key={fest.id}
                className={`p-3 rounded-xl border-2 flex flex-col justify-between gap-2 ${
                  isLive
                    ? 'bg-amber-50 border-amber-600 ring-2 ring-amber-400/50'
                    : 'bg-amber-50/75 border-amber-900/25'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{fest.icon}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isLive ? 'bg-emerald-700 text-white' : 'bg-amber-900/15 text-amber-900'
                      }`}
                    >
                      {isLive ? 'LIVE' : fest.seasonId}
                    </span>
                  </div>
                  <div className="font-display font-bold text-xs text-amber-950">{fest.name}</div>
                  <div className="text-[10px] text-amber-800 font-semibold">{fest.khmerName}</div>
                  <p className="text-[10px] text-amber-950/85 leading-snug">{fest.rewardSummary}</p>
                </div>

                {fest.id === 'bon_om_touk' && isLive ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartBoatRace();
                    }}
                    className="w-full py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-display font-bold text-[11px] cursor-pointer"
                  >
                    🛶 Race Now
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onTriggerFestivalTest(fest.id)}
                    className="w-full py-1.5 rounded-xl bg-amber-800 hover:bg-amber-700 text-amber-50 font-display font-bold text-[11px] cursor-pointer"
                  >
                    {isLive ? '✓ Active Festival' : `Activate ${fest.shortTag}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </NativeDialog>
  );
};
