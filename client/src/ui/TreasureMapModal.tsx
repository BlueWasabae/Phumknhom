import React from 'react';
import type { ActiveTreasureMap, PlayerState } from '@shared/types';
import { getTreasureSpotById } from '@shared/treasureMaps';
import { getVillageMapOrDefault, type VillageMapId } from '@shared/worldMapData';
import { Compass, MapPin, Navigation, Sparkles } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface TreasureMapModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onTravelToMap: (mapId: VillageMapId) => void;
}

export const TreasureMapModal: React.FC<TreasureMapModalProps> = ({
  open,
  player,
  onClose,
  onTravelToMap,
}) => {
  const activeMap: ActiveTreasureMap | null | undefined = player.activeTreasureMap;
  const spot = getTreasureSpotById(activeMap?.spotId);
  const mapDef = activeMap ? getVillageMapOrDefault(activeMap.mapId) : null;
  const isInTargetMap = Boolean(
    activeMap && player.zone === 'overworld' && (player.currentMapId ?? 'central_plaza') === activeMap.mapId
  );

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🗺️ Torn Angkor Treasure Map · ផែនទីកំណប់អង្គរ"
      subtitle="Walk near the pulsing golden X on the target map and press [E] / Dig to unearth a guarded Ancient Relic Chest!"
      maxWidthClass="w-[min(94vw,560px)]"
    >
      {!activeMap || !mapDef ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-900/25 text-xs text-amber-950 space-y-2">
          <div className="font-display font-bold text-sm">No Active Treasure Map Clue</div>
          <p>
            Find a new <strong>Torn Angkor Treasure Map</strong> as a rare bonus drop from{' '}
            <strong>Fishing</strong> at the Riverside Pier, <strong>Mining</strong> in the Underground Caverns, or{' '}
            <strong>Foraging</strong> in the Wild Frontier!
          </p>
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          {/* Stylized Aged Angkor Parchment */}
          <div className="relative rounded-2xl border-4 border-amber-900/75 bg-gradient-to-br from-[#f5e3b3] via-[#ead196] to-[#d9b66c] p-4 shadow-inner overflow-hidden">
            {/* Subtle parchment corner compass lines */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900/80 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-amber-900" /> Ancient Angkorian Survey Clue
                </div>
                <div className="font-display font-bold text-base text-amber-950 leading-snug mt-0.5">
                  {activeMap.clueTitle}
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                  isInTargetMap
                    ? 'bg-emerald-700 text-white border-emerald-950'
                    : 'bg-amber-900/15 text-amber-950 border-amber-900/40'
                }`}
              >
                {isInTargetMap ? '📍 You are in this map!' : `${mapDef.icon} ${mapDef.name}`}
              </span>
            </div>

            {/* Illustrated Mini-Map Parchment with Pulsing Red X */}
            <div className="relative h-44 rounded-xl border-2 border-amber-950/55 bg-[#e6cb88] overflow-hidden shadow-inner">
              {/* Road crosshairs */}
              <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 bg-amber-900/15 border-y border-amber-900/20" />
              <div className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 bg-amber-900/15 border-x border-amber-900/20" />
              {/* Compass Rose */}
              <div className="absolute left-2.5 top-2 text-[10px] font-display font-bold text-amber-950/70">
                N ↑ · {mapDef.name}
              </div>
              <div className="absolute right-2.5 bottom-2 text-[10px] font-mono font-bold text-amber-950/70">
                ({Math.round(activeMap.x)}, {Math.round(activeMap.y)})
              </div>

              {/* Glowing Red X Marker */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{
                  left: `${Math.round((spot?.parchmentPctX ?? 0.65) * 100)}%`,
                  top: `${Math.round((spot?.parchmentPctY ?? 0.65) * 100)}%`,
                }}
              >
                <span className="w-10 h-10 rounded-full bg-red-600/25 border-2 border-red-700 animate-ping absolute" />
                <span className="relative w-8 h-8 rounded-full bg-red-700/90 text-yellow-200 border-2 border-yellow-300 shadow-lg flex items-center justify-center font-display font-black text-base">
                  ✕
                </span>
                <span className="mt-1 px-1.5 py-0.5 rounded bg-amber-950/85 text-amber-100 text-[9px] font-bold whitespace-nowrap">
                  BURIED RELIC CHEST
                </span>
              </div>
            </div>

            <p className="mt-3 text-amber-950/95 font-semibold leading-relaxed italic">
              “{activeMap.clueDescription}”
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-900/25 flex items-start gap-2 text-[11px] text-amber-950">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Guarded Ancient Relic Chest Loot:</strong> Defeat the 2 Shadow Guardians to claim{' '}
              <strong>500–1,500 Coins</strong>, <strong>1–3 Gold</strong>, <strong>Reforge Stones</strong>, plus a
              chance at exclusive <strong>Angkor Explorer Compass</strong> accessory or{' '}
              <strong>Golden Krama Cape</strong>!
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (!isInTargetMap) {
                  onTravelToMap(activeMap.mapId);
                }
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border-2 border-amber-950 font-display font-bold flex items-center justify-center gap-1.5"
            >
              {isInTargetMap ? (
                <>
                  <MapPin className="w-4 h-4" /> Close &amp; Follow Golden Dig-Ring Here!
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" /> Travel to {mapDef.icon} {mapDef.name}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </NativeDialog>
  );
};
