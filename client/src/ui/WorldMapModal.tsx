import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  CITY_DISTRICTS,
  VILLAGE_MAP_LIST,
  WORLD_BIOMES,
  WORLD_BIOME_LIST,
  getBiomeOrFallback,
  isFastTravelHub,
  type BiomeId,
  type CityDistrictId,
} from '@shared/worldMapData';
import {
  KHMER_WORLD_LIST,
  type KhmerWorldId,
} from '@shared/khmerWorlds';
import {
  travelManager,
  type TravelRequestPayload,
} from '../game/systems/TravelAndPylons';
import { Bus, Compass, Lock, MapPin, ShieldAlert, Sparkles, Zap } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface WorldMapModalProps {
  open: boolean;
  player: PlayerState;
  inActiveBossFight: boolean;
  onClose: () => void;
  onUnlockBiomePylon: (biomeId: BiomeId) => void;
  onTravel: (req: TravelRequestPayload, busFareCoins: number) => void;
  onAttuneBiome: (biomeId: BiomeId) => void;
}

type SelectedNode =
  | { kind: 'district'; id: CityDistrictId }
  | { kind: 'biome'; id: BiomeId };

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  open,
  player,
  inActiveBossFight,
  onClose,
  onUnlockBiomePylon,
  onTravel,
  onAttuneBiome,
}) => {
  const [selected, setSelected] = useState<SelectedNode>({
    kind: 'district',
    id: 'downtown_plaza',
  });

  const discovered = new Set(player.discoveredBiomes ?? ['emerald_rice_valley']);
  const unlockedPylons = new Set(player.unlockedPylons ?? ['emerald_rice_valley']);
  const returnPortal = travelManager.getReturnPortal();
  const activeBiomeObj = getBiomeOrFallback(player.activeBiome);

  const selectedDistrict =
    selected.kind === 'district'
      ? CITY_DISTRICTS.find((d) => d.id === selected.id) ?? CITY_DISTRICTS[0]
      : null;
  const selectedBiome =
    selected.kind === 'biome' ? WORLD_BIOMES[selected.id] ?? WORLD_BIOMES.emerald_rice_valley : null;

  const isBiomeUnlocked = selectedBiome ? discovered.has(selectedBiome.id) && unlockedPylons.has(selectedBiome.id) : false;

  const doWarp = (req: TravelRequestPayload, fare = 0) => {
    if (inActiveBossFight) return;
    onClose();
    onTravel(req, fare);
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🗺️ ភូមិខ្ញុំ · Fullscreen Khmer World Map & Angkor Pylons"
      subtitle={`City Districts: 6/6 Unlocked · Wild Biomes Discovered: ${discovered.size}/${WORLD_BIOME_LIST.length} · Preah Khan: ${activeBiomeObj.preahKhanElement}`}
      maxWidthClass="w-[min(97vw,960px)]"
    >
      <div className="space-y-3 text-xs max-h-[76dvh] overflow-y-auto pr-1">
        {/* Boss-Fight Fast-Travel Lock Notice */}
        {inActiveBossFight && (
          <div className="p-2.5 rounded-xl bg-rose-100 border-2 border-rose-600 text-rose-950 font-display font-bold flex items-center gap-2 text-xs">
            <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
            Fast-Travel, Biome Pylons &amp; Magic Mirror are disabled during an active Boss Fight! Defeat the boss or exit via the Dungeon Portal.
          </div>
        )}

        {/* Quick Travel Bar: Magic Mirror -> Farm/Home + Return Portal + Legend */}
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-900/25">
          <button
            type="button"
            disabled={inActiveBossFight}
            onClick={() =>
              doWarp({
                method: 'mirror',
                destinationLabel: 'Personal Farm & Stilt Home',
                targetZone: 'farm',
              })
            }
            className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white border border-amber-950 font-display font-bold text-xs flex items-center gap-1.5 shadow disabled:opacity-45"
          >
            <Sparkles className="w-3.5 h-3.5" /> Magic Mirror → Farm/Home
          </button>

          {returnPortal && (
            <button
              type="button"
              disabled={inActiveBossFight}
              onClick={() => {
                travelManager.setReturnPortal(null);
                doWarp({
                  method: 'return_portal',
                  destinationLabel: 'Linked Boss Arena',
                  targetZone: 'dungeon',
                  bossId: returnPortal.bossId,
                  difficulty: returnPortal.difficulty,
                });
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-display font-bold text-xs flex items-center gap-1.5 shadow animate-pulse disabled:opacity-45"
            >
              <Zap className="w-3.5 h-3.5" /> Return Portal → Boss Arena
            </button>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2 text-[10px] font-bold text-amber-950">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200 border border-amber-700/40">
              🏛️ 6 City Districts (Free Warp)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 border border-sky-700/40 text-sky-950">
              💎 7 Wild Biomes (Angkor Pylons)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-200">
              🌫️ Fog-of-War
            </span>
          </div>
        </div>

        {/* Update 3.6 — Hub-Only Fast Travel (4 Hubs) + Deep-Exploration Maps (Explore on Foot!) */}
        <div className="p-2.5 rounded-2xl bg-amber-50/95 border-2 border-amber-900/35 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-display font-bold text-xs text-amber-950">
              🗺️ Village Hubs (Fast Travel) &amp; Deep-Exploration Wilds (Explore on Foot via Gateways!)
            </div>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
              4 Fast-Travel Hubs · {VILLAGE_MAP_LIST.length - 3} Walk-In Adventure Zones
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {VILLAGE_MAP_LIST.map((m) => {
              const isHere =
                player.zone === 'overworld' && (player.currentMapId ?? 'central_plaza') === m.id;
              const canFastTravel = isFastTravelHub(m.id);
              const expPct = player.mapExplorationPct?.[m.id] ?? 0;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={inActiveBossFight || !canFastTravel}
                  onClick={() => {
                    if (!canFastTravel) return;
                    doWarp({
                      method: 'pylon',
                      destinationLabel: `${m.name} (${m.khmerName})`,
                      targetZone: 'overworld',
                      mapId: m.id,
                      spawnX: m.defaultSpawnX,
                      spawnY: m.defaultSpawnY,
                    });
                  }}
                  title={
                    canFastTravel
                      ? `Fast Travel Hub: Instant warp to ${m.name}`
                      : `Explore on Foot: Walk or ride through physical map portals to reach ${m.name}!`
                  }
                  className={`p-2 rounded-xl border-2 text-left transition ${
                    isHere
                      ? 'bg-amber-800 text-amber-50 border-amber-950 shadow'
                      : canFastTravel
                        ? 'bg-white hover:bg-amber-100 text-amber-950 border-amber-700/50 cursor-pointer'
                        : 'bg-slate-100/90 text-slate-700 border-slate-300 cursor-not-allowed opacity-90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm">{m.icon}</span>
                    {isHere ? (
                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-yellow-300 text-amber-950">
                        HERE
                      </span>
                    ) : canFastTravel ? (
                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                        ⚡ HUB WARP
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-slate-700 text-amber-200">
                        🚶 Explore on Foot
                      </span>
                    )}
                  </div>
                  <div className="font-display font-bold text-[11px] truncate mt-0.5">{m.name}</div>
                  <div className={`text-[9px] truncate ${isHere ? 'text-amber-200' : canFastTravel ? 'text-amber-800' : 'text-slate-500'}`}>
                    {m.khmerName}
                  </div>
                  {!canFastTravel && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-300 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, expPct)}%` }} />
                      </div>
                      <span className="text-[8px] font-mono font-bold text-slate-600">{expPct}%</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Connected Khmer Cultural World Regions Bar (Walkable via Gates, Railways & Piers!) */}
        <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-50 via-emerald-50/70 to-sky-50 border-2 border-amber-900/35 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-display font-bold text-xs text-amber-950">
              🧭 Explorable Khmer Cultural Worlds (Connected by Fence Gates, Angkor Archways, Bamboo Railways &amp; Piers)
            </div>
            <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-700/30">
              6 Interconnected Regions
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {KHMER_WORLD_LIST.map((w) => {
              const isCurrent =
                (player.zone === 'overworld' && w.id === 'phum_chaktomuk') ||
                (player.zone === 'khmer_world' && player.currentWorldId === w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  disabled={inActiveBossFight}
                  onClick={() =>
                    doWarp({
                      method: 'pylon',
                      destinationLabel: `${w.name} (${w.khmerName})`,
                      targetZone: w.id === 'phum_chaktomuk' ? 'overworld' : 'khmer_world',
                      worldId: w.id as KhmerWorldId,
                      biomeId: w.biomeAttunement,
                    })
                  }
                  className={`p-2 rounded-xl border-2 text-left transition flex items-start gap-2 disabled:opacity-45 cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-800 text-amber-50 border-amber-400 shadow'
                      : 'bg-white/90 hover:bg-amber-100/90 text-amber-950 border-amber-900/30'
                  }`}
                >
                  <span className="text-lg leading-none shrink-0 mt-0.5">{w.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-[11px] flex items-center justify-between gap-1">
                      <span className="truncate">{w.name}</span>
                      {isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 shrink-0">
                          HERE
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] font-bold truncate ${
                        isCurrent ? 'text-amber-200' : 'text-amber-800'
                      }`}
                    >
                      {w.khmerName}
                    </div>
                    <div
                      className={`text-[9px] truncate ${
                        isCurrent ? 'text-emerald-100' : 'text-amber-900/80'
                      }`}
                    >
                      {w.culturalReference}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-[10px] text-amber-900 font-semibold">
            Walk-Through Routes: <strong>Phum Chaktomuk</strong> ↔ West Fence (<strong>Srok Battambang</strong>) ↔ North Bamboo Railway (<strong>Phnom Kulen</strong>) ↔ East Archway (<strong>Nokor Angkor Thom</strong>) ↔ South Archway (<strong>Phum Chaktomuk</strong>) ↔ South Pier (<strong>Tonlé Sap Kampong Phluk</strong>) ↔ Harbor Ferry (<strong>Chhner Kampot</strong>).
          </div>
        </div>

        {/* Fullscreen Stylized Khmer World Map Canvas + Side Inspector */}
        <div className="grid lg:grid-cols-[1.55fr_1fr] gap-3">
          <div className="relative h-[340px] sm:h-[400px] rounded-2xl border-2 border-amber-900/70 overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 shadow-inner">
            {/* Stylized Mekong River & Central City Sanctuary Ring */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              {/* Mekong River ribbon */}
              <path
                d="M 8 88 Q 28 70, 38 58 T 56 32 T 72 4"
                fill="none"
                stroke="#0284c7"
                strokeOpacity="0.28"
                strokeWidth="4.5"
              />
              {/* Central Phum City Sanctuary Circle */}
              <ellipse
                cx="47"
                cy="49"
                rx="20"
                ry="22"
                fill="#f59e0b"
                fillOpacity="0.09"
                stroke="#facc15"
                strokeOpacity="0.45"
                strokeWidth="0.6"
                strokeDasharray="2 1.5"
              />
              {/* Pylon Leylines connecting City Shrine to all 7 Wild Biomes */}
              {WORLD_BIOME_LIST.map((node) => {
                const unlocked = unlockedPylons.has(node.id);
                return (
                  <line
                    key={node.id}
                    x1={52}
                    y1={62}
                    x2={node.mapX}
                    y2={node.mapY}
                    stroke={unlocked ? '#facc15' : '#475569'}
                    strokeOpacity={unlocked ? 0.72 : 0.45}
                    strokeWidth={unlocked ? '0.75' : '0.45'}
                    strokeDasharray={unlocked ? 'none' : '2 2'}
                  />
                );
              })}
            </svg>

            {/* 6 City District Nodes (Unlocked at Start — Golden Pins) */}
            {CITY_DISTRICTS.map((dist) => {
              const isSel = selected.kind === 'district' && selected.id === dist.id;
              return (
                <button
                  key={dist.id}
                  type="button"
                  onClick={() => setSelected({ kind: 'district', id: dist.id })}
                  style={{ left: `${dist.mapX}%`, top: `${dist.mapY}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-xl border-2 transition flex items-center gap-1 shadow-lg cursor-pointer ${
                    isSel
                      ? 'scale-110 z-30 bg-yellow-200 border-amber-950 text-amber-950 ring-2 ring-yellow-400'
                      : 'z-20 bg-amber-100/95 border-amber-800 text-amber-950 hover:scale-105'
                  }`}
                >
                  <span className="text-xs">{dist.icon}</span>
                  <span className="font-display font-bold text-[9px] whitespace-nowrap">
                    {dist.name}
                  </span>
                </button>
              );
            })}

            {/* 7 Wild Biome Nodes (Fog-of-War shading when unvisited!) */}
            {WORLD_BIOME_LIST.map((node) => {
              const disc = discovered.has(node.id);
              const isSel = selected.kind === 'biome' && selected.id === node.id;
              return (
                <React.Fragment key={node.id}>
                  {/* Moody Fog-of-War cloud over unvisited Wild Biomes */}
                  {!disc && (
                    <div
                      style={{ left: `${node.mapX}%`, top: `${node.mapY}%` }}
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-24 h-16 rounded-full bg-slate-950/75 blur-md z-10"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setSelected({ kind: 'biome', id: node.id })}
                    style={{ left: `${node.mapX}%`, top: `${node.mapY}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-xl border-2 transition flex items-center gap-1 shadow-lg cursor-pointer ${
                      isSel
                        ? 'scale-110 z-30 bg-sky-100 border-yellow-400 text-slate-950 ring-2 ring-amber-400'
                        : disc
                        ? 'z-20 bg-slate-900/90 border-emerald-400/80 text-amber-50 hover:scale-105'
                        : 'z-20 bg-slate-950/90 border-slate-600/80 text-slate-400 hover:border-amber-400'
                    }`}
                  >
                    <span className="text-xs">{disc ? node.icon : '🌫️'}</span>
                    <span className="font-display font-bold text-[9px] whitespace-nowrap">
                      {disc ? node.name : `${node.name.split(' ')[0]} (Fog)`}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}

            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-slate-950/85 text-[10px] font-bold text-amber-200 border border-amber-500/40 z-30">
              Click any City District or Angkor Biome Pylon to teleport with a golden flash!
            </div>
          </div>

          {/* Node Inspector & Instant Warp Panel */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-900/35 flex flex-col justify-between gap-3">
            {selectedDistrict ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display font-bold text-base text-amber-950 flex items-center gap-1.5">
                        <span>{selectedDistrict.icon}</span>
                        <span>{selectedDistrict.name}</span>
                      </div>
                      <div className="text-[11px] font-bold text-amber-800">
                        {selectedDistrict.khmerName}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-700 text-white font-bold text-[10px] shrink-0">
                      City District
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-950/90 leading-snug">
                    {selectedDistrict.description}
                  </p>
                  <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-900/20 text-[10px] font-semibold text-amber-950">
                    Unlocked from the start — teleport instantly via Golden Pylon Flash or ride the Green Village Bus!
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-900/20">
                  <button
                    type="button"
                    disabled={inActiveBossFight}
                    onClick={() =>
                      doWarp({
                        method: 'pylon',
                        destinationLabel: selectedDistrict.name,
                        targetZone: selectedDistrict.targetZone,
                        mapId: selectedDistrict.mapId,
                        spawnX: selectedDistrict.spawnX,
                        spawnY: selectedDistrict.spawnY,
                      })
                    }
                    className="py-2.5 px-2.5 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white border-2 border-amber-950 font-display font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-45"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Golden Warp
                  </button>
                  <button
                    type="button"
                    disabled={inActiveBossFight}
                    onClick={() =>
                      doWarp({
                        method: 'bus',
                        destinationLabel: selectedDistrict.name,
                        targetZone: selectedDistrict.targetZone,
                        mapId: selectedDistrict.mapId,
                        spawnX: selectedDistrict.spawnX,
                        spawnY: selectedDistrict.spawnY,
                      })
                    }
                    className="py-2.5 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border-2 border-emerald-950 font-display font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-45"
                  >
                    <Bus className="w-3.5 h-3.5" /> Green Bus
                  </button>
                </div>
              </>
            ) : selectedBiome ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display font-bold text-base text-amber-950 flex items-center gap-1.5">
                        <span>{isBiomeUnlocked ? selectedBiome.icon : '🌫️'}</span>
                        <span>{selectedBiome.name}</span>
                      </div>
                      <div className="text-[11px] font-bold text-amber-800">
                        {selectedBiome.khmerName}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-amber-300 font-bold text-[10px] shrink-0">
                      Act {selectedBiome.act} Wild
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-950/90 leading-snug">
                    {selectedBiome.description}
                  </p>

                  <div className="p-2.5 rounded-xl bg-white/85 border border-amber-900/20 space-y-1 text-[10px]">
                    <div className="font-display font-bold text-amber-950 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-sky-700" />
                      Preah Khan Biome Attunement
                    </div>
                    <div className="text-emerald-900 font-bold">
                      {selectedBiome.preahKhanElement} (+
                      {Math.round(selectedBiome.preahKhanBonusDmgPct * 100)}% Blade Bonus)
                    </div>
                    {isBiomeUnlocked && (
                      <button
                        type="button"
                        onClick={() => onAttuneBiome(selectedBiome.id)}
                        className="mt-1 px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 border border-amber-900/40 font-display font-bold text-[10px] text-amber-950"
                      >
                        {player.activeBiome === selectedBiome.id
                          ? '✓ Attuned'
                          : `Attune to ${selectedBiome.preahKhanElement}`}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-amber-900/20">
                  {!isBiomeUnlocked ? (
                    <button
                      type="button"
                      disabled={player.currencies.coins < selectedBiome.unlockCostCoins}
                      onClick={() => onUnlockBiomePylon(selectedBiome.id)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white border-2 border-amber-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-45"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Reveal Fog &amp; Unlock {selectedBiome.pylonName} (
                      {selectedBiome.unlockCostCoins.toLocaleString()}c)
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={inActiveBossFight}
                        onClick={() => {
                          onAttuneBiome(selectedBiome.id);
                          doWarp({
                            method: 'pylon',
                            destinationLabel: selectedBiome.name,
                            targetZone: 'dungeon',
                            biomeId: selectedBiome.id,
                            bossId: selectedBiome.bossId,
                          });
                        }}
                        className="py-2.5 px-2 rounded-xl bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white border-2 border-amber-950 font-display font-bold text-[11px] flex items-center justify-center gap-1 disabled:opacity-45"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Pylon Warp
                      </button>
                      <button
                        type="button"
                        disabled={inActiveBossFight}
                        onClick={() => {
                          onAttuneBiome(selectedBiome.id);
                          doWarp(
                            {
                              method: 'bus',
                              destinationLabel: selectedBiome.name,
                              targetZone: 'dungeon',
                              biomeId: selectedBiome.id,
                              bossId: selectedBiome.bossId,
                            },
                            selectedBiome.busFareCoins
                          );
                        }}
                        className="py-2.5 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border-2 border-emerald-950 font-display font-bold text-[11px] flex items-center justify-center gap-1 disabled:opacity-45"
                      >
                        <Bus className="w-3.5 h-3.5" /> Bus ({selectedBiome.busFareCoins}c)
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </NativeDialog>
  );
};
