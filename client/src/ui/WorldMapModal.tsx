import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  VILLAGE_DISTRICTS,
  WORLD_BIOMES,
  WORLD_BIOME_LIST,
  type BiomeId,
} from '@shared/worldMapData';
import {
  travelManager,
  type TravelRequestPayload,
} from '../game/systems/TravelAndPylons';
import { Bus, Compass, Lock, MapPin, Sparkles, Zap } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface WorldMapModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onUnlockBiomePylon: (biomeId: BiomeId) => void;
  onTravel: (req: TravelRequestPayload, busFareCoins: number) => void;
  onAttuneBiome: (biomeId: BiomeId) => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  open,
  player,
  onClose,
  onUnlockBiomePylon,
  onTravel,
  onAttuneBiome,
}) => {
  const [selectedBiome, setSelectedBiome] = useState<BiomeId>(
    (player.activeBiome as BiomeId) || 'phum_plaza'
  );
  const discovered = new Set(player.discoveredBiomes ?? ['phum_plaza', 'emerald_rice_valley']);
  const unlockedPylons = new Set(player.unlockedPylons ?? ['phum_plaza', 'emerald_rice_valley']);
  const returnPortal = travelManager.getReturnPortal();

  const b = WORLD_BIOMES[selectedBiome] ?? WORLD_BIOMES.phum_plaza;
  const isDiscovered = discovered.has(b.id);
  const hasPylon = unlockedPylons.has(b.id);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🗺️ Kingdom of Phum · World Map, Bus & Biome Pylons"
      subtitle={`Discovered: ${discovered.size}/${WORLD_BIOME_LIST.length} Biomes · Pylons: ${unlockedPylons.size}/${WORLD_BIOME_LIST.length} · Preah Khan Attunement: ${WORLD_BIOMES[(player.activeBiome as BiomeId) || 'phum_plaza']?.preahKhanElement ?? 'Sunlit Lotus'}`}
      maxWidthClass="w-[min(96vw,880px)]"
    >
      <div className="space-y-3 text-xs max-h-[72dvh] overflow-y-auto pr-1">
        {/* Quick Travel Toolbar: Magic Mirror & Active Return Portal */}
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-sky-50 border border-sky-700/30">
          <button
            type="button"
            onClick={() => {
              onClose();
              onTravel(
                {
                  method: 'mirror',
                  destinationLabel: 'Phum Central Plaza',
                  targetZone: 'overworld',
                  biomeId: 'phum_plaza',
                },
                0
              );
            }}
            className="px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-display font-bold text-xs flex items-center gap-1.5 shadow"
          >
            <Sparkles className="w-3.5 h-3.5" /> Magic Mirror → Plaza Home
          </button>

          {returnPortal && (
            <button
              type="button"
              onClick={() => {
                travelManager.setReturnPortal(null);
                onClose();
                onTravel(
                  {
                    method: 'return_portal',
                    destinationLabel: 'Linked Dungeon Arena',
                    targetZone: 'dungeon',
                    bossId: returnPortal.bossId,
                    difficulty: returnPortal.difficulty,
                  },
                  0
                );
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-display font-bold text-xs flex items-center gap-1.5 shadow animate-pulse"
            >
              <Zap className="w-3.5 h-3.5" /> Return Portal → Jump Back to Boss!
            </button>
          )}

          <div className="ml-auto flex flex-wrap gap-1.5">
            {VILLAGE_DISTRICTS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onClose();
                  onTravel(
                    {
                      method: d.busFareCoins > 0 ? 'bus' : 'pylon',
                      destinationLabel: d.label,
                      targetZone: d.target,
                    },
                    d.busFareCoins
                  );
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-900/35 font-display font-bold text-[11px] text-amber-950 flex items-center gap-1"
              >
                <span>{d.icon}</span>
                <span>{d.label.split(' ')[0]}</span>
                {d.busFareCoins > 0 && <span className="text-[9px] text-amber-700">{d.busFareCoins}c</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Fog-of-War Biome Map + Inspector */}
        <div className="grid md:grid-cols-[1.35fr_1fr] gap-3">
          {/* Stylized Parchment World Map */}
          <div className="relative h-72 sm:h-80 rounded-2xl border-2 border-amber-900/60 overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-950 to-indigo-950 shadow-inner">
            {/* Subtle Map Grid & Connecting Pylon Lines */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-45">
              {WORLD_BIOME_LIST.filter((node) => node.id !== 'phum_plaza').map((node) => {
                const unlocked = unlockedPylons.has(node.id);
                return (
                  <line
                    key={node.id}
                    x1={WORLD_BIOMES.phum_plaza.mapX}
                    y1={WORLD_BIOMES.phum_plaza.mapY}
                    x2={node.mapX}
                    y2={node.mapY}
                    stroke={unlocked ? '#38bdf8' : '#64748b'}
                    strokeWidth={unlocked ? '0.9' : '0.45'}
                    strokeDasharray={unlocked ? 'none' : '2 2'}
                  />
                );
              })}
            </svg>

            {/* Clickable 8 Biome Nodes (Fog-of-War vs Discovered) */}
            {WORLD_BIOME_LIST.map((node) => {
              const disc = discovered.has(node.id);
              const active = selectedBiome === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedBiome(node.id)}
                  style={{ left: `${node.mapX}%`, top: `${node.mapY}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-xl border-2 transition flex items-center gap-1 shadow-lg cursor-pointer ${
                    active
                      ? 'scale-110 z-20 bg-amber-100 border-yellow-400 text-amber-950 ring-2 ring-sky-400'
                      : disc
                      ? 'z-10 bg-slate-900/85 border-emerald-400/70 text-amber-50 hover:scale-105'
                      : 'z-10 bg-slate-950/90 border-slate-600 text-slate-400 hover:border-amber-400'
                  }`}
                >
                  <span className="text-sm">{disc ? node.icon : '🌫️'}</span>
                  <span className="font-display font-bold text-[10px] whitespace-nowrap max-w-[84px] truncate">
                    {disc ? node.name.split(' ')[0] : 'Fogged'}
                  </span>
                </button>
              );
            })}

            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-slate-950/80 text-[10px] font-bold text-amber-200 border border-amber-500/40">
              Click any biome node to inspect, scout Fog-of-War, or warp via Pylon!
            </div>
          </div>

          {/* Selected Biome Detail Card */}
          <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-900/35 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display font-bold text-base text-amber-950 flex items-center gap-1.5">
                    <span>{b.icon}</span>
                    <span>{b.name}</span>
                  </div>
                  <div className="text-[11px] font-bold text-amber-800">{b.khmerName}</div>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-amber-300 font-bold text-[10px] shrink-0">
                  Act {b.act}
                </span>
              </div>

              <p className="text-[11px] text-amber-950/90 leading-snug">{b.description}</p>

              <div className="p-2 rounded-xl bg-white/85 border border-amber-900/20 space-y-1 text-[10px]">
                <div className="font-display font-bold text-amber-950 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-sky-700" />
                  Preah Khan 8-Biome Attunement
                </div>
                <div className="text-emerald-900 font-bold">
                  Element: {b.preahKhanElement} (+{Math.round(b.preahKhanBonusDmgPct * 100)}% Blade Bonus)
                </div>
                {isDiscovered && (
                  <button
                    type="button"
                    onClick={() => onAttuneBiome(b.id)}
                    className="mt-1 px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 border border-amber-900/40 font-display font-bold text-[10px] text-amber-950"
                  >
                    {player.activeBiome === b.id ? '✓ Currently Attuned' : `Attune Preah Khan to ${b.preahKhanElement}`}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-amber-900/20">
              {!isDiscovered || !hasPylon ? (
                <button
                  type="button"
                  disabled={player.currencies.coins < b.unlockCostCoins}
                  onClick={() => onUnlockBiomePylon(b.id)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white border-2 border-amber-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-45"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Scout Fog &amp; Activate {b.pylonName} ({b.unlockCostCoins.toLocaleString()}c)
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onAttuneBiome(b.id);
                      onClose();
                      onTravel(
                        {
                          method: 'pylon',
                          destinationLabel: b.name,
                          targetZone:
                            b.targetScene === 'DungeonBossScene'
                              ? 'dungeon'
                              : b.targetScene === 'FarmScene'
                              ? 'farm'
                              : 'overworld',
                          biomeId: b.id,
                          bossId: b.bossId,
                        },
                        0
                      );
                    }}
                    className="py-2 px-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white border border-sky-950 font-display font-bold text-[11px] flex items-center justify-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Pylon Warp (Free)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onAttuneBiome(b.id);
                      onClose();
                      onTravel(
                        {
                          method: 'bus',
                          destinationLabel: b.name,
                          targetZone:
                            b.targetScene === 'DungeonBossScene'
                              ? 'dungeon'
                              : b.targetScene === 'FarmScene'
                              ? 'farm'
                              : 'overworld',
                          biomeId: b.id,
                          bossId: b.bossId,
                        },
                        b.busFareCoins
                      );
                    }}
                    className="py-2 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-950 font-display font-bold text-[11px] flex items-center justify-center gap-1"
                  >
                    <Bus className="w-3.5 h-3.5" /> Bus ({b.busFareCoins}c)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </NativeDialog>
  );
};
