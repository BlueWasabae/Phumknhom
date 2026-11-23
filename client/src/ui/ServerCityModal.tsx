import React from 'react';
import { CITY_SERVERS, type CityServerId } from '@shared/worldMapData';
import { CheckCircle2, Globe2, Signal } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface ServerCityModalProps {
  open: boolean;
  currentCity: CityServerId;
  currentAreaId: string;
  online: boolean;
  playerCount: number;
  onClose: () => void;
  onSelectCity: (city: CityServerId, areaId?: string) => void;
}

export const ServerCityModal: React.FC<ServerCityModalProps> = ({
  open,
  currentCity,
  currentAreaId,
  online,
  playerCount,
  onClose,
  onSelectCity,
}) => {
  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🌏 Cambodian Server Cities · AREA 0–2"
      subtitle="Switch between Phnom Penh, Siem Reap, Kampot & Battambang anytime — your Cloud Save travels with you!"
      maxWidthClass="w-[min(95vw,600px)]"
    >
      <div className="space-y-2.5 text-xs max-h-[68dvh] overflow-y-auto pr-1">
        {CITY_SERVERS.map((city) => {
          const active = city.id === currentCity;
          return (
            <div
              key={city.id}
              className={`w-full text-left p-3.5 rounded-2xl border-2 transition space-y-2.5 ${
                active
                  ? 'bg-amber-100 border-amber-900 ring-2 ring-amber-400 shadow'
                  : 'bg-amber-50/90 border-amber-900/30 hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 shrink-0" style={{ color: city.accentColor }} />
                    <span className="font-display font-bold text-sm text-amber-950">
                      {city.name} · {city.khmerName}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[9px] font-bold">
                      {city.regionCode}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-amber-900">{city.tagline}</div>
                  <div className="text-[10px] text-emerald-900 font-bold">{city.perk}</div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono font-bold text-[10px]">
                    <Signal className="w-3 h-3" /> {city.basePingMs}ms
                  </span>
                  {active && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-700 text-white font-display font-bold text-[10px]">
                      <CheckCircle2 className="w-3 h-3" /> {online ? `${playerCount} online` : 'Active'}
                    </span>
                  )}
                </div>
              </div>

              {/* AREA 0 - AREA 2 Channel Selector per City */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-amber-900/15">
                <span className="text-[10px] font-bold uppercase text-amber-900 mr-1">Join Channel:</span>
                {city.areas.map((areaId) => {
                  const isCurrentHere = active && currentAreaId === areaId;
                  return (
                    <button
                      key={areaId}
                      type="button"
                      onClick={() => {
                        onSelectCity(city.id, areaId);
                        onClose();
                      }}
                      className={`px-2.5 py-1 rounded-lg font-display font-bold text-[11px] border transition ${
                        isCurrentHere
                          ? 'bg-emerald-700 text-white border-emerald-950'
                          : 'bg-white hover:bg-amber-200 text-amber-950 border-amber-900/35'
                      }`}
                    >
                      {areaId}
                      {isCurrentHere ? ' ✓' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </NativeDialog>
  );
};
